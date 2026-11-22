# Green Room

A breath coach for people who talk for a living: podcasters, streamers, teachers, and anyone whose calendar is back to back calls.

Green Room learns how you breathe while you are quiet, then counts how long you talk without stopping. When a stretch runs long, it dims the screen and shows one word: **Breathe**.

No microphone. No wearable. No recording.

Built with the [Presage SmartSpectra SDK](https://presagetech.com) for the [Presage SmartSpectra SDK Challenge](https://dev.to/challenges/presage-2026-11-04).

---

## Why this exists

People who speak for a living do not notice they are running out of air. They notice after: the flat ending, the rushed sentence, the shallow breath halfway through a paragraph. By then the take is spoiled.

The clues are visible before that: the unbroken stretch of talking, and a pulse that has drifted up. Both are things a camera can see, and neither needs a microphone pointed at you.

There is also a constraint that shaped the whole design. The Presage model cards say breathing rate and the breathing traces do not work while the subject is talking: the chest has to be still and the room has to be quiet. So the camera cannot hear you run out of air mid-sentence. Green Room does the honest version instead: it measures your breathing in the silence before and after, and while you talk it counts the thing it can actually see, which is how long you have gone without a pause.

Green Room is deliberately narrow. It coaches one thing, on the theory that one clear nudge lands better than a dashboard of eight numbers.

---

## What it measures

| Signal | Where it comes from | How Green Room uses it | Valid while talking? |
|---|---|---|---|
| Talking / not talking | Face analysis (visual speech detection) | Starts and ends each unbroken stretch, the primary cue trigger | Yes |
| Pulse rate | Face colour changes (rPPG), 12 second average | Secondary trigger: a rise above your quiet baseline makes a cue more likely | Yes, if you are stationary and lit |
| Breathing rate | Chest and abdomen movement, 30 second window | Your resting baseline, and the before/after comparison in the summary | **No**, quiet only |
| Breathing traces | Chest and abdomen movement | The breathing ring on screen | **No**, quiet only |
| HRV (RMSSD) | 60 second beat to beat window | Shown once it exists, kept out of the cue logic | Quiet only |

The cue logic lives in [`src/coach.js`](src/coach.js) and is pure functions plus one state machine. No DOM, no SDK, no timers. That means the coaching behaviour is testable without a camera:

```bash
npm test
# 8/8 passing
```

---

## Requirements

- Node.js **22 or newer** (Electron 45 needs it)
- An API key from https://physiology.presagetech.com (free tier is enough)
- A webcam, decent front lighting, and a face roughly an arm's length from the screen
- macOS on Apple Silicon, Windows x64, or Linux x64/arm64. **The SDK ships no native runtime for Intel Macs**, so an Apple Silicon machine is the safe choice if you have one.

---

## Setup

```bash
git clone <your repo>
cd green-room
npm install
cp .env.example .env        # then paste your key into .env
npm start
```

`npm start` builds the renderer bundle and launches Electron. If the Electron window gives you trouble, `npm run headless` runs the same SDK and the same coaching logic in plain Node with a browser dashboard, see [HEADLESS.md](HEADLESS.md). The key is read from `.env` in the Electron main process, so it never enters the bundle and never reaches the repo. `.gitignore` already excludes `.env`.

If Electron's binary did not download during `npm install`, run `npx electron --version` to retry it, then `npm start` again.

---

## Using it

1. Read the consent screen and tick the box. Nothing starts before that.
2. Sit facing the light, an arm's length away.
3. **Sit still and breathe normally for the first 30 seconds.** That is your resting baseline, and the only time breathing can be read. The app is silent during it.
4. Talk. The ribbon under the numbers fills as you keep going.
5. When you have gone a long time without pausing, and your pulse has drifted up, the screen dims and says **Breathe**. Past 40 seconds it nudges you regardless.
6. Stop talking and you will see how much air you took: `4.1s of air`.
7. Before you end the session, sit quietly for a few seconds so you get a second resting reading, which is what the before/after comparison needs.
7. End the session for a summary. Export it if you want the numbers; the file contains derived values only.

### Replay mode, no camera needed

```bash
npm start -- --replay
```

or open the built app with `?replay` on the URL. It feeds synthetic frames through exactly the same rendering and coaching path so the interface can be reviewed or screenshotted on a machine with no camera. It is watermarked **simulated data** on screen, and exports are labelled `simulated-session` so nobody mistakes a demo trace for a measurement.

---

## How it is put together

```
┌──────────────────────────── Electron main process ─────────────────────────────┐
│  loads .env, owns the window, wires the SmartSpectra IPC bridge                │
│  decodeMetrics(buffer) → small plain JSON frame  (protobuf stays out of the UI) │
└───────────────────────────────────┬───────────────────────────────────────────┘
                                    │ ipcMain.handle('greenroom:decode')
┌───────────────────────────────────┴───────────────────────────────────────────┐
│  preload: requires the SDK's preload (MessagePort bridge) + exposes decode()    │
├───────────────────────────────────────────────────────────────────────────────┤
│  renderer (bundled by esbuild)                                                 │
│    @smartspectra/node-sdk/renderer  → camera, metrics, validation hints        │
│    src/coach.js                     → baseline, streaks, cues, session stats   │
│    index.html / styles.css          → numbers, ribbon, one word                │
└───────────────────────────────────────────────────────────────────────────────┘
```

Three decisions worth calling out:

**Decode in the main process.** The SDK hands the renderer protobuf buffers. Rather than pull `protobufjs` and a `Buffer` polyfill into a browser bundle, `decodeMetrics` runs in main, where Node and the native runtime already live, and the renderer receives the twelve numbers it actually draws. The bundle stays free of FFI.

**Coaching logic is separate from the SDK.** `coach.js` receives plain frames and returns events. That is why it has unit tests, and why the same code path serves both live and replay modes.

**The cue is deliberately single-purpose.** No scores, no progress bars towards a health goal, no "your stress is high today". One nudge, one word.

---

## Consent and data handling

Short version, and this is the same text used in the challenge submission:

- **Consent gate.** The camera cannot start until the user has ticked an explicit checkbox that names the camera, the purpose, and the fact that this is not medical advice. There is a visible camera indicator and a persistent **records nothing** badge during the session.
- **Audio is never captured.** The app does not request microphone permission and contains no audio code. Talking is detected visually.
- **Nothing is recorded.** No video frames, no audio, no screenshots, no vitals are written to disk during a session. There is no recording button and no background process.
- **Storage.** Only if the user presses *Export session summary*: a JSON file with derived numbers (durations, averages, counts), the app version, and the platform. No frames, no identifiers.
- **Retention and deletion.** In memory for the length of the session, then gone when the window closes. Exported files are the user's own file, deleted by the user, like any download.
- **Sharing.** Nothing is shared. No analytics, no crash reporting, no third-party scripts. The renderer's Content Security Policy allows no remote script.
- **SDK telemetry is off.** The SDK is constructed with `enableTelemetry: false`, so its optional aggregate session summary is not sent.
- **Network.** The only outbound call is the SDK's own API key and subscription check. Metric computation happens locally inside the SDK. No cloud AI service is called: this build does not use the SDK's Insights feature.
- **Not a medical device.** Green Room gives wellness and performance feedback. It does not diagnose, treat, or make any medical decision, and it is not a substitute for advice from a clinician. One person, one camera, with their knowledge.
- **No covert monitoring.** The camera indicator, the consent gate, and single-user design exist to make that hard to abuse.

---

## Limitations, honestly

- **Breathing cannot be read while you talk.** That is a property of the method, not a bug here. The app leans on talking detection and pulse during speech, and on breathing in the quiet windows around it.
- Breathing rate needs a 30 second window and HRV needs 60 seconds, so the first half minute of a session is thinner than the rest.
- Accuracy depends on light and stillness. Backlight, dark rooms, and heavy motion all degrade the signal; the SDK's validation hints tell you which one is wrong.
- A "talking" detection can be fooled by a lively conversation partner, a cough, or singing. It is a coaching aid, not a classifier worth trusting for anything else.
- The cue thresholds are heuristics chosen by reading and testing, not clinical cut-offs. They are all in one `DEFAULTS` object in `src/coach.js`, easy to argue with and easy to change.

---

## File map

```
runner.cjs               headless entry point, no Electron, serves a dashboard
electron/main.cjs        window, .env, SDK bridge, protobuf decode
src/frame.cjs            one shared definition of a decoded metrics frame
electron/preload.cjs     SDK preload + the three things the page may call
src/coach.js             coaching state machine, unit tested
src/renderer.js          SDK wiring, rendering, replay mode
src/index.html           consent gate, session view, cue, summary
src/styles.css           stage-dark interface, reduced-motion aware
scripts/build.mjs        esbuild bundle for the renderer
scripts/test-coach.cjs   eight tests, no camera required
```

## Licence

Application code: MIT. The Presage SmartSpectra SDK is proprietary and licensed separately by Presage Technologies; it is installed from npm and not vendored here.
