use actix_web::{middleware, web, App, HttpResponse, HttpServer, Responder};
use bigdecimal::BigDecimal;
use dotenvy::dotenv;
use sqlx::postgres::PgPoolOptions;
use std::env;

mod conf;

mod cron;

mod schema;
use schema::{Offer, OfferDirection, OfferId, OfferRequest};

mod readout;
use readout::handle_readout;

/// List all the active on/off-ramps
async fn get_all_offers(pool: web::Data<sqlx::PgPool>) -> impl Responder {
    let result = sqlx::query_as!(
        Offer,
        "SELECT id, bank_account, public_key, amount, direction as \"direction: OfferDirection\" FROM offer"
    )
    .fetch_all(pool.get_ref())
    .await;

    match result {
        Ok(offers) => HttpResponse::Ok().json(offers),
        Err(e) => {
            eprintln!("error getting all offers: {:?}", e);
            HttpResponse::InternalServerError().body("Failed to get all offers")
        }
    }
}

/// Get the status of an offer
async fn get_offer(pool: web::Data<sqlx::PgPool>, offer_id: web::Path<OfferId>) -> impl Responder {
    let offer_id: i64 = offer_id.into_inner().into();
    let result = sqlx::query_as!(
        Offer,
        "SELECT id, bank_account, public_key, amount, direction as \"direction: OfferDirection\" FROM offer WHERE id = $1",
        offer_id
    )
    .fetch_one(pool.get_ref())
    .await;

    match result {
        Ok(offer) => HttpResponse::Ok().json(offer),
        Err(e) => {
            eprintln!("error getting offer: {:?}", e);
            HttpResponse::NotFound().body("Offer not found")
        }
    }
}

/// Create an offer to sell DD
async fn offer_dd(pool: web::Data<sqlx::PgPool>, req: web::Json<OfferRequest>) -> impl Responder {
    let amount = BigDecimal::from(req.amount);
    match req.ensure_authentic() {
        Ok(_) => (),
        Err(e) => return HttpResponse::BadRequest().body(e),
    }
    // At first we create a preoffer that will be converted to an offer
    // after we see the DD is deposited with the exact advertised amount,
    // and only that offer will become available for matching
    let result = sqlx::query!(
        "INSERT INTO preoffer (amount, bank_account, public_key) VALUES ($1, $2, $3) RETURNING id",
        amount,
        req.bank_account,
        req.public_key,
    )
    .fetch_one(pool.get_ref())
    .await;

    match result {
        Ok(record) => HttpResponse::Ok().json(serde_json::json!({"id": OfferId::from(record.id)})),
        Err(error) => {
            tracing::error!(?error);
            HttpResponse::InternalServerError().body("Try again later")
        }
    }
}

/// Create an offer to buy DD
async fn offer_fiat(pool: web::Data<sqlx::PgPool>, req: web::Json<OfferRequest>) -> impl Responder {
    let amount = BigDecimal::from(req.amount);
    match req.ensure_authentic() {
        Ok(_) => (),
        Err(e) => return HttpResponse::BadRequest().body(e),
    }
    let result = sqlx::query!(
        "INSERT INTO offer (amount, bank_account, public_key, direction) VALUES ($1, $2, $3, $4) RETURNING id",
        amount,
        req.bank_account,
        req.public_key,
        OfferDirection::FiatToDD as OfferDirection
    )
    .fetch_one(pool.get_ref())
    .await;

    match result {
        Ok(record) => HttpResponse::Ok().json(serde_json::json!({"id": OfferId::from(record.id)})),
        Err(error) => {
            tracing::error!(?error);
            HttpResponse::InternalServerError().body("Try again later")
        }
    }
}

/// Accept a new fiat bank statement, and, if it contains any settled c2c transfers
/// that are related to our offers, update the offers accordingly
///
/// This is intended to be a webhook from the bank, gated by a secret key,
/// but for now we just accept any POST request
async fn readout(pool: web::Data<sqlx::PgPool>, body: String) -> impl Responder {
    let result = handle_readout(pool.get_ref(), &body).await;
    match result {
        Ok(_) => HttpResponse::Ok().body("Accepted"),
        Err(e) => {
            eprintln!("error handling readout: {e:?}");
            HttpResponse::InternalServerError().body("Failed to handle readout")
        }
    }
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    use tracing::level_filters::LevelFilter;
    use tracing_subscriber::util::SubscriberInitExt;
    use tracing_subscriber::{layer::SubscriberExt, EnvFilter};

    dotenv().ok();

    tracing_subscriber::registry()
        .with(tracing_subscriber::fmt::layer())
        .with(
            EnvFilter::builder()
                .with_default_directive(LevelFilter::INFO.into())
                .from_env_lossy(),
        )
        .init();

    let conf = conf::Conf::from_env();
    for missing in conf.missing_keys() {
        tracing::error!("Missing env `{missing}`; nothing will probably work");
    }

    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let pool = PgPoolOptions::new()
        .max_connections(1)
        .connect(&database_url)
        .await
        .expect("Could not connect to the database");

    let also_pool = Clone::clone(&pool);
    actix_rt::spawn(async move {
        cron::run(conf, also_pool).await;
    });

    HttpServer::new(move || {
        App::new()
            .wrap(middleware::Logger::default())
            .app_data(web::Data::new(pool.clone()))
            .route("/offer", web::get().to(get_all_offers))
            .route("/offer/{offerId}", web::get().to(get_offer))
            .route("/offer-dd", web::post().to(offer_dd))
            .route("/offer-fiat", web::post().to(offer_fiat))
            .route("/readout", web::post().to(readout))
            .default_service(actix_files::Files::new("/", "./dist").index_file("index.html"))
    })
    .bind(("127.0.0.1", 8080))
    .unwrap()
    .run()
    .await
    .unwrap();

    Ok(())
}
