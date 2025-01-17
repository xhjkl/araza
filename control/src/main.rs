use std::str::FromStr;
use std::sync::Arc;

use anchor_client::solana_sdk::commitment_config::CommitmentConfig;
use anchor_client::solana_sdk::pubkey::Pubkey;
use anchor_client::solana_sdk::signature::Keypair;
use anchor_client::{Client, Cluster, Program};

use araza::accounts;
use araza::instruction;

/// A tuple of the client, program, and treasurer keypair,
/// which may move the funds from any escrow account
type TreasuryControl = (Client<Arc<Keypair>>, Program<Arc<Keypair>>, Arc<Keypair>);

/// Read the envs and return an initialized Anchor client
fn make_client() -> Result<TreasuryControl, String> {
    let treasurer_secret_key = std::env::var("TREASURER_SECRET_KEY")
        .map_err(|_| "Missing env `TREASURER_SECRET_KEY`".to_string())
        .and_then(|key| {
            serde_json::from_str(&key).map_err(|_| "Bad `TREASURER_SECRET_KEY`".to_string())
        })
        .and_then(|key: Vec<u8>| {
            Keypair::from_bytes(&key).map_err(|_| "Bad `TREASURER_SECRET_KEY`".to_string())
        })?;
    let treasurer_secret_key = Arc::new(treasurer_secret_key);

    let client = Client::new_with_options(
        Cluster::Devnet,
        Clone::clone(&treasurer_secret_key),
        CommitmentConfig::confirmed(),
    );

    let Ok(program) = client.program(araza::ID_CONST) else {
        return Err("Regenerate interfaces and try again".to_string());
    };

    Ok((client, program, treasurer_secret_key))
}

/// Read the envs and make out what we've been passed
fn parse_args() -> Result<(Pubkey, Pubkey, Pubkey), String> {
    let token_program = std::env::var("TOKEN_PROGRAM")
        .map_err(|_| "Missing env `TOKEN_PROGRAM`".to_string())
        .and_then(|key| Pubkey::from_str(&key).map_err(|_| "Bad `TOKEN_PROGRAM`".to_string()))?;
    let user = std::env::var("USER")
        .map_err(|_| "Missing env `USER`".to_string())
        .and_then(|key| Pubkey::from_str(&key).map_err(|_| "Bad `USER`".to_string()))?;
    let beneficiary = std::env::var("BENEFICIARY")
        .map_err(|_| "Missing env `BENEFICIARY`".to_string())
        .and_then(|key| Pubkey::from_str(&key).map_err(|_| "Bad `BENEFICIARY`".to_string()))?;

    Ok((user, beneficiary, token_program))
}

/// Release funds by invoking the `release_funds` method on a specified Solana program
async fn release_funds() -> Result<String, String> {
    use anchor_client::solana_sdk::signature::Signer;

    let (_client, program, treasurer) = make_client()?;

    let (user, beneficiary, token_program) = parse_args()?;

    Ok(program
        .request()
        .accounts(accounts::ReleaseFunds {
            state: Pubkey::find_program_address(&[b""], &araza::ID_CONST).0,
            treasurer: treasurer.pubkey(),
            dd_mint: Pubkey::find_program_address(&[b"mint/dd"], &araza::ID_CONST).0,
            escrow: Pubkey::find_program_address(&[b"escrow", user.as_ref()], &araza::ID_CONST).0,
            beneficiary,
            user,
            token_program,
        })
        .args(instruction::ReleaseFunds {})
        .signer(&treasurer)
        .send()
        .await
        .map_err(|err| format!("While sending a transaction to release funds: {err:#?}"))?
        .to_string())
}

#[tokio::main(flavor = "current_thread")]
async fn main() {
    let signature = release_funds().await.unwrap();
    println!("Signature: {}", signature);
}
