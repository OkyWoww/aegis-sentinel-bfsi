// AegisSentinel BFSI Concurrent Load Test
// Measures end-to-end HTTP latency and server processing time
const http = require('http');

const TARGET_URL = process.env.TARGET_URL || 'http://localhost:8080/v1/score';
const API_KEY = process.env.SCORE_API_KEY || 'test-key-123';
const TOTAL_REQUESTS = 2000;
const CONCURRENCY = 50;

const agent = new http.Agent({
    keepAlive: true,
    maxSockets: CONCURRENCY,
});

const latencies = [];
const serverTimesUs = [];
let completed = 0;
let errors = 0;
let started = 0;

function sendRequest() {
    return new Promise((resolve) => {
        const id = ++started;
        const accountId = `acc_load_${Math.floor(Math.random() * 500)}`;
        const payload = JSON.stringify({
            txn_id: `txn_load_${Date.now()}_${id}`,
            account_id: accountId,
            amount: 4500000 + Math.floor(Math.random() * 500000),
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

        const start = performance.now();
        const req = http.request(
            TARGET_URL,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(payload),
                    'x-api-key': API_KEY,
                },
                agent,
            },
            (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    const elapsed = performance.now() - start;
                    if (res.statusCode === 200) {
                        latencies.push(elapsed);
                        const procUs = res.headers['x-processing-time-us'];
                        if (procUs) serverTimesUs.push(parseInt(procUs, 10));
                    } else {
                        errors++;
                    }
                    completed++;
                    resolve();
                });
            }
        );

        req.on('error', (err) => {
            errors++;
            completed++;
            resolve();
        });

        req.write(payload);
        req.end();
    });
}

async function runWorker() {
    while (started < TOTAL_REQUESTS) {
        await sendRequest();
    }
}

async function main() {
    console.log(`Starting load test: ${TOTAL_REQUESTS} requests, Concurrency: ${CONCURRENCY}...`);
    const t0 = performance.now();

    const workers = [];
    for (let i = 0; i < CONCURRENCY; i++) {
        workers.push(runWorker());
    }
    await Promise.all(workers);

    const totalTimeMs = performance.now() - t0;
    const rps = (completed / (totalTimeMs / 1000)).toFixed(1);

    latencies.sort((a, b) => a - b);
    serverTimesUs.sort((a, b) => a - b);

    const p50 = latencies[Math.floor(latencies.length * 0.50)]?.toFixed(2);
    const p90 = latencies[Math.floor(latencies.length * 0.90)]?.toFixed(2);
    const p99 = latencies[Math.floor(latencies.length * 0.99)]?.toFixed(2);
    const p999 = latencies[Math.floor(latencies.length * 0.999)]?.toFixed(2);
    const min = latencies[0]?.toFixed(2);
    const max = latencies[latencies.length - 1]?.toFixed(2);

    const s_p50 = serverTimesUs[Math.floor(serverTimesUs.length * 0.50)];
    const s_p90 = serverTimesUs[Math.floor(serverTimesUs.length * 0.90)];
    const s_p99 = serverTimesUs[Math.floor(serverTimesUs.length * 0.99)];
    const s_p999 = serverTimesUs[Math.floor(serverTimesUs.length * 0.999)];

    console.log('\n================ LOAD TEST RESULTS ================');
    console.log(`Total Requests:      ${completed}`);
    console.log(`Success Rate:        ${(((completed - errors) / completed) * 100).toFixed(2)}% (${errors} errors)`);
    console.log(`Throughput:          ${rps} req/sec`);
    console.log(`Total Duration:      ${(totalTimeMs / 1000).toFixed(2)}s`);
    console.log('\n--- Client End-to-End Latency (ms) ---');
    console.log(`Min:                 ${min} ms`);
    console.log(`p50:                 ${p50} ms`);
    console.log(`p90:                 ${p90} ms`);
    console.log(`p99:                 ${p99} ms (Target < 10ms: ${p99 < 10 ? 'PASSED' : 'FAILED'})`);
    console.log(`p99.9:               ${p999} ms`);
    console.log(`Max:                 ${max} ms`);
    console.log('\n--- Server-side Pure Processing Time (x-processing-time-us) ---');
    console.log(`p50:                 ${s_p50} µs (${(s_p50 / 1000).toFixed(3)} ms)`);
    console.log(`p90:                 ${s_p90} µs (${(s_p90 / 1000).toFixed(3)} ms)`);
    console.log(`p99:                 ${s_p99} µs (${(s_p99 / 1000).toFixed(3)} ms)`);
    console.log(`p99.9:               ${s_p999} µs (${(s_p999 / 1000).toFixed(3)} ms)`);
    console.log('===================================================\n');
}

main();
