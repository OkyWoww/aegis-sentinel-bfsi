# AegisSentinel BFSI: Demo Video Guide & Script

**Live demo:** https://aegis-sentinel-bfsi-11b46.web.app/
**Target length:** about 3 minutes 50 seconds
**Language:** English (on-screen actions and voiceover)

---

## 1. Pre-Recording Setup

1. **Recorder:** OBS Studio or Xbox Game Bar (`Win + G`), 1080p.
2. **Open 3 browser tabs in this order:**
   - **Tab 1 (Main):** the live sandbox at https://aegis-sentinel-bfsi-11b46.web.app/. Make sure the `INTERACTIVE SANDBOX` and `INDEPENDENT JS DEMO ENGINE` badges are visible. Click **Clear Window State** first so the page starts at `AWAITING INPUT`.
   - **Tab 2 (Production engine):** the GitHub repository `OkyWoww/aegis-sentinel-bfsi`, opened at `rust-engine/src/engine/scorer.rs`.
   - **Tab 3 (Benchmark evidence):** your local Rust benchmark result (Criterion, `rust-engine/benches`) showing **142 µs P99**.
3. **Open one PowerShell terminal** in `rust-engine`. Run `cargo test` before recording and leave the result on screen to show briefly at the end. Replace `<N>` below with your actual number of passing tests.
4. **Check the Gemini key is injected** (via `./deploy-web.sh`). If it is not, the SAR panel will show `FALLBACK TEMPLATE ACTIVE`. That state is also worth showing (see Scene 6).
5. **Wait at least 15 seconds** between two SAR calls, so the cooldown guard does not trigger by accident.

> [!IMPORTANT]
> Do not say "zero hallucination", and do not say any Rust/WASM code runs in the browser. The sandbox page is an independent JavaScript implementation.

> [!NOTE]
> The sandbox UI is now fully in English (disclosure box, SAR text, and fallback narrative). Redeploy with `./deploy-web.sh` and hard-refresh (`Ctrl + F5`) before recording so you capture the updated page.

---

## 2. Script by Scene

### Scene 1: Opening & Problem (0:00 – 0:25)

**[Action]** Show Tab 1 (AegisSentinel BFSI header), camera still. Slowly move the cursor over the `INTERACTIVE SANDBOX` badge.

**[Voiceover]**
> "Hello, this is AegisSentinel BFSI, a real-time fraud and anti-money-laundering scoring engine for banks and financial institutions. Today, a fraudulent transfer can complete in seconds, but a manual Suspicious Activity Report can take hours to write. AegisSentinel closes that gap: deterministic risk scoring first, generative AI second."

---

### Scene 2: Architecture Transparency (0:25 – 0:55)

**[Action]** Scroll slightly to the **Audit Transparency Disclosure** box. Highlight the badge `VERIFIED TELEMETRY (FROM LOCAL ENGINE)` and the sentence about the client-side engine.

**[Voiceover]**
> "First, full transparency. What you see here is an interactive sandbox: an independent client-side JavaScript demo engine, built so you can evaluate the logic without installing anything. The production engine is written in Rust with Axum, and it lives in our GitHub repository together with its benchmarks. No Rust or WebAssembly is running in this page."

**[Action]** Switch to Tab 2 (GitHub), show `scorer.rs` for 3 to 4 seconds, then return to Tab 1.

---

### Scene 3: Preset 1, Normal Baseline (0:55 – 1:20)

**[Action]** Click **Preset 1: Normal Baseline**. Point the cursor at the score, the verdict badge, and the Sliding Window table.

**[Voiceover]**
> "Preset one clears the window state and evaluates a single normal transaction: 350,000 rupiah, normal travel speed, known device. The score is zero and the verdict is ALLOW. The transaction is now stored in a real five-minute sliding window in memory, shown in this table."

---

### Scene 4: Preset 2, Velocity Burst (1:20 – 1:50)

**[Action]** Click **Preset 2: Velocity Burst**. Point at the `VELOCITY_BURST` signal and the record count in the window table (5 records).

**[Voiceover]**
> "Preset two seeds four prior transactions within the last twenty seconds, then evaluates one more. The velocity rule fires: more than three transactions in thirty seconds. That adds 45 points, so the score is 45. It is flagged, but still below the review threshold, because velocity alone is not enough to block a customer. Risk is accumulated from independent signals, not decided by a single rule."

> [!NOTE]
> Per the `calculateRisk` logic, Preset 2 produces a score of 45 (`ALLOW` with a `VELOCITY_BURST` signal). The narration above is deliberately honest about this. Do not call it `REVIEW`.

---

### Scene 5: Preset 3, High-Risk Burst → BLOCK (1:50 – 2:35)

**[Action]** Wait for the cooldown to read "READY". Click **Preset 3: High-Risk Burst**. Show the score of 100, the `BLOCK` badge, and the signal pills: `VELOCITY_BURST`, `STRUCTURING_SUSPECT`, `NEW_DEVICE_OR_MODIFIED_ENV`, `GEO_IMPOSSIBILITY`. Then point at the "Requesting SAR from …" loading text.

**[Voiceover]**
> "Preset three seeds four transactions clustered just under the 5-million-rupiah reporting threshold, then evaluates another one at a speed of 920 kilometers per hour on a modified device. Four signals fire together: velocity burst, structuring suspect, device anomaly, and geo-impossibility. The score is capped at 100, and the verdict is BLOCK."

> "Only on BLOCK do we call Gemini. We request structured JSON output with a strict schema: executive summary, typology analysis, and recommended actions."

---

### Scene 6: SAR, Verified Telemetry & Fallback (2:35 – 3:10)

**[Action]** Show the SAR panel: Executive Summary, Typology Analysis, Recommended Actions. Highlight the `VERIFIED TELEMETRY (FROM LOCAL ENGINE)` box. If the primary model was used, show the model badge in the SAR panel and in the header (Primary `gemini-3.8-flash`, Backup `gemini-3.5-flash-lite`).

**[Voiceover]**
> "The model never owns the facts. Account, amount, score, velocity and signals are overwritten with the locally computed values before display, so the narrative cannot change the numbers. The model names you see in the interface come from configuration: a primary model, with a backup model if the primary fails."

**[Action]** *(Optional. Show this if the API key is missing or the cooldown is active.)* Click Preset 3 again within 15 seconds. Show the `FALLBACK TEMPLATE ACTIVE` badge and the `SAR Quota` counter.

**[Voiceover]**
> "If the API fails, the key is missing, or the cooldown is active, a local fallback template takes over. It builds its sentences only from the signals that actually fired. It will not mention structuring if the structuring signal did not trigger. A 15-second cooldown and a 20-call session cap keep the demo within the free Firebase Spark plan."

---

### Scene 7: Honest Benchmark (3:10 – 3:35)

**[Action]** Click **Benchmark JS Engine (1,000x)**. Show the Avg Latency in µs. Switch to Tab 3 and show 142 µs P99.

**[Voiceover]**
> "This button runs the scoring function a thousand times in your own browser using performance dot now, and reports the average in microseconds. It measures this JavaScript demo only. The Rust production engine measured 142 microseconds at P99 in our local benchmark: sub-millisecond. We do not compare the two numbers directly."

---

### Scene 8: Closing (3:35 – 3:50)

**[Action]** Switch to the PowerShell terminal showing the `cargo test` result (`<N> passed`), then return to Tab 1.

**[Voiceover]**
> "The Rust engine is covered by automated tests, and the code and benchmarks are open on GitHub. AegisSentinel: fast deterministic scoring, grounded generative reports, and honest engineering. Thank you."

---

## 3. Accuracy Checklist Before Uploading

| Claim in the video | Evidence |
|---|---|
| 142 µs P99 (Rust, local benchmark) | Output of `rust-engine/benches` |
| Preset 1 score = 0 (ALLOW) | Sandbox UI |
| Preset 2 score = 45 (ALLOW, `VELOCITY_BURST` signal) | Sandbox UI |
| Preset 3 score = 100 (BLOCK) | Sandbox UI |
| 15 s cooldown, max 20 SAR calls | Constants `SAR_COOLDOWN_MS`, `SAR_MAX_CALLS` |
| `<N>` tests passing | Your `cargo test` output |

**Avoid:** "zero hallucination", "sub-100µs", any claim that Rust/WASM runs in the browser, and any claim about fraud-detection accuracy (the sandbox uses demo rules, not real data).
