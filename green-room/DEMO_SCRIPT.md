# Demo video: shot list

**If the live SDK path works on your machine, use the version below.** If it does not, use the demo-mode version at the bottom of this file, and say out loud in the video that the signal is scripted.

Target length: **90 seconds** (the 30 second baseline is part of the story, so do not fight it; speed up the silent stretch in the edit if you want to land at 75).

Record at 1080p: screen capture plus your webcam in a corner, so judges can see you talking and the app responding in the same frame. One take is better than cuts, because the point is that this is live.

## Before you hit record

1. Windows: OBS with **Display Capture** plus a **Video Capture Device** scene in the corner. QuickTime is not available, so OBS is the tool.
2. Window on a plain background. Turn on Do Not Disturb so no notification pops into the recording.
3. Light in front of you, not behind. Get the hint strip to say **good to go** before recording.
4. Sit an arm's length back so your chest is in frame. Against a dark top, plain background.
5. Have a paragraph ready to read out loud. You need about 30 seconds of continuous speech without stopping.
6. Keep the two badges in frame the whole time: **no microphone** and **records nothing**.

## The 90 seconds

| Time | On screen | Say this |
|---|---|---|
| 0:00 to 0:10 | Consent screen. Tick the checkbox. | "Green Room is a breath coach for people who talk for a living. Camera only, no microphone, and here is the consent gate." |
| 0:10 to 0:20 | Session view live. Hint strip green, both badges visible. | "It stays silent for the first 30 seconds. That is deliberate: the SDK can only read breathing when you are still and quiet, so a silent baseline is the only honest way to get one." |
| 0:20 to 0:34 | Numbers populate. Breathing ring moves. Baseline appears. | "Resting baseline, 14 breaths a minute. From here it stops measuring breathing and starts counting the thing it can actually see." |
| 0:34 to 1:02 | Start reading. Talking badge lights up. Ribbon fills. Do not pause. | "Now I talk, and I do not stop. Watch the ribbon. Mic badge, still nothing. It knows I am talking because it can see my mouth." |
| 1:02 to 1:10 | Screen dims: **Breathe**, with "pulse is up 7 bpm and you have not paused" | "There it is. One word, and a reason, and no graph." |
| 1:10 to 1:20 | Stop talking. Breathe out. Start again: **4.1s of air** appears. | "When I do stop, it tells me how much air I took, and how long the stretch was." |
| 1:20 to 1:30 | Sit quietly 5 seconds, then End session. Summary card: longest stretch, resting br start to end, cues, pauses. | "One quiet pause at the end gives a second resting reading, so the summary can show breathing before and after. Numbers only, no video, no audio." |

## The four moments judges need to see

1. **The mic badge untouched while the talking badge lights up.** This is the idea. Hold the frame for two seconds, do not talk over it.
2. **The cue firing.** Leave the dim up long enough to read both lines.
3. **The baseline explanation.** Saying out loud that breathing cannot be read while talking is the single strongest thing you can put in this video. It proves you read the model cards, which is exactly what the sponsor is judging.
4. **The consent screen and the before/after summary.** Half the submissions will describe privacy in text only. Showing it is free credit.

## If something goes wrong

- **No baseline after 35 seconds.** Your breathing confidence is not clearing. You moved, or the light is behind you, or you are talking during the baseline. Sit still and stay silent.
- **Cue never fires.** You paused inside the 25 seconds, which resets the ribbon, or your pulse stayed flat. Keep reading, and watch the ribbon rather than the clock. Past 40 seconds of talk it nudges you anyway.
- **Breathing number looks wrong or blank while talking.** That is correct behaviour, and worth pointing at in the video instead of hiding.
- **Camera shows nothing.** Windows: Settings, Privacy and security, Camera, and make sure both camera access and desktop app access are on.

## Still frames worth grabbing for the post

- Consent screen, checkbox ticked.
- Session mid-cue: dimmed, **Breathe**, both badges, ribbon near full.
- Summary card with real before-and-after breathing numbers.
- A screenshot of the `enableTelemetry: false` line beside the metric request, if you want the privacy claim to be visual rather than a sentence.


---

## Demo-mode version (when the live signal is unavailable)

Run `5-DEMO.cmd` instead of `2-RUN.cmd`. It plays a scripted speaker through the same coaching code: 30 seconds of quiet baseline, then continuous talking, a real pause, and the cue. No camera, no key, no SDK.

Be straight about it in the video. One sentence is enough, and it buys credibility rather than costing it: **"The live signal is blocked on my machine by a vendor SDK issue I describe below, so this is the coaching loop running on a scripted signal through the identical code."**

| Time | On screen | Say this |
|---|---|---|
| 0:00 to 0:10 | Consent screen, then the dashboard | "Green Room is a breath coach for people who talk for a living. Camera only, no microphone, and it records nothing." |
| 0:10 to 0:20 | Two badges: `no microphone`, `records nothing` | "Those two badges are the whole design. Nothing leaves the machine, and there is no audio path at all." |
| 0:20 to 0:35 | Baseline card goes from `--` to a number | "The first 30 seconds are silent on purpose. The SDK can only read breathing in quiet windows, so it learns what my resting breathing is before I say a word." |
| 0:35 to 1:05 | Talking goes to yes, the ribbon fills, `>>> BREATHE` fires | "Now the scripted speaker talks without stopping. The ribbon fills. And it cues: pulse is up 9 bpm and there has been no pause." |
| 1:05 to 1:20 | A pause is recorded, `1.5s of air` in the terminal | "The pause gets measured, not just noticed. That number is the thing a speaker never sees about themselves." |
| 1:20 to 1:35 | Ctrl+C, session summary | "Sixty seconds of talking, one cue, a 1.5 second pause, and breathing after the session." |
| 1:35 to 1:50 | `npm test`, 9/9 passing | "The coaching logic does not care where the numbers come from, which is why it is tested separately from the camera, and why these nine tests still mean something on a machine where the vendor step fails." |

Keep it under two minutes. The honesty in that last shot is the part judges will remember.
