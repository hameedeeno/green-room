'use strict';

/**
 * Coaching logic tests. No camera, no API key, no Electron.
 *
 *   npm test
 *
 * These encode the behaviours the app is judged on, including the constraint
 * that made the design: the SDK does not read breathing while the subject is
 * talking, so breathing is only trusted in silence and the cue itself is driven
 * by visual talking detection plus pulse.
 */

const assert = require('node:assert');
const { Coach, DEFAULTS } = require('../src/coach.js');

const HZ = 2;
const step = 1000 / HZ;

function frame(t, opts = {}) {
  return {
    t,
    talking: opts.talking === true,
    br: opts.br === undefined ? 14 : opts.br,
    brConfidence: opts.brConfidence === undefined ? 80 : opts.brConfidence,
    pulse: opts.pulse === undefined ? 66 : opts.pulse,
    pulseConfidence: 80,
  };
}

function run(coach, startMs, seconds, makeFrame) {
  const out = [];
  for (let i = 0; i < seconds * HZ; i += 1) {
    out.push(...coach.update(makeFrame(startMs + i * step)));
  }
  return out;
}

const silent = (br = 14, pulse = 66) => (t) => frame(t, { talking: false, br, pulse });
const talking = (br = null, pulse = 66) => (t) => frame(t, { talking: true, br, pulse, brConfidence: 0 });

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

// ---------------------------------------------------------------------------
test('learns a resting baseline in silence and stays quiet during it', () => {
  const c = new Coach();
  const events = run(c, 0, 32, silent(13.5, 64));
  const ready = events.filter((e) => e.type === 'ready');
  assert.equal(ready.length, 1, 'one ready event');
  assert.ok(ready[0].brBaseline > 13 && ready[0].brBaseline < 14, 'baseline captured in silence');
  assert.equal(events.filter((e) => e.type === 'cue').length, 0, 'no cue during baseline');
});

test('ignores breathing samples reported while talking, as the model card requires', () => {
  const c = new Coach();
  // Talking for the first 32 seconds: breathing confidence is 0, so no baseline
  const events = run(c, 0, 32, talking(22, 80));
  assert.equal(events.filter((e) => e.type === 'ready').length, 0, 'no baseline from talking samples');
  assert.equal(c.stats().brBaseline, null);
});

test('cues after a long stretch when pulse has risen', () => {
  const c = new Coach();
  run(c, 0, 31, silent(14, 64));
  const events = run(c, 31 * 1000, 30, talking(null, 74));
  const cues = events.filter((e) => e.type === 'cue');
  assert.equal(cues.length, 1, 'one cue in a 30 second stretch');
  assert.equal(cues[0].reason, 'pulse');
  assert.ok(cues[0].pulseRise >= 6, 'reports the pulse rise it saw');
});

test('waits past the soft threshold when pulse is steady', () => {
  const c = new Coach();
  run(c, 0, 31, silent(14, 64));
  const events = run(c, 31 * 1000, 30, talking(null, 65));
  assert.equal(events.filter((e) => e.type === 'cue').length, 0, 'no cue at 25s without a rise');
});

test('still cues on time alone when pulse is unreadable', () => {
  const c = new Coach();
  run(c, 0, 31, silent(14, 64));
  const events = run(c, 31 * 1000, 45, (t) => frame(t, { talking: true, br: null, brConfidence: 0, pulse: null }));
  const cues = events.filter((e) => e.type === 'cue');
  assert.ok(cues.length >= 1, 'a very long stretch always earns a nudge');
  assert.equal(cues[0].reason, 'time');
  assert.ok(cues[0].streakMs >= DEFAULTS.hardCueAfterMs - 600);
});

test('a 400ms gap does not break the stretch', () => {
  const c = new Coach();
  run(c, 0, 31, silent());
  const events = [];
  let t = 31 * 1000;
  events.push(...run(c, t, 12, talking(null, 66)));
  t += 12 * 1000;
  events.push(...run(c, t, 0.4, silent()));
  t += 400;
  events.push(...run(c, t, 12, talking(null, 66)));
  assert.equal(events.filter((e) => e.type === 'streak_end').length, 0, 'no streak end from a comma');
  assert.ok(c.stats().currentStreakMs > 23000, 'stretch kept accumulating');
});

test('records a real pause and its length', () => {
  const c = new Coach();
  run(c, 0, 31, silent());
  let t = 31 * 1000;
  const all = [];
  all.push(...run(c, t, 10, talking(null, 66)));
  t += 10 * 1000;
  all.push(...run(c, t, 3, silent()));
  t += 3 * 1000;
  // the pause is reported on the first talking frame after it, so keep this block's events
  all.push(...run(c, t, 4, talking(null, 66)));
  const ends = all.filter((e) => e.type === 'streak_end');
  const pauses = all.filter((e) => e.type === 'pause');
  assert.equal(ends.length, 1, 'one stretch closed');
  assert.equal(pauses.length, 1, 'one pause recorded');
  assert.ok(pauses[0].ms >= 2500 && pauses[0].ms <= 3500, 'pause length is believable');
});

test('cooldown swallows the next 20 seconds', () => {
  const c = new Coach();
  run(c, 0, 31, silent(14, 64));
  const events = run(c, 31 * 1000, 40, talking(null, 76));
  assert.equal(events.filter((e) => e.type === 'cue').length, 1, 'one cue, not two');
});

test('the cue also moves the quiet samples into the after-session bucket', () => {
  const c = new Coach();
  run(c, 0, 31, silent(14, 64));
  run(c, 31 * 1000, 30, talking(null, 76));       // gets coached
  run(c, 61 * 1000, 20, silent(16, 70));           // quiet again, after coaching
  const s = c.stats();
  assert.ok(s.ready, 'baseline ready');
  assert.ok(Math.abs(s.brBaseline - 14) < 0.5, 'baseline from the first quiet window');
  assert.ok(s.brAfter !== null && Math.abs(s.brAfter - 16) < 0.5, 'after-value from the second quiet window');
  assert.ok(s.brShift > 1, 'shift is reported');
  assert.equal(s.cues, 1);
});

// ---------------------------------------------------------------------------
let failed = 0;
for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`  ok    ${name}`);
  } catch (err) {
    failed += 1;
    console.log(`  FAIL  ${name}\n        ${err.message}`);
  }
}
console.log(`\n${tests.length - failed}/${tests.length} passing`);
process.exit(failed ? 1 : 0);
