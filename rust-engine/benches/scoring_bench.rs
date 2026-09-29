use criterion::{black_box, criterion_group, criterion_main, Criterion};
use std::time::Instant;
use aegis_sentinel::models::{GeoLocation, ScoreRequest};
use aegis_sentinel::engine::{RuleScorer, TransactionSnapshot};

fn criterion_benchmark(c: &mut Criterion) {
    let req = ScoreRequest {
        txn_id: "txn_bench_01".to_string(),
        account_id: "acc_bench_01".to_string(),
        amount: 4950000.0,
        currency: "IDR".to_string(),
        merchant_id: "merch_crypto_p2p".to_string(),
        channel: "MOBILE_BANKING".to_string(),
        device_id: "dev_bench".to_string(),
        ts: 1727608800,
        geo: Some(GeoLocation { lat: -6.2088, lon: 106.8456 }),
    };

    let history = vec![
        TransactionSnapshot {
            txn_id: "txn_hist_01".to_string(),
            amount: 4900000.0,
            device_id: "dev_bench".to_string(),
            ts: 1727608785,
            geo: Some(GeoLocation { lat: -6.2088, lon: 106.8456 }),
        },
    ];

    c.bench_function("rule_scorer_evaluate", |b| {
        b.iter(|| {
            RuleScorer::evaluate(
                black_box(&req),
                black_box(&history),
                black_box(false),
                black_box(0.95),
                Instant::now(),
            )
        })
    });
}

criterion_group!(benches, criterion_benchmark);
criterion_main!(benches);
