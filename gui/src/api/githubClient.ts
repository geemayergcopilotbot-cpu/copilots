// Minimal GitHub client used by the GUI (browser-side). Provide a PAT with repo scope to enable write operations.

export async function listContents(owner: string, repo: string, path: string, token: string) {
  const apiPath = path ? `contents/${encodeURIComponent(path)}` : 'contents'
  const url = `https://api.github.com/repos/${owner}/${repo}/${apiPath}`
  const res = await fetch(url + '?per_page=200', {
    headers: token ? { Authorization: `token ${token}` } : undefined
  })
  if (!res.ok) throw new Error(`Failed to list contents: ${res.status} ${res.statusText}`)
  const json = await res.json()
  if (!Array.isArray(json)) {
    // when path points to a file, GitHub returns an object
    return [json]
  }
  return json.map((item: any) => ({ name: item.name, path: item.path, type: item.type }))
}

export async function getContent(owner: string, repo: string, path: string, token: string) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`
  const res = await fetch(url, {
    headers: token ? { Authorization: `token ${token}` } : undefined
  })
  if (!res.ok) throw new Error(`Failed to get content: ${res.status} ${res.statusText}`)
  const json = await res.json()
  // content is base64
  const decoded = decodeBase64(json.content || '')
  return { content: decoded, sha: json.sha }
}

export async function updateFile(owner: string, repo: string, path: string, content: string, sha: string, message: string, token: string) {
  if (!token) throw new Error('A GitHub token is required to commit changes')
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`
  const body = {
    message,
    content: encodeBase64(content),
    sha
  }
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `token ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to update file: ${res.status} ${res.statusText} - ${text}`)
  }
  return res.json()
}

function encodeBase64(str: string) {
  try {
    return btoa(unescape(encodeURIComponent(str)))
  } catch (e) {
    return btoa(str)
  }
}

function decodeBase64(b64: string) {
  try {
    return decodeURIComponent(escape(atob(b64)))
  } catch (e) {
    return atob(b64)
  }
}
