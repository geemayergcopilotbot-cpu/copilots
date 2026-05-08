import React, { useState } from 'react'

declare global {
  interface Window {
    electronAPI?: {
      readFiles: (paths: string[]) => Promise<any[]>
      storeToken: (token: string) => Promise<any>
      getToken: () => Promise<any>
      commitFiles: (payload: any) => Promise<any>
      showOpenDialog: (opts: any) => Promise<any>
    }
  }
}

type DroppedFile = {
  path: string
  name: string
  size: number
  isBinary: boolean
  content?: string | null
}

type Props = {
  owner: string
  repo: string
  token: string
}

export default function DropArea({ owner, repo, token }: Props) {
  const [dropped, setDropped] = useState<DroppedFile[]>([])
  const [status, setStatus] = useState<string | null>(null)

  function onDragOver(e: React.DragEvent) {
    e.preventDefault()
  }
  async function onDrop(e: React.DragEvent) {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    const paths = files.map(f => (f as any).path).filter(Boolean)
    if (paths.length === 0) return
    setStatus('Reading files...')
    try {
      const res = await window.electronAPI?.readFiles(paths)
      setDropped(res || [])
      setStatus(null)
    } catch (err) {
      setStatus(String(err))
    }
  }

  async function onCommit() {
    if (!dropped.length) return
    const branch = prompt('Target branch (default: main)', 'main') || 'main'
    const message = prompt('Commit message', `Add ${dropped.length} files via Copilots Desktop`) || `Add ${dropped.length} files via Copilots Desktop`
    setStatus('Committing...')
    try {
      const resp = await window.electronAPI?.commitFiles({ owner, repo, branch, message, files: dropped, token })
      setStatus('Commit result: ' + JSON.stringify(resp))
    } catch (e) {
      setStatus('Commit error: ' + String(e))
    }
  }

  async function onChooseFiles() {
    try {
      const res = await window.electronAPI?.showOpenDialog({ properties: ['openFile', 'openDirectory', 'multiSelections'] })
      if (res && res.filePaths && res.filePaths.length) {
        const out = await window.electronAPI?.readFiles(res.filePaths)
        setDropped(out || [])
      }
    } catch (e) {
      setStatus(String(e))
    }
  }

  return (
    <div className="dropzone" onDragOver={onDragOver} onDrop={onDrop}>
      <div style={{ padding: 12 }}>
        <div style={{ marginBottom: 8 }}>Drop files or folders anywhere on this area to prepare them for commit.</div>
        <div style={{ marginBottom: 8 }}>
          <button onClick={onChooseFiles}>Choose files</button>
          <button onClick={onCommit} style={{ marginLeft: 8 }} disabled={!dropped.length}>Commit dropped files</button>
        </div>
        <div>
          <strong>Dropped files:</strong>
          <ul>
            {dropped.map(f => (
              <li key={f.path}>{f.name} {f.isBinary ? '(binary - skipped)' : `(${f.size} bytes)`}</li>
            ))}
          </ul>
        </div>
        {status && <div className="status">{status}</div>}
      </div>
    </div>
  )
}
