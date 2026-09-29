# Multi-stage Dockerfile for root workspace context
FROM rust:1.80-slim-bookworm AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    musl-tools \
    musl-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN rustup target add x86_64-unknown-linux-musl

WORKDIR /app

COPY rust-engine/Cargo.toml rust-engine/Cargo.lock ./
RUN mkdir -p src benches tests && \
    echo "pub fn dummy() {}" > src/lib.rs && \
    echo "fn main() {}" > src/main.rs && \
    echo "fn main() {}" > benches/scoring_bench.rs && \
    cargo build --target x86_64-unknown-linux-musl --release || true && \
    rm -rf src benches tests

COPY rust-engine/ .

RUN cargo build --target x86_64-unknown-linux-musl --release --bin aegis-sentinel

FROM gcr.io/distroless/static-debian12:nonroot

WORKDIR /

COPY --from=builder /app/target/x86_64-unknown-linux-musl/release/aegis-sentinel /aegis-sentinel
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt

ENV PORT=8080
ENV RUST_LOG=info
ENV BENCHMARK_MODE=0

EXPOSE 8080

USER nonroot:nonroot

ENTRYPOINT ["/aegis-sentinel"]
