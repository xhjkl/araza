//! Scheduled periodic tasks
use std::str::FromStr;

use bigdecimal::BigDecimal;
use solana_client::nonblocking::rpc_client::RpcClient;
use solana_sdk::pubkey::Pubkey;
use sqlx::PgPool;
use tokio::process::Command;

use crate::conf::Conf;
use crate::schema::OfferId;

const SOLANA_RPC_URL: &str = "https://api.devnet.solana.com";

async fn promote_preoffer_if_ready(
    conf: &Conf,
    pool: &PgPool,
    client: &RpcClient,
    id: OfferId,
    amount: BigDecimal,
    bank_account: String,
    public_key: String,
) -> Result<(), Box<dyn std::error::Error>> {
    let author = Pubkey::from_str(&public_key)?;
    let Some(program_id) = conf.program_id() else {
        return Err("PROGRAM_ID is not set".into());
    };

    let (escrow_account, _) =
        Pubkey::find_program_address(&[b"escrow", author.as_ref()], program_id);
    // The string amount Solana gives us is a whole number of atoms
    let balance = client
        .get_token_account_balance(&escrow_account)
        .await
        .map(|x| u128::from_str(&x.amount).unwrap_or_default())
        .unwrap_or(0);
    let balance = BigDecimal::from(balance);
    if balance == BigDecimal::from(0) {
        // It's not time yet, wait for the next round
        return Ok(());
    }
    // So we decidedly do not handle decimals here; they are already premultiplied
    if balance != amount {
        return Err(format!("Stale preoffer #{id}; expected {amount}, got {balance}").into());
    }

    let mut transaction = pool.begin().await?;
    let id: i64 = id.into();
    sqlx::query!("DELETE FROM preoffer WHERE id = $1", id)
        .execute(&mut *transaction)
        .await?;
    sqlx::query!(
        "INSERT INTO offer (amount, bank_account, public_key, direction) VALUES ($1, $2, $3, 'dd_to_fiat')",
        amount,
        bank_account,
        public_key
    )
    .execute(&mut *transaction)
    .await?;
    transaction.commit().await?;

    Ok(())
}

/// Monitor the network to see if our clients have deposited the correct amount of DD
/// and if so, make their preoffers available for matching as offers
async fn promote_all_preoffers(
    conf: &Conf,
    pool: &PgPool,
    client: &RpcClient,
) -> Result<usize, Box<dyn std::error::Error>> {
    struct Preoffer {
        id: OfferId,
        amount: BigDecimal,
        bank_account: String,
        public_key: String,
    }

    let preoffers = sqlx::query_as!(
        Preoffer,
        "SELECT id, amount, bank_account, public_key FROM preoffer"
    )
    .fetch_all(pool)
    .await?;

    let mut promoted = 0;
    for preoffer in preoffers {
        let result = promote_preoffer_if_ready(
            conf,
            pool,
            client,
            preoffer.id,
            preoffer.amount,
            preoffer.bank_account,
            preoffer.public_key,
        )
        .await;
        if let Err(e) = result {
            let id = preoffer.id.to_string();
            tracing::error!("While promoting preoffer #{id}: {:?}", e);
            continue;
        }
        promoted += 1;
    }

    Ok(promoted)
}

/// Match any newly become available offers against each others
async fn make_matches(pool: &PgPool) -> Result<usize, Box<dyn std::error::Error>> {
    struct Offer {
        id: OfferId,
        amount: BigDecimal,
    }

    let mut transaction = pool.begin().await?;
    let onramp_offers = sqlx::query_as!(
        Offer,
        "SELECT id, amount FROM offer WHERE direction = 'fiat_to_dd' AND id NOT IN (SELECT onramp_offer_id FROM match)"
    )
    .fetch_all(&mut *transaction)
    .await?;

    let offramp_offers = sqlx::query_as!(
        Offer,
        "SELECT id, amount FROM offer WHERE direction = 'dd_to_fiat' AND id NOT IN (SELECT offramp_offer_id FROM match)"
    )
    .fetch_all(&mut *transaction)
    .await?;

    let mut count = 0;
    for offramp_offer in &offramp_offers {
        for onramp_offer in &onramp_offers {
            if offramp_offer.amount == onramp_offer.amount {
                let onramp_id: i64 = onramp_offer.id.into();
                let offramp_id: i64 = offramp_offer.id.into();
                sqlx::query!(
                    "INSERT INTO match (onramp_offer_id, offramp_offer_id) VALUES ($1, $2)",
                    onramp_id,
                    offramp_id
                )
                .execute(&mut *transaction)
                .await?;
                count += 1;
            }
        }
    }

    transaction.commit().await?;

    Ok(count)
}

/// Give the buyers their DD if the match is complete
async fn release_funds_if_done(
    conf: &Conf,
    pool: &PgPool,
) -> Result<usize, Box<dyn std::error::Error>> {
    struct Match {
        match_id: OfferId,
        onramp_offer_id: OfferId,
        offramp_offer_id: OfferId,
        onramp_public_key: String,
        offramp_public_key: String,
    }

    let (Some(token_program), Some(associated_token_program), Some(dd_mint)) = (
        conf.token_program(),
        conf.associated_token_program(),
        conf.dd_mint(),
    ) else {
        return Err("envs are missing".into());
    };

    let mut transaction = pool.begin().await?;
    let all_done = sqlx::query_as!(
        Match,
        r#"
        SELECT
            match.id as match_id,
            match.onramp_offer_id,
            match.offramp_offer_id,
            bid.public_key as onramp_public_key,
            ask.public_key as offramp_public_key
        FROM
            match
        JOIN
            offer bid ON match.onramp_offer_id = bid.id
        JOIN
            offer ask ON match.offramp_offer_id = ask.id
        WHERE
            match.buyer_sent_fiat = TRUE AND match.seller_received_fiat = TRUE
        "#
    )
    .fetch_all(&mut *transaction)
    .await?;

    let mut count = 0;
    for deal in all_done {
        let author = Pubkey::from_str(&deal.offramp_public_key)?;
        let (target_account, _) = Pubkey::find_program_address(
            &[
                Pubkey::from_str(&deal.onramp_public_key)?.as_ref(),
                token_program.as_ref(),
                dd_mint.as_ref(),
            ],
            associated_token_program,
        );
        release_funds(conf, author, target_account).await?;

        let id: i64 = deal.match_id.into();
        sqlx::query!("DELETE FROM match WHERE id = $1", id)
            .execute(&mut *transaction)
            .await?;
        let id: i64 = deal.onramp_offer_id.into();
        sqlx::query!("DELETE FROM offer WHERE id = $1", id)
            .execute(&mut *transaction)
            .await?;
        let id: i64 = deal.offramp_offer_id.into();
        sqlx::query!("DELETE FROM offer WHERE id = $1", id)
            .execute(&mut *transaction)
            .await?;

        count += 1;
    }

    transaction.commit().await?;

    Ok(count)
}

/// Do all the work behind the scenes
pub async fn run(conf: Conf, pool: PgPool) {
    let client = solana_client::nonblocking::rpc_client::RpcClient::new(SOLANA_RPC_URL.to_string());

    loop {
        let result = promote_all_preoffers(&conf, &pool, &client).await;
        match result {
            Err(e) => {
                tracing::error!("While promoting preoffers: {:?}", e);
                continue;
            }
            Ok(n) if n > 0 => {
                tracing::info!("Promoted {n} preoffers");
            }
            Ok(_) => {}
        }

        let result = make_matches(&pool).await;
        match result {
            Err(e) => tracing::error!("While making matches: {:?}", e),
            Ok(n) if n > 0 => tracing::info!("Paired up {n} offers"),
            _ => {}
        }

        let result = release_funds_if_done(&conf, &pool).await;
        match result {
            Err(e) => tracing::error!("While releasing funds: {:?}", e),
            Ok(n) if n > 0 => tracing::info!("Finalized {n} deals"),
            _ => {}
        }

        tokio::time::sleep(tokio::time::Duration::from_secs(4)).await;
    }
}

/// Release funds held under deal initiated by `author` to the `target_account`
async fn release_funds(
    conf: &Conf,
    author: Pubkey,
    target_account: Pubkey,
) -> Result<(), Box<dyn std::error::Error>> {
    let (Some(token_program), Some(dd_mint), Some(treasurer_secret_key)) = (
        conf.token_program(),
        conf.dd_mint(),
        conf.treasurer_secret_key(),
    ) else {
        return Err("envs are missing".into());
    };

    let result = Command::new("control")
        .env("USER", author.to_string())
        .env("BENEFICIARY", target_account.to_string())
        .env("TOKEN_PROGRAM", token_program.to_string())
        .env("DD_MINT", dd_mint.to_string())
        .env(
            "TREASURER_SECRET_KEY",
            serde_json::to_string(&treasurer_secret_key.to_bytes().to_vec())?,
        )
        .output()
        .await?;
    tracing::info!("control returned: {:?}", result);
    if !result.status.success() {
        return Err(format!(
            "control failed: {}",
            String::from_utf8_lossy(&result.stderr)
        )
        .into());
    }
    Ok(())
}
