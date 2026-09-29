import React, { useState } from 'react';
import { Send, Zap, ShieldAlert, CheckCircle2, AlertOctagon, HelpCircle, Layers } from 'lucide-react';

interface ScoreResponse {
  txn_id: string;
  score: number;
  decision: 'ALLOW' | 'REVIEW' | 'BLOCK';
  reasons: string[];
  window_confidence: number;
  processing_time_us: number;
}

interface Props {
  onScoreSuccess: (resp: ScoreResponse, reqPayload: any) => void;
  onGenerateSar: (caseId: string) => void;
}

const PRESETS = [
  {
    name: '1. Structuring Suspect (AML Smurfing)',
    desc: '4x nominal IDR 4.950.000 berturut-turut tepat di bawah limit AML 5 juta',
    data: {
      account_id: 'acc_091238',
      amount: 4950000.0,
      currency: 'IDR',
      merchant_id: 'merch_crypto_p2p',
      channel: 'MOBILE_BANKING',
      device_id: 'dev_android_9918',
      geo: { lat: -6.2088, lon: 106.8456 },
    },
  },
  {
    name: '2. Velocity Burst Attack',
    desc: '>3 transaksi dalam jeda 10 detik',
    data: {
      account_id: 'acc_bot_rush_77',
      amount: 125000.0,
      currency: 'IDR',
      merchant_id: 'merch_ewallet_topup',
      channel: 'MOBILE_BANKING',
      device_id: 'dev_bot_instance',
      geo: { lat: -6.2088, lon: 106.8456 },
    },
  },
  {
    name: '3. Impossible Travel (Geo Anomaly)',
    desc: 'Transaksi berpindah lokasi sejauh 5.000 km dalam jeda 2 menit (>800 km/h)',
    data: {
      account_id: 'acc_travel_anomaly',
      amount: 850000.0,
      currency: 'IDR',
      merchant_id: 'merch_intl_exchange',
      channel: 'MOBILE_BANKING',
      device_id: 'dev_travel_01',
      geo: { lat: 35.6762, lon: 139.6503 }, // Tokyo
    },
  },
  {
    name: '4. New Device Fingerprint',
    desc: 'Akun lama dengan device_id baru tak dikenal',
    data: {
      account_id: 'acc_091238',
      amount: 2500000.0,
      currency: 'IDR',
      merchant_id: 'merch_marketplace',
      channel: 'MOBILE_BANKING',
      device_id: 'dev_unknown_macbook_' + Math.floor(Math.random() * 9999),
      geo: { lat: -6.2088, lon: 106.8456 },
    },
  },
  {
    name: '5. Legitimate Clean Payment',
    desc: 'Pembayaran normal QRIS merchant ritel IDR 45.000',
    data: {
      account_id: 'acc_clean_user_' + Math.floor(Math.random() * 500),
      amount: 45000.0,
      currency: 'IDR',
      merchant_id: 'merch_kopi_kenangan_qris',
      channel: 'QRIS',
      device_id: 'dev_iphone_clean',
      geo: { lat: -6.2088, lon: 106.8456 },
    },
  },
];

export const TransactionSimulator: React.FC<Props> = ({ onScoreSuccess, onGenerateSar }) => {
  const [accountId, setAccountId] = useState('acc_091238');
  const [amount, setAmount] = useState('4950000');
  const [merchantId, setMerchantId] = useState('merch_crypto_p2p');
  const [channel, setChannel] = useState('MOBILE_BANKING');
  const [deviceId, setDeviceId] = useState('dev_android_9918');
  const [lat, setLat] = useState('-6.2088');
  const [lon, setLon] = useState('106.8456');

  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<ScoreResponse | null>(null);
  const [headerTiming, setHeaderTiming] = useState<string | null>(null);

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setAccountId(preset.data.account_id);
    setAmount(preset.data.amount.toString());
    setMerchantId(preset.data.merchant_id);
    setChannel(preset.data.channel);
    setDeviceId(preset.data.device_id);
    setLat(preset.data.geo.lat.toString());
    setLon(preset.data.geo.lon.toString());
  };

  const handleScore = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);

    const txnId = `txn_${Date.now()}`;
    const payload = {
      txn_id: txnId,
      account_id: accountId,
      amount: parseFloat(amount) || 0,
      currency: 'IDR',
      merchant_id: merchantId,
      channel,
      device_id: deviceId,
      ts: Math.floor(Date.now() / 1000),
      geo: {
        lat: parseFloat(lat) || -6.2088,
        lon: parseFloat(lon) || 106.8456,
      },
    };

    try {
      const res = await fetch('/v1/score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'aegis_sentinel_dev_key_2026',
        },
        body: JSON.stringify(payload),
      });

      const headerUs = res.headers.get('x-processing-time-us');
      setHeaderTiming(headerUs);

      const data = await res.json();
      setLastResult(data);
      onScoreSuccess(data, payload);
    } catch (err) {
      console.error('Score request failed', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20">
              <Zap className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-white tracking-wide">
              Hot-Path Transaction Scorer (POST /v1/score)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Uji scoring in-memory berlatensi ultra-rendah (<code className="text-emerald-400">&lt; 10ms P99</code>) &amp; ekstraksi fitur temporal
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono bg-slate-800 text-slate-300 border border-slate-700 px-2 py-1 rounded">
            Header: x-api-key
          </span>
        </div>
      </div>

      {/* Preset selector */}
      <div className="mb-5">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
          Pilih Vektor Kasus Uji:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {PRESETS.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => applyPreset(p)}
              className="text-left p-2.5 bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 rounded-lg transition group"
            >
              <div className="text-xs font-semibold text-slate-200 group-hover:text-blue-400">
                {p.name}
              </div>
              <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                {p.desc}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Inputs */}
        <form onSubmit={handleScore} className="lg:col-span-7 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                Account ID
              </label>
              <input
                type="text"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                Nominal (IDR)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                Merchant ID
              </label>
              <input
                type="text"
                value={merchantId}
                onChange={(e) => setMerchantId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                Channel
              </label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
              >
                <option value="MOBILE_BANKING">MOBILE_BANKING</option>
                <option value="INTERNET_BANKING">INTERNET_BANKING</option>
                <option value="ATM">ATM</option>
                <option value="QRIS">QRIS</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                Device ID
              </label>
              <input
                type="text"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                Geo Lat
              </label>
              <input
                type="text"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                Geo Lon
              </label>
              <input
                type="text"
                value={lon}
                onChange={(e) => setLon(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            {loading ? 'Sedang Mengevaluasi In-Memory...' : 'Kirim Transaksi & Hitung Skor (POST /v1/score)'}
          </button>
        </form>

        {/* Live Result Display */}
        <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
          {lastResult ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <span className="text-xs text-slate-400 font-mono">{lastResult.txn_id}</span>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    lastResult.decision === 'BLOCK'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                      : lastResult.decision === 'REVIEW'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  }`}
                >
                  {lastResult.decision}
                </span>
              </div>

              {/* Score Gauge */}
              <div className="bg-slate-900/80 p-3 rounded border border-slate-800/80">
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-xs text-slate-400">Risk Score:</span>
                  <span
                    className={`text-2xl font-bold font-mono ${
                      lastResult.score >= 80
                        ? 'text-rose-400'
                        : lastResult.score >= 40
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {lastResult.score} / 100
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      lastResult.score >= 80
                        ? 'bg-rose-500'
                        : lastResult.score >= 40
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${lastResult.score}%` }}
                  />
                </div>
              </div>

              {/* Reasons */}
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Flagged Reasons ({lastResult.reasons.length}):
                </span>
                {lastResult.reasons.length === 0 ? (
                  <span className="text-xs text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Transaksi Bersih (No Anomaly)
                  </span>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {lastResult.reasons.map((r, i) => (
                      <span
                        key={i}
                        className="text-[11px] px-2 py-0.5 bg-rose-950/50 text-rose-300 border border-rose-800/50 rounded font-mono"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Metrik Teknis Response */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
                <div className="bg-slate-900/50 p-2 rounded">
                  <span className="text-slate-400 block">Window Confidence:</span>
                  <span className="font-mono text-cyan-300 font-bold">
                    {lastResult.window_confidence}
                  </span>
                </div>
                <div className="bg-slate-900/50 p-2 rounded">
                  <span className="text-slate-400 block">Processing Time:</span>
                  <span className="font-mono text-emerald-300 font-bold">
                    {lastResult.processing_time_us} µs
                  </span>
                </div>
              </div>

              {lastResult.score >= 40 && (
                <button
                  type="button"
                  onClick={() => onGenerateSar(lastResult.txn_id)}
                  className="w-full mt-2 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium text-xs rounded shadow transition flex items-center justify-center gap-2"
                >
                  <AlertOctagon className="w-3.5 h-3.5" />
                  Buat Narasi SAR Kasus Ini (Gemini 3.8 Flash)
                </button>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <Layers className="w-8 h-8 text-slate-700 mb-2" />
              <p className="text-xs">Pilih skenario atau klik Kirim Transaksi untuk melihat respon mesin scoring</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
