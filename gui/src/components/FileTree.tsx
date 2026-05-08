import React, { useEffect, useState } from 'react'
import { listContents } from '../api/githubClient'

type Props = {
  owner: string
  repo: string
  token: string
  onSelectPath: (path: string) => void
}

export default function FileTree({ owner, repo, token, onSelectPath }: Props) {
  const [path, setPath] = useState('')
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    listContents(owner, repo, path, token)
      .then(list => setItems(list))
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [owner, repo, path, token])

  return (
    <div>
      <div className="path-controls">
        <button onClick={() => setPath('')}>/ (root)</button>
        <input value={path} onChange={e => setPath(e.target.value)} placeholder="path (empty = root)" />
      </div>
      {loading && <div>Loading...</div>}
      {error && <div className="error">{error}</div>}
      <ul className="filelist">
        {items.map(item => (
          <li key={item.path} className={item.type}>
            {item.type === 'dir' ? '📁' : '📄'}
            <button className="link" onClick={() => item.type === 'dir' ? setPath(item.path) : onSelectPath(item.path)}>
              {item.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
