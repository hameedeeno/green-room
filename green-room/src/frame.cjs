'use strict';

/**
 * Turn a decoded SmartSpectra protobuf Metrics packet into the small plain
 * object the UI and the coaching logic both work with.
 *
 * Shared by the Electron app (electron/main.cjs) and the headless runner
 * (runner.cjs) so there is exactly one definition of "a frame".
 */

const last = (arr) => (Array.isArray(arr) && arr.length ? arr[arr.length - 1] : null);
const num = (v) =>
  typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'bigint' ? Number(v) : null;

function toFrame(metrics, tsUs) {
  const m = metrics || {};
  const rate = last(m.breathing && m.breathing.rate);
  const chest = last(m.breathing && m.breathing.upperTrace);
  const abdomen = last(m.breathing && m.breathing.lowerTrace);
  const pulse = last(m.cardio && m.cardio.pulseRate);
  const hrv = last(m.cardio && m.cardio.hrv);
  const talking = last(m.face && m.face.talking);
  const blinking = last(m.face && m.face.blinking);

  return {
    tsUs: Number(tsUs) || null,
    br: num(rate && rate.value),
    brConfidence: num(rate && rate.confidence),
    brStable: Boolean(rate && rate.stable),
    chest: num(chest && chest.value),
    abdomen: num(abdomen && abdomen.value),
    pulse: num(pulse && pulse.value),
    pulseConfidence: num(pulse && pulse.confidence),
    hrv: hrv
      ? {
          rmssd: num(hrv.rmssd),
          meanNn: num(hrv.meanNn),
          sdnn: num(hrv.sdnn),
          baevsky: num(hrv.baevsky),
          confidence: num(hrv.confidence),
        }
      : null,
    talking: Boolean(talking && talking.detected),
    blinking: Boolean(blinking && blinking.detected),
  };
}

module.exports = { toFrame };
