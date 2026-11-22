# Skip Electron entirely

If the window will not start, you do not need it. Electron is only a shell around the app. The Presage SDK does not care whether there is a window: it opens the camera, computes signals, and hands you the metrics. So there is a second entry point that runs in plain Node and shows the session in your normal browser.

Same SDK. Same coaching logic. Same session summary. No Electron, no bundler, no browser camera permissions, no install of a 100 MB binary.

## Run it

```powershell
cd C:\dev\green-room
npm run headless
```

That is it. You should see:

```
  Green Room, headless
  dashboard: http://localhost:8787
  summary:   http://localhost:8787/summary
  camera is on. sit still and stay quiet for 30s to learn your baseline.
```

Open http://localhost:8787 in your browser for the live view, and leave PowerShell open to watch the session print as it runs.

## What you get

- **The dashboard** in your browser: breathing rate, pulse, baseline, a talking indicator, the unbroken-talk ribbon, and the full-screen **Breathe** cue.
- **The terminal**: a live line you can watch, plus a printed `>>> BREATHE` when a cue fires, and a session summary when you press Ctrl+C.
- **`/summary`**: the same numbers as JSON, for the post.

Everything the challenge asks for is present: the SDK is integrated, live signals are driving an experience, and the response is real time.

## The session, in the right order

1. Sit still and say nothing for 30 seconds. The dashboard shows numbers filling in and `baseline --`. That is normal.
2. When the terminal prints `baseline learned: 14.2 br/min`, coaching has started.
3. Talk out loud without stopping. The talking cell turns to `yes` and the ribbon fills.
4. At 25 seconds of unbroken talk, if your pulse has risen, the screen goes dim and says **Breathe**. At 40 seconds it cues regardless.
5. Stop, breathe out, talk again. The terminal prints `pause: 4.1s of air`.
6. Sit quietly for a few seconds, then press **Ctrl+C** for the summary.

## Recording the demo with this

This is a legitimate demo surface and it is arguably clearer than the app window:

- OBS: **Display Capture** of the browser dashboard, plus **Video Capture Device** of your webcam in the corner.
- Both start on the same screen, so judges see you talking and the dashboard responding in one frame.
- The terminal line is worth including for two seconds: it shows the raw numbers and the pause log, which reads as engineering rather than a mockup.

If you demo this way, say so plainly in the post: the repo ships an Electron app and a headless runner, and you used the runner because it is one command. Judges reward that kind of honesty and it is a stronger story than pretending you used the window.

## Before you blame the code: the five usual window failures

| Symptom | Usual cause | Fix |
|---|---|---|
| `npm install` fails with a script or permission error | PowerShell execution policy | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, then retry |
| `npm install` finishes but `npm start` says Electron is missing | The Electron binary download was blocked, often by antivirus or a proxy | `npx electron --version` to retry it, or set `ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/` and reinstall, or just use this headless route |
| Window opens pure white and stays white | The renderer bundle was not built | `npm run build`, then `npm start`. The bundle must exist at `dist\renderer.js` |
| Window opens, then closes immediately | A crash in the main process | Run `npx electron . > log.txt 2>&1` and read `log.txt`. The first stack trace is the answer |
| Consent screen shows `No API key found` | `.env` missing or misnamed | File must be `C:\dev\green-room\.env`, not `.env.txt`, and the line must be `SMARTSPECTRA_API_KEY=...` with no quotes or spaces |

## If you do want the window working later

Send me the exact text of the error, or the contents of `log.txt`. Every one of these is fixable, and the app is worth having in the repo either way because it is what most people will run. But do not let it block the submission: the deadline does not care which shell you demoed.
