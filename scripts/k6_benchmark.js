// k6 Benchmark Script for AegisSentinel BFSI
// Target: /v1/score with --benchmark-mode bypass active
// Ensures sub-10ms P99 verification under high load

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 50 },  // Warmup
    { duration: '30s', target: 200 }, // Sustained burst
    { duration: '10s', target: 0 },   // Cooldown
  ],
  thresholds: {
    http_req_duration: ['p(99)<10'], // Wald Constraint: P99 < 10ms
    http_req_failed: ['rate<0.001'],
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:8080';
const API_KEY = __ENV.SCORE_API_KEY || 'aegis_sentinel_dev_key_2026';

export default function () {
  const accountId = `acc_${Math.floor(Math.random() * 5000)}`;
  const payload = JSON.stringify({
    txn_id: `txn_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    account_id: accountId,
    amount: Math.floor(Math.random() * 5000000) + 10000,
    currency: 'IDR',
    merchant_id: 'merch_crypto_p2p',
    channel: 'MOBILE_BANKING',
    device_id: `dev_${Math.floor(Math.random() * 10)}`,
    ts: Math.floor(Date.now() / 1000),
    geo: {
      lat: -6.2088 + (Math.random() - 0.5) * 0.1,
      lon: 106.8456 + (Math.random() - 0.5) * 0.1,
    },
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
    },
  };

  const res = http.post(`${BASE_URL}/v1/score`, payload, params);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'has processing_time_us': (r) => {
      const body = JSON.parse(r.body);
      return body.processing_time_us !== undefined && body.processing_time_us < 10000;
    },
    'has window_confidence': (r) => {
      const body = JSON.parse(r.body);
      return body.window_confidence >= 0.0 && body.window_confidence <= 1.0;
    },
  });

  sleep(0.01);
}
