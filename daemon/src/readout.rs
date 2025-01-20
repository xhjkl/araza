//! Accept a new fiat bank statement and maybe update the offers affected
//!
use crate::schema::OfferId;

#[allow(unused)]
struct BankStatementRecord {
    date: String,
    description: String,
    amount: f64,
    account: String,
    transaction_id: String,
}

/// `# Date,Description,Amount,Account,Transaction ID`
fn parse_csv(body: &str) -> Vec<BankStatementRecord> {
    fn parse_line(body: &str) -> Option<BankStatementRecord> {
        // Skip the commentary:
        let body = body.split('#').next().unwrap_or(body);
        // Split the line into cells:
        let parts = body.split(',').map(|s| s.trim()).collect::<Vec<&str>>();
        if parts.len() != 5 {
            return None;
        }
        Some(BankStatementRecord {
            date: parts[0].to_string(),
            description: parts[1].to_string(),
            amount: parts[2].parse().unwrap(),
            account: parts[3].to_string(),
            transaction_id: parts[4].to_string(),
        })
    }

    let mut records = vec![];
    for line in body.lines() {
        let Some(record) = parse_line(line) else {
            continue;
        };
        records.push(record);
    }
    records
}

/// Take in a CSV file, scan it for c2c transfers, and, if there are any that have something to do with our offers,
/// update the offers accordingly.
pub async fn handle_readout(
    pool: &sqlx::PgPool,
    body: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    struct Match {
        match_id: OfferId,
        onramp_bank_account: String,
        offramp_bank_account: String,
    }

    let records = parse_csv(body);
    // please resolve the match involving both of these bank accounts:
    for record in records {
        let relevant_deals = sqlx::query_as!(
            Match,
            r#"
            SELECT
                match.id as match_id,
                bid.bank_account as onramp_bank_account,
                ask.bank_account as offramp_bank_account
            FROM
                match
            JOIN
                offer bid ON match.onramp_offer_id = bid.id
            JOIN
                offer ask ON match.offramp_offer_id = ask.id
            WHERE
                bid.bank_account = $1 OR ask.bank_account = $1
                AND
                bid.bank_account = $2 OR ask.bank_account = $2
            "#,
            record.account,
            record.account,
        )
        .fetch_all(pool)
        .await?;
        for deal in relevant_deals {
            if deal.onramp_bank_account == record.account
                && record.description.ends_with(&deal.offramp_bank_account)
            {
                let id: i64 = deal.match_id.into();
                sqlx::query!(
                    r#"
                    UPDATE match SET buyer_sent_fiat = TRUE WHERE id = $1
                    "#,
                    id,
                )
                .execute(pool)
                .await?;
            }
            if deal.offramp_bank_account == record.account
                && record.description.ends_with(&deal.onramp_bank_account)
            {
                let id: i64 = deal.match_id.into();
                sqlx::query!(
                    r#"
                    UPDATE match SET seller_received_fiat = TRUE WHERE id = $1
                    "#,
                    id,
                )
                .execute(pool)
                .await?;
            }
        }
    }
    Ok(())
}
