'use strict';

/**
 * Green Room renderer.
 *
 * Reads SmartSpectra metrics through the renderer bridge, runs them through the
 * pure coaching state machine in coach.js, and draws three things: the live
 * numbers, the unbroken-talking ribbon, and the one-word cue.
 *
 * Two modes:
 *   live     the SDK, a camera, and a real session
 *   ?replay  a synthetic frame generator so the interface can be reviewed or
 *            screenshotted without a camera. It is labelled "simulated data"
 *            on screen and refuses to export a summary as if it were real.
 */

const {
  SmartSpectraSDK,
  breathingMetrics,
  cardioMetrics,
  faceMetrics,
  ProcessingStatus,
  ValidationCode,
} = require('@smartspectra/node-sdk/renderer');

const { Coach, DEFAULTS } = require('./coach.js');

const $ = (id) => document.getElementById(id);
const REPLAY = new URLSearchParams(location.search).has('replay');

const HINTS = {
  [ValidationCode.kOk]: 'good to go',
  [ValidationCode.kNoFaceFound]: 'no face in frame',
  [ValidationCode.kMultipleFacesFound]: 'more than one face',
  [ValidationCode.kFaceNotCentered]: 'move to the middle',
  [ValidationCode.kFaceSizeOutOfRange]: 'move a little closer or further',
  [ValidationCode.kTooDark]: 'add some light in front of you',
  [ValidationCode.kTooBright]: 'too much backlight, turn toward a lamp',
  [ValidationCode.kChestNotVisible]: 'chest out of frame, sit back',
  [ValidationCode.kCameraTuning]: 'camera settling',
  [ValidationCode.kFrameRateTooLow]: 'camera running slow',
  [ValidationCode.kExcessiveMotion]: 'hold a little stiller',
  [ValidationCode.kFaceTooClose]: 'a bit too close',
  [ValidationCode.kFaceTooFar]: 'a bit too far away',
  [ValidationCode.kFaceTooHigh]: 'lower your chair or the screen',
  [ValidationCode.kFaceTooLow]: 'raise the screen a little',
  [ValidationCode.kFaceNotForward]: 'look toward the camera',
};

const ERRORS = {
  2: 'The API key was rejected. Check SMARTSPECTRA_API_KEY in .env.',
  3: 'The SDK rejected the metric configuration.',
  4: 'The SDK reports no credits left for this key.',
  5: 'Network error reaching the SDK service. The key check needs a connection.',
  7: 'No camera found, or another app is holding it.',
  8: 'The processing pipeline failed to start.',
};

const state = {
  sdk: null,
  coach: new Coach(),
  running: false,
  decoding: false,
  lastFrameAt: 0,
  sessionStart: 0,
  cueTimer: null,
  clockTimer: null,
  chestMin: Infinity,
  chestMax: -Infinity,
  lastSummary: null,
  replayTimer: null,
  platform: '',
};

// ---------------------------------------------------------------- helpers
const fmt = (v, digits = 0) => (Number.isFinite(v) ? v.toFixed(digits) : '--');
const secs = (ms) => `${(ms / 1000).toFixed(1)}s`;
const clockText = (ms) => {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

function setStatus(text, kind = '') {
  $('status-text').textContent = text;
  const dot = $('status-dot');
  dot.className = 'dot' + (kind ? ` ${kind}` : '');
}

function setHint(code) {
  const el = $('hint');
  const text = HINTS[code] || 'adjusting';
  el.textContent = text;
  el.classList.toggle('good', code === ValidationCode.kOk);
}

// ---------------------------------------------------------------- session
async function startSession() {
  $('consent').hidden = true;
  $('session').hidden = false;
  $('summary').hidden = true;
  $('sim-badge').hidden = !REPLAY;

  state.coach = new Coach();
  state.sessionStart = performance.now();
  state.running = true;
  state.chestMin = Infinity;
  state.chestMax = -Infinity;
  state.lastSummary = null;
  $('export').disabled = true;

  state.clockTimer = setInterval(() => {
    $('clock').textContent = clockText(performance.now() - state.sessionStart);
  }, 500);

  if (REPLAY) {
    setStatus('simulated', 'warn');
    $('hint').textContent = 'simulated data, no camera';
    startReplay();
    return;
  }

  const env = await window.greenroom.env().catch(() => ({ hasApiKey: false }));
  state.platform = env.platform || '';

  const sdk = new SmartSpectraSDK({
    apiKey: window.greenroom.apiKey,
    requestedMetrics: [...breathingMetrics, ...cardioMetrics, ...faceMetrics],
    enableTelemetry: false,
  });
  state.sdk = sdk;

  sdk.on('streamAvailable', (stream) => {
    const video = $('preview');
    if (video.srcObject !== stream) video.srcObject = stream;
  });

  sdk.on('validationStatus', (code) => setHint(code));

  sdk.on('processingStatus', (status) => {
    if (status === ProcessingStatus.kRunning) setStatus('measuring', 'live');
    else if (status === ProcessingStatus.kStarting) setStatus('starting');
    else if (status === ProcessingStatus.kStopping) setStatus('stopping');
    else if (status === ProcessingStatus.kIdle) setStatus('idle');
    else if (status === ProcessingStatus.kError) setStatus('error', 'warn');
  });

  sdk.on('metrics', async (buf, tsUs) => {
    if (!state.running || state.decoding) return;
    state.decoding = true;
    try {
      const frame = await window.greenroom.decode(buf, tsUs);
      state.decoding = false;
      if (!frame || frame.error) return;
      onFrame(frame);
    } catch {
      state.decoding = false;
    }
  });

  sdk.on('error', (code, message) => {
    setStatus('error', 'warn');
    $('hint').textContent = ERRORS[code] || message || 'SDK error';
  });

  try {
    await sdk.start();
    setStatus('starting');
  } catch (err) {
    setStatus('error', 'warn');
    $('hint').textContent = ERRORS[err && err.code] || (err && err.message) || 'Could not start the SDK';
  }
}

async function endSession() {
  if (!state.running) return;
  state.running = false;
  clearInterval(state.clockTimer);
  clearInterval(state.replayTimer);

  if (state.sdk) {
    try {
      await state.sdk.stop();
      await state.sdk.destroy();
    } catch {
      /* teardown is best effort */
    }
    state.sdk = null;
  }

  const stats = state.coach.stats();
  state.lastSummary = stats;
  showSummary(stats);
}

// ---------------------------------------------------------------- rendering
function onFrame(frame) {
  if (!state.running) return;
  const t = performance.now() - state.sessionStart;
  const events = state.coach.update({
    t,
    talking: frame.talking,
    br: frame.br,
    brConfidence: frame.brConfidence,
    pulse: frame.pulse,
    pulseConfidence: frame.pulseConfidence,
  });

  renderNumbers(frame);
  renderStreak();

  for (const event of events) {
    if (event.type === 'ready') {
      setStatus('coaching', 'live');
      $('footnote').textContent = `Resting baseline: ${fmt(event.brBaseline, 1)} br/min. Cues from here.`;
    }
    if (event.type === 'cue') showCue(event);
    if (event.type === 'pause') $('last-event').textContent = `${secs(event.ms)} of air`;
  }
}

function renderNumbers(frame) {
  $('br-value').textContent = fmt(frame.br, 0);
  $('pulse-value').textContent = fmt(frame.pulse, 0);
  $('hrv-value').textContent = frame.hrv ? fmt(frame.hrv.rmssd, 0) : '--';

  const stats = state.coach.stats();
  $('baseline-value').textContent = stats.brBaseline ? fmt(stats.brBaseline, 0) : '--';

  $('talk-flag').hidden = !frame.talking;

  if (Number.isFinite(frame.chest)) {
    state.chestMin = Math.min(state.chestMin, frame.chest);
    state.chestMax = Math.max(state.chestMax, frame.chest);
    const span = Math.max(state.chestMax - state.chestMin, 1e-6);
    const pct = (frame.chest - state.chestMin) / span;
    const size = 88 + pct * 56;
    const ring = $('ring-inner');
    ring.style.width = `${size}px`;
    ring.style.height = `${size}px`;
  }
}

function renderStreak() {
  const stats = state.coach.stats();
  const ratio = Math.min(1, stats.currentStreakMs / DEFAULTS.cueAfterMs);
  $('streak-fill').style.width = `${(ratio * 100).toFixed(1)}%`;
  $('streak-value').textContent = secs(stats.currentStreakMs);
}

function showCue(event) {
  const cue = $('cue');
  cue.hidden = false;
  cue.className = 'cue' + (event.intensity > 0.8 ? ' hot' : event.intensity > 0.45 ? ' warm' : '');
  $('cue-word').textContent = 'Breathe';
  $('cue-sub').textContent =
    event.reason === 'pulse'
      ? `pulse is up ${fmt(event.pulseRise, 0)} bpm and you have not paused`
      : 'long stretch, let the exhale finish';

  clearTimeout(state.cueTimer);
  state.cueTimer = setTimeout(() => {
    cue.hidden = true;
  }, 2600);
}

// ---------------------------------------------------------------- summary
function showSummary(stats) {
  $('summary').hidden = false;
  const longest = stats.longestStreakMs;
  $('summary-title').textContent =
    stats.cues === 0 ? 'You never needed a nudge' : stats.cues < 3 ? 'Two or three nudges' : 'A talkative session';

  $('s-longest').textContent = secs(longest);
  $('s-br').textContent =
    stats.brBaseline === null
      ? '--'
      : `${fmt(stats.brBaseline, 1)} to ${stats.brAfter === null ? '--' : fmt(stats.brAfter, 1)}`;
  $('s-cues').textContent = String(stats.cues);
  $('s-pause').textContent = stats.pauses ? `${stats.pauses} / ${secs(stats.avgPauseMs || 0)}` : '0';

  const shift = stats.brShift;
  $('summary-note').textContent =
    shift === null
      ? 'Only one quiet window this time, so there is nothing to compare. Sit still for a few seconds before ending the session and you will get a before and after.'
      : `Your resting breathing went from ${fmt(stats.brBaseline, 1)} to ${fmt(
          stats.brAfter,
          1,
        )} br/min across the session, measured while you were quiet, which is the only time the SDK can read breathing reliably. Not medical, just your own number over time.`;

  $('export').disabled = false;
}

function exportSummary() {
  if (!state.lastSummary) return;
  const payload = {
    app: 'green-room',
    kind: REPLAY ? 'simulated-session' : 'session',
    generatedAt: new Date().toISOString(),
    platform: state.platform,
    coachOptions: DEFAULTS,
    summary: state.lastSummary,
    note: 'No video, audio, or raw camera frames are stored by this app. This file contains derived numbers only.',
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `green-room-summary-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------- replay
function startReplay() {
  const t0 = performance.now();
  state.replayTimer = setInterval(() => {
    const t = performance.now() - t0;
    const talking = Math.floor(t / 9000) % 2 === 0;
    // breathing is only readable while quiet; talking frames report no rate,
    // mirroring the SDK's own behaviour
    const br = talking ? null : 14 + Math.sin(t / 7000) * 1.2;
    const frame = {
      brConfidence: talking ? 0 : 82,
      pulseConfidence: 80,
      br,
      pulse: 68 + Math.sin(t / 11000) * 10 + (talking ? 4 : 0),
      talking,
    };
    onFrame(frame);
  }, 500);
}

// ---------------------------------------------------------------- wiring
async function boot() {
  const env = await window.greenroom.env().catch(() => ({ hasApiKey: false }));
  state.platform = env.platform || '';
  if (!env.hasApiKey && !REPLAY) $('key-warning').hidden = false;

  const check = $('consent-check');
  const start = $('start');
  check.addEventListener('change', () => {
    start.disabled = !check.checked;
  });
  start.addEventListener('click', startSession);
  $('quit').addEventListener('click', () => window.close());
  $('stop').addEventListener('click', endSession);
  $('export').addEventListener('click', exportSummary);
  $('close-summary').addEventListener('click', () => {
    $('summary').hidden = true;
  });
  $('again').addEventListener('click', async () => {
    $('summary').hidden = true;
    await startSession();
  });
  $('cue-threshold').textContent = `cue at ${Math.round(DEFAULTS.cueAfterMs / 1000)}s`;

  window.addEventListener('beforeunload', () => {
    if (state.sdk) {
      try {
        state.sdk.stop();
        state.sdk.destroy();
      } catch {
        /* ignore */
      }
    }
  });
}

boot();
