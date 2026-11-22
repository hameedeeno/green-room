'use strict';

/**
 * Green Room coaching logic.
 *
 * Pure state machine. No DOM, no SDK, no timers, no I/O. Every decision is a
 * function of the frames handed to update(), which makes it unit-testable
 * without a camera or an API key (see scripts/test-coach.cjs).
 *
 * The design follows one hard fact from the Presage model cards: breathing
 * rate and the breathing traces "do not work when talking". The camera needs a
 * still, silent subject to read the chest. So:
 *
 *   - breathing is only trusted while you are quiet, which is exactly when a
 *     resting baseline is worth having
 *   - while you talk, the reliable signal is visual speech detection, with
 *     pulse as a secondary (pulse is valid while talking, as long as you are
 *     stationary and lit)
 *   - the app therefore coaches the thing it can actually see: unbroken talk,
 *     and the pauses you did or did not take
 *
 * That constraint became the product. The camera cannot hear you run out of
 * air mid-sentence, so Green Room counts the silence instead, and measures your
 * breathing before and after the session, when the subject is still.
 *
 * Not a medical device. No diagnosis, no treatment, no health scoring.
 */

const DEFAULTS = Object.freeze({
  baselineMs: 30000,        // quiet window used to learn resting breathing
  minBaselineSamples: 6,    // confident breathing samples needed
  pauseToleranceMs: 700,    // shorter than this is still one stretch
  cueAfterMs: 25000,        // unbroken talk before a nudge is possible
  hardCueAfterMs: 40000,    // nudge regardless of pulse at this point
  pulseRiseBpm: 6,          // pulse rise that makes a nudge likely
  cueCooldownMs: 20000,
  pauseMinMs: 1200,         // a real pause, worth recording
  quietSampleMax: 120,      // rolling window of quiet breathing samples
});

function median(values) {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

const confident = (frame) => Number.isFinite(frame.br) && frame.br > 0 && (frame.brConfidence === undefined || frame.brConfidence > 0);

class Coach {
  constructor(options = {}) {
    this.opts = { ...DEFAULTS, ...options };

    this.startedAt = null;
    this.lastT = null;

    // quiet-only breathing samples, the only ones the model card supports
    this.baselineSamples = [];
    this.afterSamples = [];
    this.pulseQuietSamples = [];

    this.brBaseline = null;
    this.pulseBaseline = null;
    this.ready = false;

    this.streakStart = null;
    this.lastTalkAt = null;
    this.streakMs = 0;
    this.longestStreakMs = 0;
    this.talkMs = 0;

    this.pauseStart = null;
    this.pauses = [];

    this.lastCueAt = null;
    this.cues = 0;
    this.hasCoached = false;
  }

  /**
   * @param {{t:number, talking:boolean, br?:number|null, brConfidence?:number,
   *          pulse?:number|null, pulseConfidence?:number}} f
   * @returns {Array<object>} events
   */
  update(f) {
    if (f == null || typeof f.t !== 'number' || !Number.isFinite(f.t)) return [];
    if (this.startedAt === null) this.startedAt = f.t;
    if (this.lastT !== null && f.t <= this.lastT) return [];
    const dt = this.lastT === null ? 0 : f.t - this.lastT;
    this.lastT = f.t;

    const events = [];
    const elapsed = f.t - this.startedAt;
    const talking = f.talking === true;

    // ---- quiet-only signals ------------------------------------------------
    if (!talking) {
      if (confident(f)) {
        const bucket = this.hasCoached ? this.afterSamples : this.baselineSamples;
        bucket.push(f.br);
        if (bucket.length > this.opts.quietSampleMax) bucket.shift();
      }
      if (Number.isFinite(f.pulse) && f.pulse > 0) {
        this.pulseQuietSamples.push(f.pulse);
        if (this.pulseQuietSamples.length > this.opts.quietSampleMax) this.pulseQuietSamples.shift();
      }
    }

    if (!this.ready && elapsed >= this.opts.baselineMs && this.baselineSamples.length >= this.opts.minBaselineSamples) {
      this.brBaseline = median(this.baselineSamples);
      this.pulseBaseline = median(this.pulseQuietSamples);
      this.ready = true;
      events.push({ type: 'ready', brBaseline: this.brBaseline, pulseBaseline: this.pulseBaseline });
    }

    // ---- talk streaks ------------------------------------------------------
    if (talking) {
      if (this.pauseStart !== null) {
        const pauseMs = f.t - this.pauseStart;
        if (pauseMs >= this.opts.pauseMinMs) {
          this.pauses.push(pauseMs);
          events.push({ type: 'pause', ms: pauseMs });
        }
        this.pauseStart = null;
      }
      if (this.streakStart === null) this.streakStart = f.t;
      this.talkMs += dt;
      this.lastTalkAt = f.t;
    } else if (this.streakStart !== null && this.lastTalkAt !== null && f.t - this.lastTalkAt > this.opts.pauseToleranceMs) {
      const streak = this.lastTalkAt - this.streakStart;
      this.longestStreakMs = Math.max(this.longestStreakMs, streak);
      events.push({ type: 'streak_end', ms: streak });
      this.streakStart = null;
      // only a silence that follows real talking counts as a pause
      this.pauseStart = this.lastTalkAt;
    }

    const liveStreak = this.streakStart === null ? 0 : (this.lastTalkAt ?? f.t) - this.streakStart;
    this.streakMs = liveStreak;
    this.longestStreakMs = Math.max(this.longestStreakMs, liveStreak);

    const cue = this._cue(f, elapsed, liveStreak);
    if (cue) events.push(cue);

    return events;
  }

  _cue(f, elapsed, streakMs) {
    if (!this.ready || elapsed < this.opts.baselineMs) return null;
    if (streakMs < this.opts.cueAfterMs) return null;
    if (this.lastCueAt !== null && f.t - this.lastCueAt < this.opts.cueCooldownMs) return null;

    const hasPulse = Number.isFinite(f.pulse) && f.pulse > 0 && this.pulseBaseline !== null;
    const pulseRise = hasPulse ? f.pulse - this.pulseBaseline : null;
    const pulseIsUp = hasPulse && pulseRise >= this.opts.pulseRiseBpm;
    const tooLong = streakMs >= this.opts.hardCueAfterMs;

    if (!pulseIsUp && !tooLong) return null;

    this.lastCueAt = f.t;
    this.cues += 1;
    this.hasCoached = true;

    const span = Math.max(this.opts.hardCueAfterMs - this.opts.cueAfterMs, 1);
    const intensity = Math.max(0, Math.min(1, (streakMs - this.opts.cueAfterMs) / span));

    return {
      type: 'cue',
      reason: pulseIsUp ? 'pulse' : 'time',
      intensity,
      streakMs,
      pulseRise,
    };
  }

  stats() {
    const elapsed = this.startedAt === null || this.lastT === null ? 0 : this.lastT - this.startedAt;
    const brAfter = this.afterSamples.length >= 3 ? median(this.afterSamples) : null;
    return {
      elapsedMs: elapsed,
      talkMs: this.talkMs,
      talkFraction: elapsed > 0 ? this.talkMs / elapsed : 0,
      longestStreakMs: this.longestStreakMs,
      currentStreakMs: this.streakMs,
      cues: this.cues,
      pauses: this.pauses.length,
      avgPauseMs: this.pauses.length ? mean(this.pauses) : null,
      brBaseline: this.brBaseline,
      brAfter,
      brShift: brAfter !== null && this.brBaseline !== null ? brAfter - this.brBaseline : null,
      pulseBaseline: this.pulseBaseline,
      ready: this.ready,
    };
  }
}

module.exports = { Coach, DEFAULTS, median, mean };
