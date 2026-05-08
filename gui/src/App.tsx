import React, { useState } from 'react'
import FileTree from './components/FileTree'
import FileViewer from './components/FileViewer'
import DropArea from './components/DropArea'

const DEFAULT_OWNER = 'geemayergcopilotbot-cpu'
const DEFAULT_REPO = 'copilots'

export default function App() {
  const [owner, setOwner] = useState(DEFAULT_OWNER)
  const [repo, setRepo] = useState(DEFAULT_REPO)
  const [token, setToken] = useState('')
  const [selectedPath, setSelectedPath] = useState<string | null>(null)

  return (
    <div className="app">
      <header className="header">
        <div>
          <label>Owner: <input value={owner} onChange={e => setOwner(e.target.value)} /></label>
          <label>Repo: <input value={repo} onChange={e => setRepo(e.target.value)} /></label>
        </div>
        <div>
          <label>GitHub PAT: <input value={token} onChange={e => setToken(e.target.value)} placeholder="paste token (scopes: repo)" /></label>
        </div>
      </header>

      <main className="main">
        <aside className="sidebar">
          <FileTree owner={owner} repo={repo} token={token} onSelectPath={p => setSelectedPath(p)} />
        </aside>
        <section className="content">
          <DropArea owner={owner} repo={repo} token={token} />
          {selectedPath ? (
            <FileViewer owner={owner} repo={repo} token={token} path={selectedPath} />
          ) : (
            <div className="placeholder">Select a file from the tree to view or edit</div>
          )}
        </section>
      </main>
    </div>
  )
}
