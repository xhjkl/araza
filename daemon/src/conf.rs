//! Constants associated to the deployment instance,
//! most likely to be set `in std::env::var`.

use std::str::FromStr;

use solana_sdk::{pubkey::Pubkey, signature::Keypair};

/// Configuration of the deployment instance
pub struct Conf {
    program_id: Option<Pubkey>,
    token_program: Option<Pubkey>,
    associated_token_program: Option<Pubkey>,
    dd_mint: Option<Pubkey>,
    treasurer_secret_key: Option<Keypair>,
}

impl Conf {
    pub fn from_env() -> Self {
        Self {
            program_id: std::env::var("PROGRAM_ID")
                .map(|key| Pubkey::from_str(&key).ok())
                .ok()
                .flatten(),
            token_program: std::env::var("TOKEN_PROGRAM")
                .map(|key| Pubkey::from_str(&key).ok())
                .ok()
                .flatten(),
            associated_token_program: std::env::var("ASSOCIATED_TOKEN_PROGRAM")
                .map(|key| Pubkey::from_str(&key).ok())
                .ok()
                .flatten(),
            dd_mint: std::env::var("DD_MINT")
                .map(|key| Pubkey::from_str(&key).ok())
                .ok()
                .flatten(),
            treasurer_secret_key: std::env::var("TREASURER_SECRET_KEY")
                .map(|key| {
                    serde_json::from_str::<Vec<u8>>(&key)
                        .ok()
                        .and_then(|bytes: Vec<u8>| Keypair::from_bytes(&bytes).ok())
                })
                .ok()
                .flatten(),
        }
    }

    pub fn missing_keys(&self) -> Vec<&str> {
        let mut missing = Vec::new();
        if self.program_id.is_none() {
            missing.push("PROGRAM_ID");
        }
        if self.token_program.is_none() {
            missing.push("TOKEN_PROGRAM");
        }
        if self.associated_token_program.is_none() {
            missing.push("ASSOCIATED_TOKEN_PROGRAM");
        }
        if self.dd_mint.is_none() {
            missing.push("DD_MINT");
        }
        if self.treasurer_secret_key.is_none() {
            missing.push("TREASURER_SECRET_KEY");
        }
        missing
    }

    pub fn program_id(&self) -> Option<&Pubkey> {
        self.program_id.as_ref()
    }
    pub fn token_program(&self) -> Option<&Pubkey> {
        self.token_program.as_ref()
    }
    pub fn associated_token_program(&self) -> Option<&Pubkey> {
        self.associated_token_program.as_ref()
    }
    pub fn dd_mint(&self) -> Option<&Pubkey> {
        self.dd_mint.as_ref()
    }
    pub fn treasurer_secret_key(&self) -> Option<&Keypair> {
        self.treasurer_secret_key.as_ref()
    }
}
