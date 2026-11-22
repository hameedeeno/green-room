# Windows setup, start to finish

Written for your machine: Windows x64, no writing required, just copy and paste. Total time about 20 minutes, most of it downloads.

---

## Step 1: install Node.js

1. Go to https://nodejs.org and download the **LTS** installer (24.x or newer). Electron 45 needs Node 22+, so 24 is the safe choice.
2. Run the installer, click Next through everything, keep "Add to PATH" ticked.
3. Open **PowerShell** (Start menu, type PowerShell) and check:

```powershell
node -v
npm -v
```

You should see `v24.x.x` and a version number. If you see "not recognized", close PowerShell, open it again, and retry.

## Step 2: one PowerShell setting that breaks npm on many Windows machines

If `npm` gives you an error about scripts being disabled, run this once:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Then confirm with `Y`. This is the single most common reason `npm install` fails on Windows.

## Step 3: put the project somewhere plain

Avoid OneDrive, Desktop, and any path with spaces. Use:

```powershell
mkdir C:\dev -Force
cd C:\dev
```

Copy the `green-room` folder from this workspace into `C:\dev\green-room`. Then:

```powershell
cd C:\dev\green-room
npm install
```

This downloads Electron (around 100 MB) and the Presage SDK with its native runtime. Give it a few minutes. When it finishes you should see something like `added 30 packages`.

If Electron's binary did not download, run `npx electron --version`. If it prints a version, you are fine.

## Step 4: get your Presage API key

This is the part that needs a human, and it takes about two minutes.

1. Open https://physiology.presagetech.com/auth/register
2. Fill the form. Required: first name, last name, email, password, country, and the two agreement checkboxes. Password rules are strict: **at least 12 characters with an uppercase letter, a lowercase letter, a number and a symbol**. A phrase plus a number and a `!` works.
3. Submit, then check your email to verify the account if it asks. Check spam.
4. Log in at https://physiology.presagetech.com/auth/login
5. Once you are on the developer home, find the **API key** for your account or project. It is a long string. The wording on the page may differ slightly; you are looking for the section that shows or lets you copy your key.
6. If the portal offers plan or usage options, the free tier is enough for this project.

Keep the key out of screenshots and out of the video. If you ever show your `.env` on screen, blur it.

## Step 5: put the key in the app

In PowerShell:

```powershell
cd C:\dev\green-room
Copy-Item .env.example .env
notepad .env
```

Notepad opens. Replace `your_key_here` with your key so the line reads:

```
SMARTSPECTRA_API_KEY=eyJhbGciOi....your.actual.key
```

Save with Ctrl+S, close Notepad. Do not add quotation marks and do not add spaces around the `=`.

## Step 6: turn on camera access for desktop apps

Windows blocks desktop apps from the camera by default on some machines.

Settings, Privacy and security, Camera: turn **Camera access** on, and turn **Let desktop apps access your camera** on.

## Step 7: run it

```powershell
cd C:\dev\green-room
npm start
```

What should happen: the window opens on a consent screen. Tick the box, press **Turn on the camera**, and you should see yourself within a couple of seconds with a hint strip at the bottom of the preview.

The hint strip is your guide. It should reach **good to go**. If it says `add some light in front of you`, that is the fix: light your face, not the wall behind you.

## Step 8: the first session, in the right order

1. Tick consent, start the camera.
2. **Sit still and say nothing for 30 seconds.** This is the baseline. Nothing will happen on screen except numbers filling in. That is correct.
3. After about 30 seconds the status changes to `coaching` and the baseline line appears under the numbers.
4. Now talk, out loud, without stopping. Read something. The talking badge lights up and the ribbon fills.
5. At 25 seconds of unbroken talk, if your pulse has risen 6 bpm, the screen dims and says **Breathe**. If not, keep going: at 40 seconds it nudges you anyway.
6. Stop and breathe out, then start talking again. You will see `4.1s of air`.
7. Sit quietly for 5 seconds, then press **End session**. The summary shows longest stretch, resting breathing before and after, cues, and pauses.

## If something is wrong

| What you see | What it means |
|---|---|
| `No API key found` on the consent screen | `.env` is missing, misnamed, or has the key on the wrong line. It must be `C:\dev\green-room\.env`, not `.env.txt`. |
| `The API key was rejected` | Copy the key again from the portal. No spaces, no quotes. |
| `No camera found, or another app is holding it` | Close Teams, Zoom, and the Camera app, then press End session and start again. |
| `No credits left for this key` | You have used the free tier. |
| Hint strip says `too much backlight` | Turn around so the light is behind the camera, not behind you. |
| Numbers fill in but baseline stays `--` | You are talking during the baseline, or the breathing confidence is not clearing. Stay still and silent. |
| No cue, ever | You are pausing inside 25 seconds. Read a longer paragraph in one go. |
| Window opens blank or white | Run `npm run build` on its own, then `npm start` again. |

## Step 9: put the code on GitHub (required by the challenge)

The challenge requires a public code repository with setup instructions, and judges will read it to confirm the SDK integration.

1. Install Git for Windows from https://git-scm.com/download/win if you do not have it.
2. Create an empty **public** repo on GitHub called `green-room`. Do not add a README, the project already has one.
3. In PowerShell:

```powershell
cd C:\dev\green-room
git init
git add .
git commit -m "Green Room: a breath coach for people who talk for a living"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/green-room.git
git push -u origin main
```

`.gitignore` already excludes `node_modules`, `dist` and `.env`, so your key cannot be pushed. Check the repo page afterwards and confirm there is no `.env` file listed.

## Before you record the video

Read `DEMO_SCRIPT.md`. Then do one throwaway session to confirm the pipeline works and to find your own baseline number, and only then record. The baseline needs 30 clean seconds, and the first take is always you fidgeting.
