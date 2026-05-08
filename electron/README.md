A minimal Electron main + preload implementation that enables native drag-and-drop support and secure token storage for the Copilots desktop app.

How this is wired
- preload.js exposes a small API on window.electronAPI with methods: readFiles, storeToken, getToken, commitFiles, showOpenDialog
- main.js implements filesystem reading, recursive directory walking, token storage via keytar (fallback to token.json in app userData), and GitHub commit logic using node's fetch.

Dev flow
1. In one terminal: cd gui && npm install && npm run dev
2. In another terminal (repo root): cd electron && npm install && npm run dev

Build flow
1. cd gui && npm run build
2. cd electron && npm install && npm run build

Security notes
- Tokens are stored in the OS credential store (keytar) when possible. The app falls back to a token.json file in the app userData directory if keytar is unavailable.
- The renderer process has contextIsolation enabled and no nodeIntegration; the only native surface is the small electronAPI exposed in the preload.
