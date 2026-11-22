'use strict';

/**
 * Green Room: Electron main process.
 *
 * Responsibilities, deliberately small:
 *   1. load .env so the API key never reaches a bundle or the repo
 *   2. create the window and wire the SmartSpectra IPC bridge
 *   3. decode the SDK's protobuf metrics packets into plain JSON for the UI
 *
 * All metric computation happens inside the SDK, on this machine. The only
 * network traffic is the SDK's API key check and subscription validation.
 */

const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

// --- .env ------------------------------------------------------------------
// Five lines of parsing instead of a dependency.
function loadEnv() {
  const file = path.join(__dirname, '..', '.env');
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

const { bindSmartSpectraIpc } = require('@smartspectra/node-sdk/main');
const { decodeMetrics } = require('@smartspectra/node-sdk');

// --- metric decoding -------------------------------------------------------
// One shared definition of a frame, so the Electron app and the headless
// runner can never drift apart.
const { toFrame } = require('../src/frame.cjs');

ipcMain.handle('greenroom:decode', (_event, buffer, tsUs) => {
  try {
    return toFrame(decodeMetrics(Buffer.from(buffer)), tsUs);
  } catch (err) {
    return { error: String(err && err.message ? err.message : err), tsUs: Number(tsUs) || null };
  }
});

ipcMain.handle('greenroom:env', () => ({
  hasApiKey: Boolean(process.env.SMARTSPECTRA_API_KEY),
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  },
}));

// --- window ----------------------------------------------------------------
function createWindow() {
  const win = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 940,
    minHeight: 640,
    backgroundColor: '#0b0d10',
    title: 'Green Room',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // The SDK's renderer bridge. One call per window that hosts a renderer
  // using @smartspectra/node-sdk/renderer.
  bindSmartSpectraIpc(win);

  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url);
    return { action: 'deny' };
  });

  return win;
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
