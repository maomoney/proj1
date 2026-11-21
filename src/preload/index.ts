// Preload runs in an isolated context between the main process and renderer.
// Expose only what the renderer actually needs via contextBridge.
// This app needs nothing from Node/Electron in the renderer, so it stays empty.
import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('electron', {});
