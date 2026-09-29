import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Zap,
  Activity,
  Server,
  FileText,
  Flame,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Database,
  Lock,
} from 'lucide-react';
import { WaldResiliencePanel } from './components/WaldResiliencePanel.tsx';
import { TransactionSimulator } from './components/TransactionSimulator.tsx';
import { SarInspectorModal } from './components/SarInspectorModal.tsx';
import { BenchmarkRunner } from './components/BenchmarkRunner.tsx';
import { SpecChecklistViewer } from './components/SpecChecklistViewer.tsx';
import { RustCodeExplorer } from './components/RustCodeExplorer.tsx';

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

interface CaseItem {
  txn_id: string;
  account_id: string;
  amount: number;
  currency: string;
  score: number;
  decision: 'ALLOW' | 'REVIEW' | 'BLOCK';
  reasons: string[];
  window_confidence: number;
  processing_time_us: number;
  ts: number;
  sar_generated?: boolean;
}

export default function App() {
  const [metrics, setMetrics] = useState<Metrics>({
    total_requests: 1240,
    active_windows: 3,
    p50_latency_us: 45,
    p99_latency_us: 84,
    p99_latency_ms: '0.084',
    budget_used: 142,
    budget_limit: 10000,
    budget_remaining: 9858,
    circuit_breaker: {
      state: 'CLOSED',
      consecutive_failures: 0,
      cooldown_remaining_sec: 0,
    },
    firestore_project: 'genai-track3-coffee',
    gemini_model: 'gemini-3.8-flash',
    has_gemini_key: true,
  });

  const [cases, setCases] = useState<CaseItem[]>([]);
  const [activeSarCaseId, setActiveSarCaseId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'scorer' | 'audit' | 'benchmark' | 'specs' | 'code'>('scorer');

  const fetchMetrics = () => {
    fetch('/api/metrics')
      .then((res) => res.json())
      .then((data) => setMetrics(data))
      .catch((err) => console.error('Failed to fetch metrics', err));
  };

  const fetchCases = () => {
    fetch('/api/cases')
      .then((res) => res.json())
      .then((data) => setCases(data.cases || []))
      .catch((err) => console.error('Failed to fetch cases', err));
  };

  useEffect(() => {
    fetchMetrics();
    fetchCases();
    const interval = setInterval(() => {
      fetchMetrics();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleResetState = async () => {
    try {
      await fetch('/api/reset-state', { method: 'POST' });
      fetchMetrics();
      fetchCases();
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleCircuit = async (action: 'TRIP' | 'RESET') => {
    try {
      await fetch('/api/circuit-toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      fetchMetrics();
    } catch (e) {
      console.error(e);
    }
  };

  const handleScoreSuccess = (_resp: any, _req: any) => {
    fetchMetrics();
    fetchCases();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-500 selection:text-white">
      {/* Top System Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold text-white tracking-tight">
                  AegisSentinel BFSI
                </h1>
                <span className="text-[10px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full">
                  v0.2.0 Spec Pack
                </span>
                <span className="text-[10px] font-mono bg-purple-500/10 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded-full">
                  Google Cloud AI Builder Cup 2026
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Team: <strong className="text-slate-200">LogicForge AI</strong> | Target GCP:{' '}
                <code className="text-cyan-400 font-mono">genai-track3-coffee</code> (us-central1)
              </p>
            </div>
          </div>

          {/* Quick Engine Telemetry */}
          <div className="flex items-center gap-3 self-end sm:self-center">
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-mono">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-slate-400">P99 Server:</span>
              <span className="text-emerald-400 font-bold">{metrics.p99_latency_us} µs</span>
              <span className="text-[10px] text-slate-500">(&lt;10ms SLA)</span>
            </div>
            <div className="hidden md:flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-mono">
              <span className="text-slate-400">Cloud Run:</span>
              <span className="text-cyan-400 font-bold">1 Instance (Zero-Cost)</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 border-t border-slate-800/60 overflow-x-auto">
          {[
            { id: 'scorer', label: '1. Scoring Engine & Simulator', icon: Zap },
            { id: 'audit', label: '2. Live Audit Stream & SAR', icon: Activity },
            { id: 'benchmark', label: '3. Benchmark & k6 Mode', icon: Flame },
            { id: 'specs', label: '4. SDD Execution (T-01..T-12)', icon: CheckCircle2 },
            { id: 'code', label: '5. Rust Source & Deploy', icon: Server },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition whitespace-nowrap ${
                  active
                    ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Section 3: Wald SPOF & Resilience Matrix (Always Visible as Critical Mission Control) */}
        <WaldResiliencePanel
          metrics={metrics}
          onRefresh={fetchMetrics}
          onResetState={handleResetState}
          onToggleCircuit={handleToggleCircuit}
        />

        {/* Tab 1: Transaction Simulator */}
        {activeTab === 'scorer' && (
          <div className="space-y-6">
            <TransactionSimulator
              onScoreSuccess={handleScoreSuccess}
              onGenerateSar={(caseId) => setActiveSarCaseId(caseId)}
            />
          </div>
        )}

        {/* Tab 2: Live Audit Stream & SAR Studio */}
        {activeTab === 'audit' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
                    <Activity className="w-5 h-5" />
                  </span>
                  <h2 className="text-lg font-bold text-white tracking-wide">
                    Live Audit Stream &amp; SAR Generation
                  </h2>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Riwayat scoring transaksi realtime dengan pembuatan laporan SAR / LTKM otomatis via Gemini 3.8 Flash
                </p>
              </div>
              <button
                onClick={fetchCases}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Segarkan Kasus
              </button>
            </div>

            {cases.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                Belum ada transaksi di stream audit. Buka tab <strong>1. Scoring Engine &amp; Simulator</strong> untuk mengirim transaksi.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
                    <tr>
                      <th className="p-3">Txn ID / Akun</th>
                      <th className="p-3">Nominal</th>
                      <th className="p-3">Keputusan</th>
                      <th className="p-3">Skor</th>
                      <th className="p-3">Alasan (Red Flags)</th>
                      <th className="p-3">Latensi</th>
                      <th className="p-3 text-right">Aksi SAR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {cases.map((c) => (
                      <tr key={c.txn_id} className="hover:bg-slate-800/30 transition">
                        <td className="p-3">
                          <span className="text-white font-bold block">{c.txn_id}</span>
                          <span className="text-[10px] text-slate-500">{c.account_id}</span>
                        </td>
                        <td className="p-3 font-semibold text-slate-200">
                          IDR {c.amount.toLocaleString('id-ID')}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              c.decision === 'BLOCK'
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : c.decision === 'REVIEW'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            {c.decision}
                          </span>
                        </td>
                        <td className="p-3">
                          <span
                            className={`font-bold ${
                              c.score >= 80 ? 'text-rose-400' : c.score >= 40 ? 'text-amber-400' : 'text-emerald-400'
                            }`}
                          >
                            {c.score}
                          </span>
                        </td>
                        <td className="p-3">
                          {c.reasons.length === 0 ? (
                            <span className="text-slate-500 text-[10px]">-</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {c.reasons.map((r, i) => (
                                <span
                                  key={i}
                                  className="text-[10px] px-1.5 py-0.2 bg-rose-950/60 text-rose-300 border border-rose-800/40 rounded"
                                >
                                  {r}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-emerald-400">
                          {c.processing_time_us} µs
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => setActiveSarCaseId(c.txn_id)}
                            className="px-2.5 py-1 text-[11px] bg-purple-600/30 hover:bg-purple-600 text-purple-200 hover:text-white border border-purple-500/40 rounded transition"
                          >
                            {c.sar_generated ? 'Buka SAR' : 'Generate SAR'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Benchmark Runner */}
        {activeTab === 'benchmark' && <BenchmarkRunner />}

        {/* Tab 4: SDD Checklist */}
        {activeTab === 'specs' && <SpecChecklistViewer />}

        {/* Tab 5: Rust Code & Cloud Run Explorer */}
        {activeTab === 'code' && <RustCodeExplorer />}
      </main>

      {/* Modal Inspector SAR */}
      <SarInspectorModal
        caseId={activeSarCaseId}
        onClose={() => setActiveSarCaseId(null)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 mt-auto text-center text-xs text-slate-500">
        <p>
          AegisSentinel BFSI • Google Cloud AI Builder Cup 2026 • LogicForge AI • In-Memory Rust Engine &amp; Gemini 3.8 Flash
        </p>
      </footer>
    </div>
  );
}
