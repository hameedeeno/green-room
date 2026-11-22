'use strict';

/**
 * Preload. Two jobs:
 *
 *   1. require the SDK's own preload, which sets up the MessagePort bridge that
 *      @smartspectra/node-sdk/renderer needs. Doing it here means the app keeps
 *      a single preload entry point.
 *   2. expose the small, explicit surface this app adds: an API key presence
 *      check and a metrics decoder that runs in the main process.
 *
 * Nothing else is exposed to the page. No filesystem, no arbitrary IPC.
 */

require('@smartspectra/node-sdk/preload');

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('greenroom', {
  // Read here, in the preload, so the key never sits in a bundled file and
  // never reaches the repo. It is the user's own key on their own machine.
  apiKey: process.env.SMARTSPECTRA_API_KEY || '',
  decode: (buffer, tsUs) => ipcRenderer.invoke('greenroom:decode', buffer, tsUs),
  env: () => ipcRenderer.invoke('greenroom:env'),
});
