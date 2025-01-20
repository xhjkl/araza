# syntax = docker/dockerfile:1

ARG BUN_VERSION=1.1.45
FROM oven/bun:${BUN_VERSION}-slim AS base

LABEL fly_launch_runtime="Bun"

# Bun app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV="production"


# Throw-away build stage to reduce size of final image
FROM rust:1.84 AS rust

WORKDIR /app

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential pkg-config python-is-python3

RUN cargo install --git https://github.com/coral-xyz/anchor --tag v0.30.1 anchor-cli
RUN curl -sSfL https://release.anza.xyz/stable/install | sh
ENV PATH="/root/.local/share/solana/install/active_release/bin:$PATH"

# Install rust modules for all the workspace
COPY ./Cargo.lock ./Cargo.toml ./Anchor.toml ./
COPY ./control ./control
COPY ./programs ./programs
COPY ./migrations ./migrations

RUN cargo build --release
RUN anchor build

# Install rust modules for daemon as well
COPY ./daemon ./daemon
RUN cd daemon && SQLX_OFFLINE=true cargo build --release


# Throw-away build stage to reduce size of final image
FROM base AS bun

# Install packages needed to build node modules
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential pkg-config python-is-python3

# Install node modules along with dev tools in the builder image
COPY ./app/bun.lockb ./app/package.json ./app/
RUN cd app && bun install

# The web app may need the generated interfaces
COPY --from=rust /app/target /app/target

# Copy application code
COPY ./app ./app
RUN cd app && bun run build


# Final stage for app image
FROM debian:bookworm-slim

WORKDIR /app

# Copy built web app
COPY --from=bun /app/app/dist ./dist

# Copy the binaries
COPY --from=rust /app/daemon/target/release/daemon /usr/local/bin/
COPY --from=rust /app/target/release/control /usr/local/bin/

# Start the server by default, this can be overwritten at runtime
EXPOSE 8080

CMD [ "daemon" ]
