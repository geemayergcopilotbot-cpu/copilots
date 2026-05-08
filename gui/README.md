# Copilots GUI

This is a minimal Vite + React + TypeScript GUI scaffold to browse, view, and edit files in the repository.

Run locally:

1. cd gui
2. npm install
3. npm run dev

Usage:

- Enter GitHub owner and repo (defaults to this repository).
- Paste a Personal Access Token (PAT) with `repo` scope to enable file commits.
- Browse files in the left pane, click a file to view/edit, update the commit message and click "Commit changes" to push.

Notes and limitations:

- This is a minimal proof-of-concept UI. It performs GitHub REST API calls directly from the browser (so your PAT is used client-side). For production, set up a backend or OAuth flow.
- Binary files are not handled specially. Use with text files.
