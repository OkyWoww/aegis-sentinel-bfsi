# -------------------------------------------------------------
# Stage 1: Build static musl binary
# -------------------------------------------------------------
FROM rust:1.80-slim-bookworm AS builder

# Install musl tools and ca-certificates
RUN apt-get update && apt-get install -y --no-install-recommends \
    musl-tools \
    musl-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Add musl target
RUN rustup target add x86_64-unknown-linux-musl

WORKDIR /app

# Cache dependency builds
COPY Cargo.toml Cargo.lock ./
RUN mkdir -p src benches tests && \
    echo "pub fn dummy() {}" > src/lib.rs && \
    echo "fn main() {}" > src/main.rs && \
    echo "fn main() {}" > benches/scoring_bench.rs && \
    cargo build --target x86_64-unknown-linux-musl --release || true && \
    rm -rf src benches tests

# Copy actual source code
COPY . .

# Build production static binary
RUN cargo build --target x86_64-unknown-linux-musl --release --bin aegis-sentinel

# -------------------------------------------------------------
# Stage 2: Minimal Distroless Static Runtime
# -------------------------------------------------------------
FROM gcr.io/distroless/static-debian12:nonroot

WORKDIR /

# Copy statically linked binary
COPY --from=builder /app/target/x86_64-unknown-linux-musl/release/aegis-sentinel /aegis-sentinel

# Copy CA certificates for secure HTTPS outbound to Gemini / Firestore
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt

# Runtime environment defaults
ENV PORT=8080
ENV RUST_LOG=info
ENV BENCHMARK_MODE=0

EXPOSE 8080

USER nonroot:nonroot

ENTRYPOINT ["/aegis-sentinel"]
