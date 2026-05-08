import React, { useEffect, useState } from 'react'
import { getContent, updateFile } from '../api/githubClient'

type Props = {
  owner: string
  repo: string
  token: string
  path: string
}

export default function FileViewer({ owner, repo, token, path }: Props) {
  const [content, setContent] = useState('')
  const [sha, setSha] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    getContent(owner, repo, path, token)
      .then(r => {
        setContent(r.content)
        setSha(r.sha)
      })
      .catch(e => setStatus(String(e)))
      .finally(() => setLoading(false))
  }, [owner, repo, path, token])

  async function onSave() {
    if (!sha) {
      setStatus('Missing SHA for file')
      return
    }
    try {
      setStatus('Saving...')
      await updateFile(owner, repo, path, content, sha, message || 'Update from GUI', token)
      setStatus('Saved')
    } catch (e) {
      setStatus(String(e))
    }
  }

  if (loading) return <div>Loading file...</div>

  return (
    <div>
      <h3>{path}</h3>
      <textarea className="editor" value={content} onChange={e => setContent(e.target.value)} />
      <div className="commit-row">
        <input placeholder="commit message" value={message} onChange={e => setMessage(e.target.value)} />
        <button onClick={onSave}>Commit changes</button>
      </div>
      {status && <div className="status">{status}</div>}
    </div>
  )
}
