'use strict';

/**
 * Headless runner: Green Room without Electron.
 *
 *   npm run headless
 *
 * Why this exists: the Electron window is only a shell. If it will not start on
 * a given machine, the SDK does not care. This runs the same SDK, the same
 * frame decoding and the same coaching state machine in a plain Node process,
 * opens the camera directly through the SDK, prints the session to the
 * terminal, and serves a small live dashboard at http://localhost:8787 so you
 * can see the numbers and the cue in a browser.
 *
 * No bundler. No Electron. No browser camera permissions. One command.
 */

const path = require('node:path');
const fs = require('node:fs');
const http = require('node:http');

// --- .env ------------------------------------------------------------------
function loadEnv() {
  const file = path.join(__dirname, '.env');
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnv();

const { Coach, DEFAULTS } = require('./src/coach.js');

const PORT = Number(process.env.PORT || 8787);
const apiKey = process.env.SMARTSPECTRA_API_KEY;
const DEMO = process.argv.includes('--demo');

if (!DEMO && !apiKey) {
  console.error('\n  No SMARTSPECTRA_API_KEY found.');
  console.error('  Copy .env.example to .env and paste your key, then run this again.\n');
  process.exit(1);
}

// The SDK is required after the key check, so a missing npm install and a
// missing key produce two different, accurate messages.
const { toFrame } = require('./src/frame.cjs');
const sdkLib = DEMO ? null : require('@smartspectra/node-sdk');

// ---------------------------------------------------------------- state
const coach = new Coach();
const startedAt = Date.now();
const clock = () => Date.now() - startedAt;
const clients = new Set();
let lastFrame = null;
let share = { talking: 0, strength: 0, cue: null };
let lastHint = 'starting';

function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    try {
      res.write(payload);
    } catch {
      clients.delete(res);
    }
  }
}

// ---------------------------------------------------------------- dashboard
const DASHBOARD = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/><title>Green Room, headless</title>
<style>
  :root{--bg:#0b0d10;--panel:#12161c;--line:#232a34;--ink:#eef2f6;--muted:#8b97a6;--accent:#7fe3c0;--warm:#ffb86b;--hot:#ff7a7a}
  *{box-sizing:border-box}body{margin:0;height:100vh;background:var(--bg);color:var(--ink);font-family:ui-sans-serif,system-ui,sans-serif;display:grid;place-items:center}
  .wrap{width:min(760px,94vw)}
  .row{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;font-family:ui-monospace,monospace;font-size:12px}
  .badge{border:1px solid var(--line);border-radius:999px;padding:5px 10px;color:var(--muted);letter-spacing:.08em;text-transform:uppercase;font-size:10.5px}
  .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px}
  .cell{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:14px}
  .k{display:block;font-family:ui-monospace,monospace;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:6px}
  .v{font-family:ui-monospace,monospace;font-size:26px}
  .bar{height:10px;border-radius:999px;background:#0a0d11;border:1px solid var(--line);overflow:hidden;margin-top:8px}
  .fill{height:100%;width:0;background:linear-gradient(90deg,var(--accent),var(--warm) 70%,var(--hot))}
  .foot{display:flex;justify-content:space-between;font-family:ui-monospace,monospace;font-size:11px;color:var(--muted);margin-top:8px}
  .cue{position:fixed;inset:0;display:none;place-content:center;text-align:center;background:rgba(6,8,11,.9)}
  .cue.on{display:grid}.cue b{font-size:64px;font-weight:600;color:var(--accent)}.cue.cold b{color:var(--accent)}.cue.warm b{color:var(--warm)}.cue.hot b{color:var(--hot)}
  .cue p{color:var(--muted);font-family:ui-monospace,monospace;font-size:12.5px;margin:6px 0 0}
  .talk{color:var(--accent)}
</style></head>
<body>
<div class="wrap">
  <div class="row"><span>GREEN ROOM / HEADLESS</span><span><span class="badge">no microphone</span> <span class="badge">records nothing</span> <span class="badge" id="hint">starting</span></span></div>
  <div class="grid">
    <div class="cell"><span class="k">breathing</span><span class="v" id="br">--</span></div>
    <div class="cell"><span class="k">pulse</span><span class="v" id="pulse">--</span></div>
    <div class="cell"><span class="k">baseline</span><span class="v" id="base">--</span></div>
    <div class="cell"><span class="k">talking</span><span class="v" id="talk">no</span></div>
  </div>
  <div class="bar"><div class="fill" id="fill"></div></div>
  <div class="foot"><span id="streak">0.0s unbroken</span><span id="cuecount">0 cues</span></div>
</div>
<div class="cue" id="cue"><b>Breathe</b><p id="cuesub"></p></div>
<script>
  const $ = (id) => document.getElementById(id);
  const es = new EventSource('/events');
  es.addEventListener('frame', (e) => {
    const d = JSON.parse(e.data);
    $('br').textContent = d.br === null ? '--' : d.br.toFixed(0);
    $('pulse').textContent = d.pulse === null ? '--' : d.pulse.toFixed(0);
    $('base').textContent = d.baseline === null ? '--' : d.baseline.toFixed(0);
    $('talk').textContent = d.talking ? 'yes' : 'no';
    $('talk').className = 'v' + (d.talking ? ' talk' : '');
    $('fill').style.width = Math.min(100, (d.streakMs / 25000) * 100) + '%';
    $('streak').textContent = (d.streakMs / 1000).toFixed(1) + 's unbroken';
    $('cuecount').textContent = d.cues + (d.cues === 1 ? ' cue' : ' cues');
    $('hint').textContent = d.hint;
  });
  es.addEventListener('cue', (e) => {
    const d = JSON.parse(e.data);
    const cue = $('cue');
    cue.className = 'cue on ' + (d.intensity > 0.8 ? 'hot' : d.intensity > 0.45 ? 'warm' : 'cold');
    $('cuesub').textContent = d.sub;
    setTimeout(() => { cue.className = 'cue'; }, 2600);
  });
</script></body></html>`;

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(DASHBOARD);
    return;
  }
  if (req.url === '/events') {
    res.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
    });
    res.write(': connected\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }
  if (req.url === '/summary') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(coach.stats(), null, 2));
    return;
  }
  res.writeHead(404).end('not found');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n  Green Room, ${DEMO ? 'demo' : 'headless'}`);
  console.log(`  dashboard: http://localhost:${PORT}`);
  console.log(`  summary:   http://localhost:${PORT}/summary`);
  console.log(
    DEMO
      ? '  scripted signal is playing. no camera is open.\n'
      : `  camera is on. sit still and stay quiet for ${DEFAULTS.baselineMs / 1000}s to learn your baseline.\n`,
  );
});

// ---------------------------------------------------------------- sdk
const sdk = DEMO
  ? null
  : new sdkLib.SmartSpectraSDK({
      apiKey,
      requestedMetrics: [...sdkLib.breathingMetrics, ...sdkLib.cardioMetrics, ...sdkLib.faceMetrics],
      enableTelemetry: false,
    });

const HINTS = {
  0: 'good to go',
  1: 'no face in frame',
  2: 'more than one face',
  3: 'move to the middle',
  4: 'adjust your distance',
  5: 'add light in front of you',
  6: 'too much backlight',
  7: 'chest out of frame',
  10: 'camera settling',
  11: 'camera running slow',
  12: 'hold a little stiller',
  13: 'a bit too close',
  14: 'a bit too far away',
  15: 'lower the screen',
  16: 'raise the screen',
  17: 'look toward the camera',
};

const ERRORS = {
  2: 'The API key was rejected. Re-copy it from the portal.',
  3: 'The SDK rejected the metric configuration.',
  4: 'No credits left for this key.',
  5: 'Network error reaching the SDK service. The key check needs a connection.',
  7: 'No camera found, or another app is holding it.',
  8: 'The processing pipeline failed to start.',
};

sdk?.on('validationStatus', (code) => {
  lastHint = HINTS[code] || 'adjusting';
});

sdk?.on('processingStatus', (status) => {
  if (status === 3) lastHint = 'measuring';
});

sdk?.on('metrics', (buf, tsUs) => {
  let frame;
  try {
    frame = toFrame(decodeMetrics(buf), tsUs);
  } catch {
    return;
  }
  lastFrame = frame;

  const events = coach.update({
    t: clock(),
    talking: frame.talking,
    br: frame.br,
    brConfidence: frame.brConfidence,
    pulse: frame.pulse,
    pulseConfidence: frame.pulseConfidence,
  });

  for (const event of events) {
    if (event.type === 'ready') {
      console.log(`  baseline learned: ${event.brBaseline.toFixed(1)} br/min. coaching from here.`);
      lastHint = 'coaching';
    }
    if (event.type === 'pause') {
      console.log(`  pause: ${(event.ms / 1000).toFixed(1)}s of air`);
    }
    if (event.type === 'cue') {
      const sub =
        event.reason === 'pulse'
          ? `pulse up ${Math.round(event.pulseRise)} bpm, no pause yet`
          : 'long stretch, let the exhale finish';
      console.log(`\n  >>> BREATHE  (${sub})\n`);
      broadcast('cue', { intensity: event.intensity, reason: event.reason, sub });
    }
  }

  const stats = coach.stats();
  broadcast('frame', {
    br: frame.br,
    pulse: frame.pulse,
    baseline: stats.brBaseline,
    talking: frame.talking,
    streakMs: stats.currentStreakMs,
    cues: stats.cues,
    hint: lastHint,
  });

  if (process.stdout.isTTY && Math.floor(clock() / 1000) % 2 === 0) {
    const st = coach.stats();
    process.stdout.write(
      `\r  br ${frame.br === null ? ' --' : frame.br.toFixed(1)}  pulse ${frame.pulse === null ? ' --' : frame.pulse.toFixed(0)}  base ${
        st.brBaseline === null ? ' --' : st.brBaseline.toFixed(0)
      }  ${frame.talking ? 'TALKING' : 'quiet  '}  streak ${(st.currentStreakMs / 1000).toFixed(1)}s  cues ${st.cues}   `,
    );
  }
});

// ------------------------------------------------------- connection check
// The SDK authenticates against Presage over HTTPS. When that call fails the
// native layer fires the same error on every frame, which used to bury the
// screen in repeated lines. Print the cause once, probe the path this app
// actually uses, then stop with something a human can act on.
const SERVICE_HOST = 'cont-api.physiology.presagetech.com';

function probeAddress(ip, ms = 8000) {
  return new Promise((resolve) => {
    const socket = require('node:tls').connect({
      host: ip,
      port: 443,
      servername: SERVICE_HOST,
      ALPNProtocols: ['h2', 'http/1.1'],
    });
    const done = (result) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(ms);
    socket.once('secureConnect', () => {
      let issuer = '';
      try {
        const cert = socket.getPeerCertificate();
        issuer = (cert && cert.issuer && (cert.issuer.O || cert.issuer.CN)) || '';
      } catch {
        /* ignore */
      }
      done({ ok: true, alpn: socket.alpnProtocol || '(none)', issuer });
    });
    socket.once('timeout', () => done({ ok: false, note: 'timed out after 8s' }));
    socket.once('error', (err) => done({ ok: false, note: err.code || err.message }));
  });
}

async function connectionCheck() {
  console.log('  connection check');

  let addrs = [];
  try {
    const res = await require('node:dns').promises.lookup(SERVICE_HOST, { all: true });
    addrs = res.map((r) => r.address);
  } catch (err) {
    console.log(`    name lookup   FAILED  ${err.code || err.message}`);
    console.log('\n  This PC cannot even look up the Presage service. That is a network');
    console.log('  problem, not an app problem. Try your phone as a hotspot.\n');
    return;
  }
  console.log(`    name lookup   ok      ${addrs.join(', ')}`);

  const order = [
    ...addrs.filter((a) => a.includes('.')),
    ...addrs.filter((a) => a.includes(':')),
  ];

  let working = null;
  let attempted = 0;
  for (const ip of order) {
    if (!working) {
      const res = await probeAddress(ip);
      attempted += 1;
      console.log(
        `    secure link   ${res.ok ? 'ok     ' : 'FAILED '} ${ip}${res.ok ? `  ${res.alpn}` : `  ${res.note}`}`,
      );
      if (res.ok) working = res;
    }
  }

  if (!working) {
    console.log('\n  Your browser can load this service but this app cannot reach it.');
    console.log('  Windows is treating node.exe differently from your browser. In order:');
    console.log('    1. Antivirus: pause the web or HTTPS shield, or add node.exe as an');
    console.log('       exception, then run 2-RUN.cmd again');
    console.log('    2. VPN: turn it fully off, then run 2-RUN.cmd again');
    console.log('    3. Network: connect your phone as a hotspot and try once more\n');
    return;
  }

  const intercepted = !/presage|letsencrypt|digicert|sectigo|amazon|google|microsoft|cloudflare|globalsign|godaddy|zerossl|buypass|entrust/i.test(
    working.issuer,
  );

  if (working.alpn !== 'h2' || intercepted) {
    console.log(`\n  Something is intercepting this connection. The certificate came from`);
    console.log(`  "${working.issuer || 'an unknown source'}" and the connection protocol was`);
    console.log(`  ${working.alpn}. A clean connection is "h2" from a public certificate authority.`);
    console.log('\n  That is antivirus HTTPS scanning or a corporate proxy. Pause the web');
    console.log('  shield, or add an exception for node.exe, then run 2-RUN.cmd again.\n');
    return;
  }

  console.log('\n  The network path from this PC is clean, so the block is inside this');
  console.log('  app\'s own connection. Pause antivirus web scanning for five minutes and');
  console.log('  run 2-RUN.cmd again. If it still fails, try your phone as a hotspot.\n');
}

let errorsShown = new Set();
let stopping = false;

sdk?.on('error', (code, message) => {
  if (stopping) return;
  if (errorsShown.has(code)) return;
  errorsShown.add(code);

  console.error(`\n  SDK error: ${ERRORS[code] || message} (code ${code})`);

  const fatal = code === 2 || code === 4 || code === 5 || code === 7 || code === 8;
  if (!fatal) {
    console.error('  Still running. Say something if it stays like this.\n');
    return;
  }

  stopping = true;
  (async () => {
    if (code === 5) {
      await connectionCheck();
    } else if (code === 7) {
      console.error('\n  Close anything else that could be using the camera, then');
      console.error('  run 2-RUN.cmd again.\n');
    }
    console.error('  stopping. nothing was recorded.\n');
    try {
      await sdk.stopAsync();
      await sdk.destroy();
    } catch {
      /* best effort */
    }
    server.close();
    process.exit(1);
  })();
});

// Print network health before anything else, because the SDK's first job is
// to provision a device key over the network and to fetch its models. When
// that path is blocked it fails far from the actual cause.
// The pairing endpoint is the call the SDK needs in order to fetch its
// encrypted models. Reaching TLS is not the same as being allowed to POST
// here, so probe it directly: any HTTP status means the transport works.
function pairProbe(ms = 8000) {
  return new Promise((resolve) => {
    const req = require('node:https').request(
      {
        host: SERVICE_HOST,
        port: 443,
        path: '/device/pair',
        method: 'POST',
        headers: { 'content-type': 'application/json', 'content-length': 2 },
      },
      (res) => {
        res.resume();
        resolve({ ok: true, status: res.statusCode });
      },
    );
    req.setTimeout(ms, () => {
      req.destroy();
      resolve({ ok: false, note: 'timed out' });
    });
    req.on('error', (err) => resolve({ ok: false, note: err.code || err.message }));
    req.end('{}');
  });
}

async function startupProbe() {
  let addrs = [];
  try {
    const res = await require('node:dns').promises.lookup(SERVICE_HOST, { all: true });
    addrs = res.map((r) => r.address).filter((a) => a.includes('.'));
  } catch {
    /* handled below */
  }
  if (!addrs.length) {
    console.log('  network   PROBLEM  this PC cannot look up the Presage service');
    await connectionCheck();
    return;
  }
  const res = await probeAddress(addrs[0]);
  if (!res.ok || res.alpn !== 'h2') {
    console.log('  network   PROBLEM');
    await connectionCheck();
    return;
  }
  console.log(`  network   ok       ${res.alpn}, ${res.issuer || 'certificate ok'}`);

  const pair = await pairProbe();
  if (pair.ok) {
    console.log(`  pair call ok       reachable, HTTP ${pair.status}`);
  } else {
    console.log(`  pair call FAILED   ${pair.note}`);
    console.log('\n  The app can open a secure link to Presage but cannot reach the');
    console.log('  device pairing call it needs. That is what stops the models');
    console.log('  loading. Antivirus, a proxy or the network is filtering this.');
    console.log('  Pause the web shield, or use your phone as a hotspot, then run');
    console.log('  2-RUN.cmd again.\n');
  }
}

// ------------------------------------------------------------- demo mode
// Feeds a scripted talker through the same Coach the live path uses, so the
// dashboard, the cue and the summary can be shown without a camera or a key.
// Nothing here touches the SDK. Every number is generated.
function startDemo() {
  const speed = Number(process.env.GREENROOM_DEMO_SPEED || 3) || 3;
  const STEP = 250;
  console.log('\n  DEMO MODE. synthetic signal only. no camera, no sdk, no key.');
  console.log(`  scripted talker, playing at ${speed}x. press ctrl+c for the summary.\n`);

  const pauseStart = 40000;
  const pauseEnd = 41200;

  let v = 0;
  const timer = setInterval(() => {
    v += STEP;

    let talking;
    let br;
    let pulse;

    if (v < 30000) {
      talking = false;
      br = 14.1 + Math.sin(v / 4000) * 0.35;
      pulse = 61 + Math.sin(v / 3000) * 0.8;
    } else if (v < pauseStart) {
      talking = true;
      br = null;
      pulse = 61 + ((v - 30000) / 1000) * 0.28;
    } else if (v < pauseEnd) {
      talking = false;
      br = 15.0;
      pulse = 69;
    } else if (v < 82000) {
      talking = true;
      br = null;
      pulse = 69 + ((v - pauseEnd) / 1000) * 0.05;
    } else {
      talking = false;
      br = 13.6 + Math.sin(v / 4000) * 0.3;
      pulse = 66;
    }

    const events = coach.update({
      t: v,
      talking,
      br,
      brConfidence: br === null ? 0 : 0.92,
      pulse,
      pulseConfidence: 0.88,
    });

    for (const event of events) {
      if (event.type === 'ready') {
        console.log(`  baseline learned: ${event.brBaseline.toFixed(1)} br/min. coaching from here.`);
        lastHint = 'coaching';
      }
      if (event.type === 'pause') {
        console.log(`  pause: ${(event.ms / 1000).toFixed(1)}s of air`);
      }
      if (event.type === 'cue') {
        const sub =
          event.reason === 'pulse'
            ? `pulse up ${Math.round(event.pulseRise)} bpm, no pause yet`
            : 'long stretch, let the exhale finish';
        console.log(`\n  >>> BREATHE  (${sub})\n`);
        broadcast('cue', { intensity: event.intensity, reason: event.reason, sub });
      }
    }

    const stats = coach.stats();
    broadcast('frame', {
      br,
      pulse,
      baseline: stats.brBaseline,
      talking,
      streakMs: stats.currentStreakMs,
      cues: stats.cues,
      hint: lastHint,
    });
  }, STEP / speed);

  timer.unref?.();
}

(async () => {
  if (DEMO) {
    startDemo();
    return;
  }
  await startupProbe();
  sdk.useCamera();
  try {
    sdk.start();
  } catch (err) {
    console.error(`\n  Could not start: ${ERRORS[err && err.code] || (err && err.message)}`);
    console.error('  code ' + (err && err.code) + '\n');
    process.exit(1);
  }
})();

// ---------------------------------------------------------------- shutdown
async function shutdown() {
  console.log('\n\n  session summary');
  const s = coach.stats();
  console.log(`    talked for            ${(s.talkMs / 1000).toFixed(0)}s of ${(s.elapsedMs / 1000).toFixed(0)}s`);
  console.log(`    longest stretch       ${(s.longestStreakMs / 1000).toFixed(1)}s`);
  console.log(`    cues                  ${s.cues}`);
  console.log(`    pauses                ${s.pauses}${s.avgPauseMs ? ` (avg ${(s.avgPauseMs / 1000).toFixed(1)}s)` : ''}`);
  console.log(
    `    resting breathing     ${s.brBaseline === null ? '--' : s.brBaseline.toFixed(1)} to ${
      s.brAfter === null ? '--' : s.brAfter.toFixed(1)
    } br/min`,
  );
  console.log('    nothing was recorded. no video, no audio.\n');
  if (sdk) {
    try {
      await sdk.stopAsync();
      await sdk.destroy();
    } catch {
      /* best effort */
    }
  }
  server.close();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
