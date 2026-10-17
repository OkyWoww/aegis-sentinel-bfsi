# AegisSentinel BFSI: Demo Video Walkthrough Guide & Bilingual Script
**Target Duration:** 3 Minutes 30 Seconds – 3 Minutes 50 Seconds  
**Format:** Bilingual (English & Bahasa Indonesia) with Exact Screen Directing  
**Live Sandbox:** https://aegis-sentinel-bfsi-11b46.web.app/  
**GitHub Repository:** https://github.com/OkyWoww/aegis-sentinel-bfsi  

---

## 🎬 1. Persiapan Rekaman (Pre-Recording Setup)

1. **Aplikasi Perekam Layar:** OBS Studio atau Xbox Game Bar (`Win + G`), resolusi 1080p, 60fps.
2. **Siapkan 3 Tab Browser Berurutan:**
   - **Tab 1 (Utama):** Live Sandbox [https://aegis-sentinel-bfsi-11b46.web.app/](https://aegis-sentinel-bfsi-11b46.web.app/)  
     *(Klik **Clear Window State** agar layar mulai dari status `AWAITING INPUT`).*
   - **Tab 2 (GitHub Repository):** Buka repo `OkyWoww/aegis-sentinel-bfsi`, arahkan ke file `rust-engine/src/sar/gemini.rs` atau `README.md`.
   - **Tab 3 (Benchmark Criterion):** Hasil benchmark Rust lokal (`rust-engine/benches`) yang menunjukkan **142 µs P99**.
3. **Siapkan 1 Jendela PowerShell di folder `d:\aegisentinel\rust-engine`:**
   - Jalankan `cargo run` agar server proxy aktif di `http://localhost:8080`.
   - Siapkan jendela PowerShell kedua untuk menampilkan hasil `cargo test` (4 tests passed).

---

## 🎙️ 2. Naskah Video Adegan Demi Adegan (Scene-by-Scene Script)

---

### Scene 1: Pembukaan & Permasalahan Industri (0:00 – 0:25)
- **[Aksi Layar / Screen Action]:** Tampilkan Tab 1 (Header AegisSentinel BFSI). Kursor mengarah perlahan ke judul dan badge `INTERACTIVE SANDBOX`.

#### 🇮🇩 Narasi (Bahasa Indonesia):
> "Halo semuanya. Ini adalah **AegisSentinel BFSI**, mesin scoring fraud dan anti-money laundering real-time untuk perbankan dan institusi keuangan. Di era transaksi instan, dana penipuan bisa lenyap dalam hitungan detik, tetapi pembuatan laporan Suspicious Activity Report (SAR) manual sering kali memakan waktu berjam-jam. AegisSentinel menjembatani kesenjangan ini: scoring deterministik sub-millisecond di depan, dan otomasi kepatuhan GenAI di belakang."

#### 🇬🇧 Voiceover (English):
> "Hello everyone. This is **AegisSentinel BFSI**, a real-time fraud and anti-money laundering scoring engine built for banking and financial infrastructure. Today, fraudulent transactions execute in milliseconds, but compiling compliance Suspicious Activity Reports (SAR) manually can take hours. AegisSentinel closes this gap: sub-millisecond deterministic risk scoring first, generative compliance AI second."

---

### Scene 2: Transparansi Arsitektur & Jalur Jujur (0:25 – 0:50)
- **[Aksi Layar / Screen Action]:** Scroll sedikit ke bawah, sorot kotak **Audit Transparency Disclosure** dan badge `VERIFIED TELEMETRY`. Beralih cepat ke Tab 2 (GitHub `rust-engine`) selama 3 detik, lalu kembali ke Tab 1.

#### 🇮🇩 Narasi (Bahasa Indonesia):
> "Pertama, mari kita bicara transparansi engineering. Yang Anda lihat di web browser ini adalah interactive sandbox client-side untuk memvalidasi algoritma logika fraud tanpa instalasi apa pun. Engine produksi intinya ditulis dalam bahasa Rust dengan Axum yang bertindak sebagai backend server berkecepatan tinggi, lengkap dengan benchmark Criterion di repositori GitHub kami."

#### 🇬🇧 Voiceover (English):
> "First, full engineering transparency. What you see in this browser is an interactive client-side sandbox, allowing you to test fraud heuristics instantly with zero setup. Our core production engine is written in Rust using Axum, operating as a high-frequency backend service with Criterion benchmarks open on GitHub."

---

### Scene 3: Preset 1 - Normal Baseline & In-Memory Window (0:50 – 1:15)
- **[Aksi Layar / Screen Action]:** Klik tombol **Preset 1: Normal Baseline**. Sorot angka skor (`0 / 100`), badge hijau `ALLOW`, dan tabel **5-Minute In-Memory Sliding Window**.

#### 🇮🇩 Narasi (Bahasa Indonesia):
> "Mari kita uji Preset 1: transaksi normal sebesar 350.000 rupiah, kecepatan normal, dan perangkat terdaftar. Mesin memberikan skor 0 dengan keputusan ALLOW. Transaksi ini langsung dicatat ke dalam sliding window in-memory 5 menit yang terlihat di tabel ini untuk memonitor riwayat rekening secara dinamis."

#### 🇬🇧 Voiceover (English):
> "Let's click Preset 1: a standard transfer of 350,000 rupiah with normal travel speed and a verified device. The engine scores it zero with an ALLOW verdict. The transaction is instantly stored in our 5-minute in-memory sliding window ledger shown in this table."

---

### Scene 4: Preset 2 - Deteksi Velocity Burst (1:15 – 1:45)
- **[Aksi Layar / Screen Action]:** Klik tombol **Preset 2: Velocity Burst**. Tunjukkan sinyal `VELOCITY_BURST`, skor 45, dan bertambahnya baris di tabel transaksi.

#### 🇮🇩 Narasi (Bahasa Indonesia):
> "Preset 2 menyuntikkan 4 transaksi berturut-turut dalam 20 detik lalu mengevaluasi satu transaksi baru. Rule velocity aktif karena melebihi 3 transaksi dalam 30 detik. Skor bertambah menjadi 45. Statusnya tetap ALLOW dengan sinyal flag, karena di sistem finansial riil, kecepatan tinggi saja tidak boleh serta-merta memblokir nasabah. Risiko diakumulasikan dari sinyal-sinyal independen."

#### 🇬🇧 Voiceover (English):
> "Preset 2 injects four transactions within 20 seconds followed by a new request. The velocity rule immediately fires, adding 45 points. The verdict remains ALLOW with a telemetry flag, because in tier-1 banking, velocity alone should not freeze a legitimate customer. Risk is accumulated across independent mathematical signals."

---

### Scene 5: Preset 3 - Serangan Akut → BLOCK & Pemicu SAR (1:45 – 2:20)
- **[Aksi Layar / Screen Action]:** Tunggu cooldown terbaca `READY`, lalu klik **Preset 3: High-Risk Burst**. Tunjukkan skor `100 / 100`, badge merah `BLOCK`, dan 4 sinyal anomali (`VELOCITY_BURST`, `STRUCTURING_SUSPECT`, `NEW_DEVICE_OR_MODIFIED_ENV`, `GEO_IMPOSSIBILITY`). Arahkan kursor ke animasi loading SAR.

#### 🇮🇩 Narasi (Bahasa Indonesia):
> "Sekarang kita simulasikan serangan siber pada Preset 3: transaksi berulang tepat di bawah limit pelaporan 5 juta rupiah, kecepatan gerak mustahil 920 km/jam, dan perangkat rooted. Empat sinyal aktif bersamaan: velocity burst, dugaan structuring AML, anomali perangkat, dan perpindahan geografis mustahil. Skor mencapai 100 dan status langsung menjadi BLOCK. Hanya pada status BLOCK inilah sistem secara otomatis memicu pembuatan dokumen SAR."

#### 🇬🇧 Voiceover (English):
> "Now let's simulate an active fraud attack with Preset 3: transactions clustered right below the 5-million rupiah reporting limit, an impossible travel speed of 920 km/h, and a rooted device. Four critical anomaly signals fire together. The score hits 100, resulting in an immediate BLOCK. Only upon a BLOCK verdict does the system automatically invoke the Generative SAR pipeline."

---

### Scene 6: Server-Side Gemini Proxy & Verified Telemetry (2:20 – 2:55)
- **[Aksi Layar / Screen Action]:** Sorot panel SAR yang baru selesai. Tunjukkan badge hijau **`GEMINI 3.8 FLASH (SERVER PROXY)`**, isi **Executive Summary**, **AML Typology Analysis**, **Recommended Actions**, dan kotak **Verified Telemetry**.

#### 🇮🇩 Narasi (Bahasa Indonesia):
> "Perhatikan badge hijau ini: **GEMINI 3.8 FLASH (SERVER PROXY)**. Sesuai standar keamanan enterprise perbankan, API key tidak pernah diekspos di browser, melainkan diproses oleh backend Rust Axum kami di sisi server dengan structured JSON schema. Model AI tidak pernah mengarang fakta—semua angka rekening, kecepatan, dan skor diikat langsung oleh *Verified Telemetry Guard* dari engine deterministik."

#### 🇬🇧 Voiceover (English):
> "Notice the green badge: **GEMINI 3.8 FLASH (SERVER PROXY)**. Following enterprise BFSI security standards, the API key is never exposed to the client; requests are proxied securely through our Rust Axum backend using strict JSON schemas. The LLM never hallucinates facts—account numbers, velocities, and scores are locked by our local *Verified Telemetry Guard*."

---

### Scene 7: Zero-Downtime Deterministic Fallback (2:55 – 3:20)
- **[Aksi Layar / Screen Action]:** Klik Preset 3 sekali lagi saat timer cooldown aktif (atau jelaskan skenario server offline). Tunjukkan badge amber **`FALLBACK TEMPLATE ACTIVE`**.

#### 🇮🇩 Narasi (Bahasa Indonesia):
> "Bagaimana jika koneksi internet terputus, kuota API eksternal habis, atau terjadi gangguan cloud? AegisSentinel memiliki sistem **Zero-Downtime Deterministic Fallback**. Lihat badge amber ini: sistem langsung beralih ke kompilasi template lokal tanpa latency dan tanpa downtime. Laporan tetap keluar dengan akurasi 100% berbasis sinyal yang terpicu. Operasional kepatuhan bank tidak pernah terhenti."

#### 🇬🇧 Voiceover (English):
> "What happens if external AI APIs suffer rate limits or network outages? AegisSentinel features a **Zero-Downtime Deterministic Fallback**. As shown by this amber badge, the engine seamlessly fails over to an in-memory deterministic rule compiler. Compliance operations continue uninterrupted with zero downtime and zero false narratives."

---

### Scene 8: Benchmark Sub-Millisecond & Automated Tests (3:20 – 3:45)
- **[Aksi Layar / Screen Action]:** Klik tombol **Benchmark JS Engine (1,000x)** dan tunjukkan angka latensi. Pindah layar ke PowerShell terminal kedua dan tunjukkan hasil `cargo test` (`4 passed`).

#### 🇮🇩 Narasi (Bahasa Indonesia):
> "Tombol benchmark ini menguji fungsi scoring 1.000 kali langsung di browser Anda dengan latensi hanya puluhan mikrodetik. Sementara itu, pada backend Rust produksi kami, benchmark Criterion mencatat latensi **P99 sebesar 142 mikrodetik**—jauh melampaui SLA industri 10 milidetik. Semua logika juga telah teruji penuh melalui unit test otomatis."

#### 🇬🇧 Voiceover (English):
> "This benchmark button executes 1,000 scoring cycles right inside your browser in tens of microseconds. On our production Rust backend, Criterion benchmarks achieved a **P99 latency of 142 microseconds**—dramatically outperforming the standard 10ms BFSI SLA. The entire pipeline is fully validated with passing automated test suites."

---

### Scene 9: Penutup / Closing (3:45 – 4:00)
- **[Aksi Layar / Screen Action]:** Kembali ke tampilan Tab 1 (Sandbox utama), arahkan kursor ke footer link GitHub.

#### 🇮🇩 Narasi (Bahasa Indonesia):
> "AegisSentinel BFSI membuktikan bahwa keamanan finansial kelas enterprise tidak harus lambat atau rapuh: scoring deterministik sub-millisecond, arsitektur server proxy yang aman, dan otomasi regulasi AI yang transparan dan dapat diandalkan. Terima kasih!"

#### 🇬🇧 Voiceover (English):
> "AegisSentinel BFSI proves that enterprise financial security can be both lightning-fast and extraordinarily resilient: sub-millisecond deterministic scoring, secure server-side AI proxying, and zero-downtime compliance automation. Thank you!"

---

## 📋 3. Checklist Sebelum Mengunggah Video (Pre-Upload Verification)

| Poin Klaim Video | Bukti Nyata di Repositori & Aplikasi |
|---|---|
| **142 µs P99 Latency** | Hasil benchmark Criterion di `rust-engine/benches/scoring_bench.rs` |
| **Server-Side Proxy** | Endpoint `POST /v1/sar` di `rust-engine/src/main.rs` & `sar/gemini.rs` |
| **Zero Client-Side Secret** | Tidak ada API key di `web-sandbox/public/index.html` |
| **Zero-Downtime Fallback** | Badge `FALLBACK TEMPLATE ACTIVE` saat offline/cooldown |
| **Automated Tests** | `cargo test` (4 tests passed: deserialization, structuring, velocity, fallback) |
| **Zero Linter Warnings** | `cargo clippy --all-targets -- -D warnings` bersih (0 warning) |
