import React, { useState } from 'react';
import { Gauge, Play, CheckCircle, ShieldCheck, Flame } from 'lucide-react';

interface BenchmarkResult {
  transactions_processed: number;
  duration_ms: number;
  throughput_rps: number;
  p50_us: number;
  p95_us: number;
  p99_us: number;
  persistence_bypassed: boolean;
}

export const BenchmarkRunner: React.FC = () => {
  const [count, setCount] = useState<number>(500);
  const [running, setRunning] = useState<boolean>(false);
  const [result, setResult] = useState<BenchmarkResult | null>(null);

  const runBenchmark = async () => {
    setRunning(true);
    try {
      const res = await fetch('/api/benchmark-burst', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count }),
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error('Benchmark failed', err);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-rose-500/10 text-rose-400 rounded-lg border border-rose-500/20">
              <Flame className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-white tracking-wide">
              Benchmark &amp; k6 Load Engine (T-08)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Uji performa throughput in-memory sub-10ms tanpa membuang kuota Firestore (Zero Cloud Cost)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-mono">
            CLI: --benchmark-mode
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <div className="lg:col-span-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
              Jumlah Transaksi Beban Burst:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[250, 500, 1000].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCount(c)}
                  className={`py-2 text-xs font-mono font-medium rounded border transition ${
                    count === c
                      ? 'bg-blue-600 text-white border-blue-500'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {c} Txns
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 text-xs text-slate-400 space-y-2">
            <div className="flex items-center gap-1.5 text-slate-300 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              SPOF Mitigasi Wald Aktif:
            </div>
            <p className="text-[11px] leading-relaxed">
              Jalur persistence Firestore &amp; panggilan Gemini otomatis di-bypass untuk pengujian stres k6, mencegah pembengkakan biaya cloud.
            </p>
          </div>

          <button
            onClick={runBenchmark}
            disabled={running}
            className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 transition disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5" />
            {running ? 'Mengeksekusi Beban Burst...' : `Jalankan Uji Beban In-Memory (${count} Transaksi)`}
          </button>
        </div>

        {/* Results Matrix */}
        <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-lg p-4">
          {result ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs text-slate-400 font-medium">Hasil Uji Benchmark k6:</span>
                <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Selesai ({result.duration_ms} ms)
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-900/80 p-3 rounded border border-slate-800 text-center">
                  <span className="text-[11px] text-slate-400 block mb-1">Throughput</span>
                  <span className="text-lg font-bold font-mono text-cyan-400">
                    {result.throughput_rps.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-500 block">RPS</span>
                </div>

                <div className="bg-slate-900/80 p-3 rounded border border-slate-800 text-center">
                  <span className="text-[11px] text-slate-400 block mb-1">Latency P50</span>
                  <span className="text-lg font-bold font-mono text-white">
                    {result.p50_us}
                  </span>
                  <span className="text-[10px] text-slate-500 block">µs</span>
                </div>

                <div className="bg-slate-900/80 p-3 rounded border border-slate-800 text-center">
                  <span className="text-[11px] text-slate-400 block mb-1">Latency P95</span>
                  <span className="text-lg font-bold font-mono text-amber-300">
                    {result.p95_us}
                  </span>
                  <span className="text-[10px] text-slate-500 block">µs</span>
                </div>

                <div className="bg-slate-900/80 p-3 rounded border border-slate-800 text-center">
                  <span className="text-[11px] text-slate-400 block mb-1">Latency P99</span>
                  <span className="text-lg font-bold font-mono text-emerald-400">
                    {result.p99_us}
                  </span>
                  <span className="text-[10px] text-slate-500 block">µs (&lt; 10ms SLA)</span>
                </div>
              </div>

              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[11px] text-emerald-300 flex items-center justify-between">
                <span>0 Firestore Writes Digunakan (Bypass Berhasil)</span>
                <span className="font-mono">P99: {(result.p99_us / 1000).toFixed(3)} ms</span>
              </div>
            </div>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-center text-slate-500">
              <Gauge className="w-8 h-8 text-slate-700 mb-2" />
              <p className="text-xs">Klik "Jalankan Uji Beban In-Memory" untuk memverifikasi latensi P99 sub-10ms</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
