# Start here (complete beginner version)

No experience needed. If you can install a game and download a file, you can do this. Read one step, do it, then read the next. Do not skip ahead.

**What we are making:** a small app that watches you through your webcam. It learns how fast you breathe while you are resting, then counts how long you talk without stopping, and when you have gone too long without a pause it dims the screen and shows one word: **Breathe**. No microphone, nothing recorded.

**Time:** about 30 minutes, most of it waiting for downloads.

**You need:** a Windows laptop or PC with a webcam, internet, and this folder.

---

## Words you will see, explained once

- **Terminal, PowerShell, command prompt:** a black window where you type commands. You will barely need it, because I made double-click files that do the typing for you.
- **npm:** a program that comes with Node. It downloads pieces of code other people wrote, like the Presage library.
- **Node.js:** the engine that runs this app. It is a normal free install, like installing Chrome.
- **API key:** a long password that proves to Presage that you are allowed to use their library. They give it to you free.

---

## Step 1: get the files out of the zip

Read this part carefully. It is where most people get stuck, and it explains every strange thing you have seen so far.

Windows lets you **look inside** a zip file without unpacking it. If you double-click files while you are looking inside, Windows unpacks them to a temporary folder that gets wiped. The symptoms are always confusing: the settings file is "missing", installs vanish, and black windows close and dump you back to the folder.

**How to tell you are inside the zip:** a tab called **Extract** shows at the top of the window, or the address bar ends in `.zip`, or it contains the word `Temp`. If you see any of those, close the window and start again below.

1. Download **green-room.zip** from this workspace, into your **Downloads** folder.
2. Open Downloads. Right-click `green-room.zip`, choose **Extract All…**
3. In the box, type `C:\dev` and click **Extract**. Tick **Show extracted files when complete**.
4. Windows opens one folder called `green-room`. Open it. You should now see `1-SETUP.cmd`, `2-RUN.cmd`, `runner.cjs` and the rest, sitting directly in that folder.
5. Check the address bar reads `C:\dev\green-room` with no `.zip` and no `Temp` in it.

If the folder you open contains only **one other green-room folder** and no `.cmd` files, you are one step short. Double-click that inner folder and the `.cmd` files are there. That nesting came from an older copy of the zip, which is why there is now a fresh download.

That is checkpoint one. If you can see `1-SETUP.cmd` and the address bar is clean, nothing you do here can vanish.

---

## Step 2: install Node.js

1. Go to **https://nodejs.org**
2. Click the big green button that says **LTS**. It downloads a `.msi` file.
3. Double-click it. Click **Next** through every screen, accept the license, click **Install**, then **Finish**.
4. If Windows asks "do you want to allow this app to make changes", click **Yes**.

That is it. You do not need to type anything.

---

## Step 3: run the setup file

1. Open your green-room folder (the inner one you just checked)
2. Double-click **1-SETUP.cmd**
3. A black window appears and starts working.

What you will see, and what it means:

| You see | Meaning |
|---|---|
| `Node.js is installed. Good.` plus a version like `v24.11.0` | Perfect, continue |
| Yellow `warn` lines | Normal, ignore them |
| `Node.js is not installed yet` | Go back to step 2, then run this file again |
| Red text, then it stops and mentions an error | Double-click **FIX-WINDOWS-BLOCK.cmd**, then run **1-SETUP.cmd** again |

Wait for it to finish downloading. It may take two or three minutes. When it says **Almost done**, press any key, and Notepad will open with a file called `.env`.

**Leave that Notepad window open.** You need a key to paste into it, and that is the next step.

---

## Step 4: get your free API key

Do this in your browser while Notepad waits.

1. Go to **https://physiology.presagetech.com/auth/register**
2. Fill the form:
   - **First name** and **Last name**: anything, your own name
   - **Company** and **Job title**: leave blank, they are not required
   - **Email address**: use one you can open right now
   - **Phone number**: leave blank
   - **Country**: pick yours from the long list
   - **University affiliation**: leave blank
   - **Password**: this part has rules and people get stuck here. It must be **at least 12 characters** and contain **an uppercase letter, a lowercase letter, a number and a symbol**. Example: `GreenRoom2026!` would not be long enough, but `GreenRoomIs2026!` is. Write it down.
   - Tick **both** boxes (Terms of Service, Privacy Policy)
3. Click **Submit**
4. If it asks you to confirm your email, open that email and click the link. Check the spam folder.
5. Log in at **https://physiology.presagetech.com/auth/login**
6. Once you are in, find the **API key** for your account. It is a very long string of letters, numbers, dots and dashes. Use the copy button so you do not miss a character.

Keep it private. Do not screenshot it, do not show it in the video.

---

## Step 5: put the key in the settings file

Notepad may have opened during setup with a message saying it cannot find the `.env` file. That is harmless. Click **No** and close it, because there is a more reliable way:

1. Double-click **4-KEY.cmd**
2. It creates the settings file and opens it in Notepad
3. Paste your key straight after `SMARTSPECTRA_API_KEY=`, all on **one line**
4. No quotation marks, no spaces, nothing before or after the key
5. Press **Ctrl+S**, then close Notepad
6. The black window will now say either **Looks good. Your key is saved.** or tell you exactly what is wrong

You can run **4-KEY.cmd** as many times as you like. It never harms anything, and it is the place to go if the key ever stops working.

---

## Step 6: prove it worked (10 seconds)

1. Double-click **3-CHECK.cmd**
2. You should see nine lines starting with `ok` and then **9/9 passing**

That means the app is installed correctly. If you see that, nothing below can be a broken install. It only leaves the key and the camera.

---

## Step 7: start it

1. Double-click **2-RUN.cmd**
2. A black window opens and says the camera is on
3. Your browser opens at **http://localhost:8787** and shows the dashboard

If the browser does not open by itself, open it yourself and type `localhost:8787` in the address bar.

Windows may ask permission for the camera. Click **Allow**. If it does not ask and you get an error, go to **Settings, Privacy and security, Camera**, and turn on both **Camera access** and **Let desktop apps access your camera**.

---

## Step 8: your first session, in the right order

This order matters. Breathing can only be measured when you are still and quiet, which is why the app is silent at the start.

1. **Sit still and say nothing for 30 seconds.** The dashboard will show numbers appearing and `baseline --`. That is normal, it is learning.
2. When the black window prints `baseline learned: 14.2 br/min`, coaching has started. (Your number will differ. Anything around 10 to 20 is normal.)
3. **Now talk out loud, and do not stop.** Read a paragraph out loud. The `talking` cell turns to `yes` and the bar fills up.
4. At 25 seconds of unbroken talk, if your pulse has risen, the screen dims and says **Breathe**. If it does not fire, keep talking: at 40 seconds it will.
5. **Stop talking and breathe out**, then start again. The window prints `pause: 4.1s of air`.
6. Sit quietly for five seconds, then press **Ctrl+C** in the black window. It prints your session summary: how long you talked, longest stretch, cues, pauses, and breathing before and after.

Do this once as a practice run. Nobody gets it right the first time, usually because they said something during the 30 seconds.

---

## Step 9: record the video (this is required)

You said you can record but not write. Recording is the only part I cannot do for you.

1. Install **OBS Studio** from https://obsproject.com, it is free
2. In OBS, add two sources: **Display Capture** (your screen, with the dashboard) and **Video Capture Device** (your webcam, small in a corner)
3. Follow the shot list in **DEMO_SCRIPT.md**. It has the exact words to say and the timings.
4. Upload the recording to YouTube as **Unlisted** and copy the link

Keep it under two minutes. One take is better than cuts.

---

## Step 10: publish

Send me three things and I will finish the post for you:

1. The YouTube link
2. Your GitHub link (the guide for putting the code online is step 9 in `WINDOWS_SETUP.md`, or ask me and I will walk you through it)
3. Your baseline number and longest stretch, from the session summary

Then I will fill the post in with your real numbers and you paste it into dev.to.

---

## When something goes wrong

You do not need to understand the error. Do this instead: take a photo of the black window showing the red text, and send it. The red line is always the answer.

The common ones, in plain language:

| What happened | What it means | What to do |
|---|---|---|
| Double-clicking `1-SETUP.cmd` opens and closes instantly | Windows is blocking scripts | Double-click **FIX-WINDOWS-BLOCK.cmd** first |
| `Node.js is not installed yet` | Step 2 was skipped or the window was open during install | Close all black windows, then run 1-SETUP.cmd again |
| `No API key found` | The `.env` file is missing or the key is on the wrong line | Open the folder, check for a file called exactly `.env`, not `.env.txt` |
| `The API key was rejected` | Key copied wrong, usually a missing character | Copy it again from the website using the copy button |
| `No camera found, or another app is holding it` | Zoom, Teams or the Camera app is using the camera | Close them, then run 2-RUN.cmd again |
| Dashboard opens but `baseline --` never changes | You are talking or moving during the first 30 seconds | Sit still and stay completely silent |
| `Breathe` never appears | You paused before 25 seconds, which resets the bar | Read a longer paragraph without stopping |
| The web address does not load | The black window closed | Run 2-RUN.cmd again and leave the black window open |

---

## One last thing

The deadline is **22 November**. The parts that can go wrong for a beginner are install and camera permission, and both are fixable in minutes. If you are stuck for more than ten minutes on any single step, stop and send me a photo of the screen rather than guessing. Do not reinstall Windows, do not buy anything, and do not start over from scratch: there is nothing here a fresh download fixes.
