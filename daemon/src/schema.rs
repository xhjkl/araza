use ed25519_dalek::{Signature, Verifier, VerifyingKey};
use serde::{de::Deserializer, Deserialize};

/// A compactly represented large integer
#[derive(sqlx::Type, Debug, Clone, Copy, PartialEq, Eq)]
pub struct OfferId(u64);

#[derive(serde::Deserialize, serde::Serialize, Debug, Clone, PartialEq, Eq)]
pub struct Offer {
    pub id: OfferId,
    pub bank_account: String,
    pub public_key: String,
    #[serde(
        deserialize_with = "deserialize_bigdecimal",
        serialize_with = "serialize_bigdecimal"
    )]
    pub amount: bigdecimal::BigDecimal,
    pub direction: OfferDirection,
}

impl serde::Serialize for OfferId {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&bs58::encode(self.0.to_le_bytes()).into_string())
    }
}

impl<'de> serde::Deserialize<'de> for OfferId {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        let bytes = bs58::decode(&s)
            .into_vec()
            .map_err(serde::de::Error::custom)?;
        Ok(OfferId(u64::from_le_bytes(bytes.try_into().map_err(
            |_| serde::de::Error::custom("expected 8 bytes"),
        )?)))
    }
}

impl std::fmt::Display for OfferId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", bs58::encode(self.0.to_le_bytes()).into_string())
    }
}

impl From<OfferId> for i64 {
    fn from(offer_id: OfferId) -> Self {
        offer_id.0 as i64
    }
}

impl From<i64> for OfferId {
    fn from(value: i64) -> Self {
        OfferId(value as u64)
    }
}

fn deserialize_bigdecimal<'de, D>(d: D) -> Result<bigdecimal::BigDecimal, D::Error>
where
    D: Deserializer<'de>,
{
    use std::str::FromStr;
    let s = String::deserialize(d)?;
    bigdecimal::BigDecimal::from_str(&s).map_err(serde::de::Error::custom)
}

fn serialize_bigdecimal<S>(d: &bigdecimal::BigDecimal, s: S) -> Result<S::Ok, S::Error>
where
    S: serde::Serializer,
{
    s.serialize_str(&d.to_string())
}

/// Accept both quoted and bare numbers
fn quoted_or_bare_number<'de, D>(d: D) -> Result<u128, D::Error>
where
    D: Deserializer<'de>,
{
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum StringOrNumber {
        // Should be `u128`, but a bug in serde prevents this:
        // https://github.com/serde-rs/serde/issues/1717
        // It's still enough to cover all the balances in ranges of trillions
        // with six decimal places of precision.
        Number(u64),
        String(String),
    }

    match StringOrNumber::deserialize(d)? {
        StringOrNumber::Number(n) => Ok(n as u128),
        StringOrNumber::String(s) => s.parse::<u128>().map_err(serde::de::Error::custom),
    }
}

#[derive(sqlx::Type, serde::Deserialize, serde::Serialize, Debug, Clone, Copy, PartialEq, Eq)]
#[sqlx(type_name = "offer_direction", rename_all = "lowercase")]
pub enum OfferDirection {
    // Serde variant will be shown from the api,
    // and sqlx from the db console
    #[serde(rename = "offramp")]
    #[sqlx(rename = "dd_to_fiat")]
    DDToFiat,
    #[serde(rename = "onramp")]
    #[sqlx(rename = "fiat_to_dd")]
    FiatToDD,
}

#[derive(serde::Deserialize, serde::Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct OfferRequest {
    #[serde(deserialize_with = "quoted_or_bare_number")]
    pub amount: u128,
    pub bank_account: String,
    pub public_key: String,
    pub signature: String,
}

impl OfferRequest {
    pub fn ensure_authentic(&self) -> Result<(), String> {
        let cleartext = format!(
            "{}\n{}\n{}",
            self.amount, self.bank_account, self.public_key
        );
        let cleartext = cleartext.as_bytes();

        let signature = bs58::decode(&self.signature)
            .into_vec()
            .map_err(|e| format!("while decoding signature: {e}"))?;

        let pubkey = bs58::decode(&self.public_key)
            .into_vec()
            .map_err(|e| format!("while decoding public key: {e}"))?;

        let Ok(pubkey) = pubkey.try_into() else {
            return Err("expected public key to be 32 bytes".to_string());
        };

        let Ok(signature) = signature.try_into() else {
            return Err("expected signature to be 64 bytes".to_string());
        };

        let verifying_key = VerifyingKey::from_bytes(&pubkey).unwrap();
        let signature = Signature::from_bytes(&signature);

        verifying_key
            .verify(cleartext, &signature)
            .map_err(|e| e.to_string())
    }
}
