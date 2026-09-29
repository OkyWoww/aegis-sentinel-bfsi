import React, { useState } from 'react';
import { ShieldAlert, Zap, Database, Cpu, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface Metrics {
  total_requests: number;
  active_windows: number;
  p50_latency_us: number;
  p99_latency_us: number;
  p99_latency_ms: string;
  budget_used: number;
  budget_limit: number;
  budget_remaining: number;
  circuit_breaker: {
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    consecutive_failures: number;
    cooldown_remaining_sec: number;
  };
  firestore_project: string;
  gemini_model: string;
  has_gemini_key: boolean;
}

interface Props {
  metrics: Metrics;
  onRefresh: () => void;
  onResetState: () => void;
  onToggleCircuit: (action: 'TRIP' | 'RESET') => void;
}

export const WaldResiliencePanel: React.FC<Props> = ({
  metrics,
  onRefresh,
  onResetState,
  onToggleCircuit,
}) => {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const handleTripBreaker = async () => {
    setLoadingAction('trip');
    await onToggleCircuit(metrics.circuit_breaker.state === 'OPEN' ? 'RESET' : 'TRIP');
    setLoadingAction(null);
  };

  const handleResetColdStart = async () => {
    setLoadingAction('reset');
    await onResetState();
    setLoadingAction(null);
  };

  const budgetPercent = Math.min(100, Math.round((metrics.budget_used / metrics.budget_limit) * 100));

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
              <ShieldAlert className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-white tracking-wide">
              Wald SPOF &amp; Resilience Matrix (Section 3)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Mitigasi kegagalan fatal arsitektur zero-cost: Scale-to-Zero, Quota Gemini, &amp; Hard Budget Guard
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Metrik
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* SPOF 1: State Reset */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                1. State Reset
              </span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono">
                max-instances=1
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium">Scale-to-Zero Confidence</p>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono text-cyan-400">
                {metrics.active_windows}
              </span>
              <span className="text-xs text-slate-400">Akun Aktif di Window</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
              Engine mengembalikan <code className="text-cyan-300">window_confidence</code> (0.1 - 0.98) agar tidak over-confident saat cold start.
            </p>
          </div>
          <button
            onClick={handleResetColdStart}
            disabled={loadingAction === 'reset'}
            className="mt-3 w-full py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 rounded font-medium transition"
          >
            {loadingAction === 'reset' ? 'Mengosongkan...' : 'Simulasi Cold Start'}
          </button>
        </div>

        {/* SPOF 2: Quota Burst / Gemini 429 */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                2. Quota Burst (429)
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-mono uppercase font-bold border ${
                  metrics.circuit_breaker.state === 'CLOSED'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : metrics.circuit_breaker.state === 'HALF_OPEN'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse'
                }`}
              >
                {metrics.circuit_breaker.state}
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium">Circuit Breaker 3-Strike</p>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-xl font-bold font-mono text-white">
                {metrics.circuit_breaker.consecutive_failures} / 3 Strikes
              </span>
              {metrics.circuit_breaker.state === 'OPEN' && (
                <span className="text-xs text-rose-400 font-mono">
                  {metrics.circuit_breaker.cooldown_remaining_sec}s Cooldown
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
              Otomatis beralih ke <code className="text-amber-300">rule_based_fallback</code> jika limit/error tanpa memblokir scoring.
            </p>
          </div>
          <button
            onClick={handleTripBreaker}
            disabled={loadingAction === 'trip'}
            className={`mt-3 w-full py-1.5 text-xs rounded font-medium border transition ${
              metrics.circuit_breaker.state === 'OPEN'
                ? 'bg-emerald-900/40 text-emerald-300 border-emerald-700/60 hover:bg-emerald-800/40'
                : 'bg-rose-950/40 text-rose-300 border-rose-800/60 hover:bg-rose-900/40'
            }`}
          >
            {metrics.circuit_breaker.state === 'OPEN' ? 'Pulihkan (Reset CLOSED)' : 'Paksa Trip (Simulasi 429)'}
          </button>
        </div>

        {/* SPOF 3: Firestore Budget Guard */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                3. Firestore Budget
              </span>
              <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-mono">
                Hard Cap 10k
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium">Daily Write Guard</p>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-xl font-bold font-mono text-white">
                {metrics.budget_used.toLocaleString()}
                <span className="text-xs text-slate-500 font-normal"> / {metrics.budget_limit.toLocaleString()}</span>
              </span>
              <span className="text-xs text-slate-400 font-mono">{budgetPercent}%</span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  budgetPercent > 80 ? 'bg-rose-500' : budgetPercent > 50 ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
                style={{ width: `${budgetPercent}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
              Mode <code className="text-blue-300">--benchmark-mode</code> membypass 100% penulisan audit agar kuota tetap utuh.
            </p>
          </div>
          <div className="mt-3 text-center py-1 text-[11px] text-emerald-400/90 bg-emerald-500/5 rounded border border-emerald-500/10">
            Sisa Kuota: {metrics.budget_remaining.toLocaleString()} writes
          </div>
        </div>

        {/* SPOF 4: Cloud Run CPU Throttling */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                4. CPU Throttling
              </span>
              <span className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full font-mono">
                Non-Blocking
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium">P99 Server-Side Latency</p>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono text-emerald-400">
                {metrics.p99_latency_us} µs
              </span>
              <span className="text-xs text-emerald-500/90 font-mono">&lt; 10ms SLA</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
              Moka cache in-memory &amp; channel <code className="text-purple-300">try_send</code> tanpa lock blocking melindungi P99 hot-path.
            </p>
          </div>
          <div className="mt-3 text-center py-1 text-[11px] text-purple-400/90 bg-purple-500/5 rounded border border-purple-500/10">
            P50: {metrics.p50_latency_us} µs | Total: {metrics.total_requests.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Selling Points Callout for Video Demo & Evaluation */}
      <div className="mt-4 pt-4 border-t border-slate-800/80 bg-slate-950/60 rounded-lg p-3.5 border border-slate-800/60">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wide">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            3 Selling Points Utama untuk Demo Video &amp; Penilaian Juri:
          </span>
          <span className="text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded">
            Wald SPOF Defense
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-300">
          <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800">
            <strong className="text-cyan-300 block mb-1">A. Metrik window_confidence</strong>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Menjawab langsung kelemahan <em>Scale-to-Zero</em>. Klik "Simulasi Cold Start", kirim transaksi berulang untuk mendemonstrasikan kenaikan bertahap (0.10 &rarr; 0.45 &rarr; 0.70 &rarr; 0.85 &rarr; 0.98).
            </p>
          </div>
          <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800">
            <strong className="text-rose-300 block mb-1">B. Circuit Breaker Sandbox</strong>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Klik "Paksa Trip (Simulasi 429)" untuk membuktikan sistem beralih instan ke <code className="text-amber-300 font-mono">rule_based_fallback</code> tanpa pernah menggagalkan proses otorisasi nasabah.
            </p>
          </div>
          <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800">
            <strong className="text-emerald-300 block mb-1">C. Microsecond Server Timing</strong>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Memvalidasi header HTTP <code className="text-emerald-300 font-mono">x-processing-time-us</code> murni komputasi CPU Rust (&lt; 100µs) bebas dari bias latency koneksi internet antar benua.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
