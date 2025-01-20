CREATE EXTENSION pgcrypto;

CREATE TYPE offer_direction AS ENUM ('dd_to_fiat', 'fiat_to_dd');

CREATE OR REPLACE FUNCTION gen_random_bigint() RETURNS BIGINT AS $$
BEGIN
    RETURN abs(('x' || lpad(encode(gen_random_bytes(8), 'hex'), 16, '0'))::bit(64)::bigint);
END;
$$ LANGUAGE plpgsql;

CREATE TABLE preoffer (
    id BIGINT PRIMARY KEY DEFAULT gen_random_bigint(),
    amount NUMERIC NOT NULL,
    bank_account TEXT NOT NULL,
    public_key TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE offer (
    id BIGINT PRIMARY KEY DEFAULT gen_random_bigint(),
    amount NUMERIC NOT NULL,
    bank_account TEXT NOT NULL,
    public_key TEXT NOT NULL,
    direction offer_direction NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE match (
    id BIGINT PRIMARY KEY DEFAULT gen_random_bigint(),
    onramp_offer_id BIGINT NOT NULL REFERENCES offer(id),
    offramp_offer_id BIGINT NOT NULL REFERENCES offer(id),

    buyer_sent_fiat BOOLEAN NOT NULL DEFAULT FALSE,
    seller_received_fiat BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT unique_onramp_offer UNIQUE (onramp_offer_id),
    CONSTRAINT unique_offramp_offer UNIQUE (offramp_offer_id)    
);
