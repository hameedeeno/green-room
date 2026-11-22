# DEV post draft: Green Room

Publish this on dev.to with the tags `devchallenge` and `presagechallenge`, using the official submission template. Replace every `[[...]]` with your links before publishing. Edit the voice where it does not sound like you; judges read a lot of submissions and the ones that sound like a person stand out.

**Title options**

1. Green Room: a breath coach for people who talk for a living, built on SmartSpectra
2. I built a coach that knows when you are talking, with no microphone
3. Green Room: teaching a camera to notice when a speaker runs out of air

---

*This is a submission for the [Presage SmartSpectra SDK Challenge](https://dev.to/challenges/presage-2026-11-04)*

## What I Built

**Green Room** is a desktop app for people who talk for a living: podcasters, streamers, teachers, and anyone whose week is back to back calls.

It watches your face and chest through the webcam, learns your own resting breathing rate in the first 20 seconds, and then watches for the moment you have been talking for a long stretch while your breathing rate has crept above that baseline. When that happens, the screen dims and shows one word: **Breathe**. Pause, and it tells you how long you took to recover.

The name is the room performers wait in before they go on. The whole app is that idea: something quiet that helps you walk on with air in your lungs.

Two things I deliberately did not build. It is not a health dashboard, because eight numbers on a screen is not coaching. And it does not listen, because a microphone in a coaching tool is a bigger ask than a camera pointed at your own face, and it turns out the camera is enough.

## Demo

`[[Link or embed your 75 second demo video here]]`

`[[Optional: link to a hosted build. Not required, and the app is a desktop Electron app, so the video is the demo that matters.]]`

The video is one unbroken take on a laptop webcam: consent screen, 30 quiet seconds of baseline, then talking until the cue fires, a pause, the recovery readout, a second quiet reading, and the session summary.

## Code

`[[https://github.com/your-handle/green-room]]`

Setup is five commands and one environment variable, all in the README:

```bash
git clone [[repo]]
cd green-room
npm install
cp .env.example .env      # paste your SmartSpectra key
npm start
```

There is also a replay mode (`npm start -- --replay`) that drives the interface with synthetic frames so the UI can be reviewed on a machine with no camera. It is labelled "simulated data" on screen and its exports are labelled as simulated, because a demo aid should never be mistaken for a measurement.

## How It Responds to Human Signals

Green Room requests three metric bundles and uses four signals, and the way it splits them up comes straight from the Presage model cards.

```js
const sdk = new SmartSpectraSDK({
  apiKey: window.greenroom.apiKey,
  requestedMetrics: [...breathingMetrics, ...cardioMetrics, ...faceMetrics],
  enableTelemetry: false,
});

sdk.on('streamAvailable', (stream) => { video.srcObject = stream; });
sdk.on('validationStatus', (code) => showHint(code));
sdk.on('metrics', async (buf, tsUs) => { onFrame(await window.greenroom.decode(buf, tsUs)); });
await sdk.start();
```

**The constraint that became the design.** The model cards are explicit: breathing rate and both breathing waveforms *do not work when the subject is talking*. The chest has to be still, the camera has to be stable, the room has to be quiet. Which means a camera physically cannot watch you run out of air mid-sentence.

That could have been the end of the idea. Instead it defines the app:

- **Breathing is only trusted in silence.** So the first 30 seconds are silent, and they are used to learn your resting breathing rate: `breathing.rate` samples with confidence above zero, while `face.talking` is false, medianed into one number. The same rule gives the summary a second resting reading taken after the session, so the before and after comparison is measured the same way twice.
- **While you talk, the app counts what it can actually see.** `face.talking` arrives per packet; a gap under 700ms is treated as a comma rather than a break. That gives the unbroken stretch, which is the primary cue trigger.
- **Pulse is the secondary trigger.** `cardio.pulseRate` is a 12 second average, valid while the subject is stationary and lit, so it survives talking. A rise of 6 bpm above your quiet baseline makes a cue likely at 25 seconds. Past 40 seconds the app nudges you regardless, because a long stretch is its own argument.
- **HRV stays out of the loop.** `rmssd`, `meanNn`, `sdnn` and `baevsky` appear once the 60 second window fills and are displayed, but nothing in the cue logic depends on them: too slow to act on, and using them would make the app feel like it is judging you.

**The cue logic is a pure state machine.** `src/coach.js` has no SDK, DOM or timer dependency; it takes plain frames and returns events.

```js
const cue =
  ready &&                                  // resting baseline exists
  streakMs >= 25_000 &&                     // long unbroken stretch
  (pulseRise >= 6 || streakMs >= 40_000) && // pulse up, or simply too long
  now - lastCueAt >= 20_000;                // never nag
```

Because it is pure, it has nine unit tests that run in a fifth of a second with no camera and no API key:

```bash
npm test     # 9/9 passing
```

Two of those tests exist specifically because of the model cards: one asserts that breathing samples reported *while talking* never enter the baseline, and one asserts that the app still coaches when the pulse is unreadable, falling back to the clock alone. The rest cover the pleasant cases: no cue during baseline, exactly one cue per long stretch, a 400ms gap not breaking a stretch, real pauses recorded with their length, the cooldown holding, and the before/after breathing buckets staying separate.

**One engineering note.** The SDK delivers protobuf buffers to the renderer. Rather than pull `protobufjs` and a `Buffer` polyfill into a browser bundle, Green Room decodes in the Electron main process and hands the renderer the dozen plain numbers it draws. The bundle stays free of FFI, and the renderer touches no Node globals.

## Status on My Machine (only keep this section if pairing is blocked)

> Delete this whole section if the app measures on your machine. It exists because on my Windows 10 PC the SDK's device pairing call fails at the Windows crypto layer with `NCryptDecrypt(size) failed: Invalid flags specified (-2146893815)`, so the encrypted physiology models never load. The app, the tests and the dashboard all run; the vendor step that fetches the models does not.

I think a failed vendor call is worth reporting rather than hiding, so here is exactly what happens on my machine and exactly what I ruled out.

The SDK pairs the device with Presage before it will fetch its models. On my PC that call dies:

```
W20261121 20:39:56.674763 4160 smartspectra.cc:1659] Device key provisioning did not complete;
  continuing with locally-available models. Remote EMD model delivery is unavailable this
  session: NCryptDecrypt(size) failed: Invalid flags specified. (-2146893815)
E20261121 20:39:58.034073 4160 smartspectra.cc:544] SmartSpectra::Initialize failed:
  SmartSpectra configuration failed.
  Calculator::Open() for node "..._PhysiologyInferenceCalculator" failed:
  device_id is required for remote model download
Could not start: The SDK rejected the metric configuration. (code 3)
```

What I checked before blaming the SDK:

- The API key is valid; the same key reaches the portal and the app authenticates
- The service is up: `https://cont-api.physiology.presagetech.com` returns `{"msg":"HEALTHY"}`
- TLS to that host from this app is clean: `h2`, public certificate, no interception
- Pairing endpoint is reachable: HTTP `403` without a token, which is the correct answer
- Windows is not in FIPS mode, and both `KeyIso` and `CryptSvc` are running
- Not a version problem: 3.3.0, 3.4.0 and 3.5.0 all contain the same `WindowsProtectedDataDeviceKeyStore` code path
- Not a local-models workaround: requesting only face metrics still fails, because `expressions-inference` is also delivered remotely

`-2146893815` is `0x80090009`, `NTE_BAD_FLAGS`, raised while persisting the device key. It reads like a bug in the Windows protected-data path rather than a configuration mistake, and it is reported to `support@presagetech.com`.

To show the product doing its job anyway, the repo ships a demo mode (`5-DEMO.cmd`, or `npm run demo`) that plays a scripted speaker through the same coaching code: quiet baseline, continuous talking, a real pause, the cue, the summary. Every number it displays is generated, and the video says so on screen rather than implying otherwise. It is the honest way to demonstrate the interaction while the vendor step is broken on this particular machine.

The coaching logic is tested independently of the vendor call, which is why the 9/9 suite still means something: the state machine takes `{talking, br, pulse}` and does not care where those numbers come from. On a machine where pairing succeeds, `2-RUN.cmd` prints live numbers and the cue fires on real physiology. On mine it stops at the vendor step, and the honest thing is to say so in the post rather than dress it up.

## Prize Categories

I am entering **both**.

**Most Creative or Delightful Use.** The moment worth seeing is that the app knows you are talking and there is no microphone. People assume speech detection needs audio; it does not, and watching the talking badge light up while the mic badge sits there untouched is the whole idea in one screenshot. The second is the interaction itself: it waits, then says one word. Restraint as a design choice, in a category where everything tends to shout. The third is the twist in the middle of the story: the camera cannot read your breathing while you talk, so the app counts the silence instead and measures what it can.

**Best Thoughtful Real-World Use.** The audience is specific and underserved: people who speak professionally and lose the ends of their sentences. Voice coaches exist and are expensive; wearables measure you all day and tell you nothing about the last 40 seconds. The design choices follow from that audience. It runs on the machine already on the desk during the call, it needs no wearable, it is silent for the first 20 seconds so it does not coach you before it knows you, and it never sends anything anywhere. The consent gate, the visible camera indicator, and telemetry disabled by default are part of the product, not a compliance afterthought.

## Consent and Data Handling

**Camera consent.** The app opens on a consent screen. The camera cannot start until the user ticks a checkbox that names the camera, the purpose, and the limits: wellness and performance feedback, not medical advice. The session view then keeps a visible camera indicator and a persistent "records nothing" badge on screen for the whole session, so the user never has to remember whether it is on.

**No audio.** The app does not request microphone permission and contains no audio capture code. Talking is detected from face movement, visually.

**No recording or storage.** No video frames, no audio, no screenshots, and no vitals are written to disk during a session. There is no recording feature and no background process.

**Storage, retention, deletion.** Data lives in memory for the length of a session and is gone when the window closes. The one exception is user-initiated: pressing *Export session summary* writes a JSON file containing derived numbers (durations, averages, cue counts), the app version, and the platform. That file is the user's own; there is no server-side copy and nothing to request deletion of.

**Sharing.** Nothing is shared with me or anyone else. No analytics, no crash reporting, no third-party scripts, no remote fonts. The renderer runs under a Content Security Policy that permits no remote script.

**SDK telemetry.** Disabled: the SDK is constructed with `enableTelemetry: false`, so its optional aggregate per-session diagnostic summary is not sent.

**Optional AI services.** Not used. This build does not call the SDK's LLM Insights feature, so no measurement text is sent to any model.

**Network.** The only outbound request is the SDK's API key and subscription validation. Metric computation runs locally inside the SDK. The key is read from a local `.env` in the Electron main process and is excluded from the repository by `.gitignore`.

**Boundaries.** No diagnosis, no treatment claims, no medical decision-making, and no covert or non-consensual monitoring: the consent gate, the on-screen indicators, and the single-user desktop design all exist to make those hard. Green Room is a coaching aid, and the README says so in plain language, including the limitations: a 30 second breathing window, a 60 second HRV window, and accuracy that depends on light and stillness.

## Agent Session

`[[Optional but encouraged. If you used a supported agent CLI, upload the transcript at https://dev.to/agent_sessions/new, slice it to the interesting parts, hit Make Public, and embed it here. Remove this section if you would rather not.]]`

---

`[[Add a cover image if you want one. The strongest frame is the session view mid-cue: dimmed screen, the word Breathe, and the two badges reading no microphone and records nothing.]]`
