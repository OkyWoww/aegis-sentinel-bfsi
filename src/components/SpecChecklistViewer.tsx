import React, { useState } from 'react';
import { CheckSquare, Square, FileCode, CheckCircle2, ChevronDown, ChevronRight, Terminal } from 'lucide-react';

interface Task {
  id: string;
  name: string;
  desc: string;
  file: string;
  status: 'DONE' | 'IN_PROGRESS';
}

const TASKS: Task[] = [
  {
    id: 'T-01',
    name: 'Scaffolding & Cargo Setup',
    desc: 'Inisialisasi workspace Rust, Cargo.toml, dan Axum/Tokio configuration.',
    file: 'rust-engine/Cargo.toml',
    status: 'DONE',
  },
  {
    id: 'T-02',
    name: 'Window & Feature Engine',
    desc: 'Bounded ring-buffer per akun menggunakan Moka cache (50k akun, 15m TTI) + window confidence calculation.',
    file: 'rust-engine/src/engine/window.rs',
    status: 'DONE',
  },
  {
    id: 'T-03',
    name: 'Rule Scorer & Criterion',
    desc: 'Bobot scoring rules, alasan pelanggaran, Haversine geo distance, dan Criterion baseline (<100µs).',
    file: 'rust-engine/src/engine/scorer.rs',
    status: 'DONE',
  },
  {
    id: 'T-04',
    name: 'Axum API Routes',
    desc: 'Endpoint POST /v1/score, validasi header x-api-key, dan header respon x-processing-time-us.',
    file: 'rust-engine/src/main.rs',
    status: 'DONE',
  },
  {
    id: 'T-05',
    name: 'Circuit Breaker & Fallback',
    desc: 'State machine 3-strike circuit breaker untuk proteksi kuota burst error 429 dan transisi Open/Closed.',
    file: 'rust-engine/src/sar/circuit_breaker.rs',
    status: 'DONE',
  },
  {
    id: 'T-06',
    name: 'Gemini SAR Structured Client',
    desc: 'Integrasi endpoint Gemini dengan JSON schema validation dan deterministic fallback narrative.',
    file: 'rust-engine/src/sar/gemini.rs',
    status: 'DONE',
  },
  {
    id: 'T-07',
    name: 'Firestore Writer & Budget Guard',
    desc: 'Batch flusher REST Firestore dengan batasan kuota hard cap harian 10.000 writes/hari.',
    file: 'rust-engine/src/persistence/budget.rs',
    status: 'DONE',
  },
  {
    id: 'T-08',
    name: 'Benchmark Mode',
    desc: 'CLI flag --benchmark-mode untuk pengujian k6 load test tanpa merusak kuota cloud Firestore.',
    file: 'scripts/k6_benchmark.js',
    status: 'DONE',
  },
  {
    id: 'T-09',
    name: 'Multi-Stage Dockerfile',
    desc: 'Build binary statis musl dengan base gcr.io/distroless/static-debian12 untuk cold-start instan.',
    file: 'rust-engine/Dockerfile',
    status: 'DONE',
  },
  {
    id: 'T-10',
    name: 'Cloud Run Deployment',
    desc: 'Script otomasi deploy ke GCP project genai-track3-coffee di region us-central1 (max-instances=1).',
    file: 'scripts/deploy_cloud_run.sh',
    status: 'DONE',
  },
  {
    id: 'T-11',
    name: 'Firebase Dashboard & Rules',
    desc: 'Dashboard visual audit live + firestore.rules dan rewrites hosting.',
    file: 'firestore.rules',
    status: 'DONE',
  },
  {
    id: 'T-12',
    name: 'Verification & Smoke Test',
    desc: 'Pengujian end-to-end payload transaksi fraud dan verifikasi log sistem.',
    file: 'rust-engine/tests/smoke_test.rs',
    status: 'DONE',
  },
];

export const SpecChecklistViewer: React.FC = () => {
  const [expanded, setExpanded] = useState<boolean>(true);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl">
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between cursor-pointer select-none"
      >
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
            <CheckSquare className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide">
              SDD Execution Checklist (T-01 s/d T-12)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              12 dari 12 modul inti spesifikasi teknis telah terpasang dan tervalidasi
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs px-2.5 py-1 bg-emerald-500/15 text-emerald-400 font-mono font-bold rounded-full border border-emerald-500/30">
            100% Selesai
          </span>
          {expanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
        </div>
      </div>

      {expanded && (
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 border-t border-slate-800/80 pt-4">
          {TASKS.map((t) => (
            <div
              key={t.id}
              className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-mono font-bold text-cyan-400">{t.id}</span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> READY
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-200">{t.name}</h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{t.desc}</p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono text-slate-500">
                <span className="truncate max-w-[200px]">{t.file}</span>
                <FileCode className="w-3.5 h-3.5 text-slate-600" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
