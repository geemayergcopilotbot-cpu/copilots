const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs').promises
const fsSync = require('fs')
const os = require('os')
let keytar
try { keytar = require('keytar') } catch (e) { keytar = null }

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 760,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  // Load the Vite dev server in dev, or the built GUI in production
  const devUrl = 'http://localhost:5173'
  if (process.env.NODE_ENV === 'development') {
    win.loadURL(devUrl)
  } else {
    win.loadFile(path.join(__dirname, '..', 'gui', 'dist', 'index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

async function walkDir(dir, collected = [], base = dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const ent of entries) {
    const full = path.join(dir, ent.name)
    if (ent.isDirectory()) {
      await walkDir(full, collected, base)
    } else if (ent.isFile()) {
      collected.push(full)
    }
  }
  return collected
}

function isBinaryBuffer(buf) {
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] === 0) return true
  }
  return false
}

ipcMain.handle('read-files', async (_, paths) => {
  const results = []
  for (const p of paths) {
    try {
      const stat = await fs.stat(p)
      if (stat.isDirectory()) {
        const files = await walkDir(p)
        for (const f of files) {
          const buf = await fs.readFile(f)
          const isBinary = isBinaryBuffer(buf)
          results.push({ path: f, name: path.basename(f), size: buf.length, isBinary, content: isBinary ? null : buf.toString('utf8') })
        }
      } else {
        const buf = await fs.readFile(p)
        const isBinary = isBinaryBuffer(buf)
        results.push({ path: p, name: path.basename(p), size: buf.length, isBinary, content: isBinary ? null : buf.toString('utf8') })
      }
    } catch (e) {
      console.error('read-files error', e)
    }
  }
  return results
})

const TOKEN_SERVICE = 'copilots-electron'
const TOKEN_ACCOUNT = 'github-token'

ipcMain.handle('store-token', async (_, token) => {
  try {
    if (keytar) {
      await keytar.setPassword(TOKEN_SERVICE, TOKEN_ACCOUNT, token)
      return { stored: 'keytar' }
    }
  } catch (e) {
    console.warn('keytar.store failed', e)
  }
  // fallback to file
  try {
    const p = path.join(app.getPath('userData'), 'token.json')
    await fs.writeFile(p, JSON.stringify({ token }))
    return { stored: 'file', path: p }
  } catch (e) {
    return { error: String(e) }
  }
})

ipcMain.handle('get-token', async () => {
  try {
    if (keytar) {
      const t = await keytar.getPassword(TOKEN_SERVICE, TOKEN_ACCOUNT)
      if (t) return { token: t, stored: 'keytar' }
    }
  } catch (e) {
    console.warn('keytar.get failed', e)
  }
  try {
    const p = path.join(app.getPath('userData'), 'token.json')
    if (fsSync.existsSync(p)) {
      const raw = await fs.readFile(p, 'utf8')
      const j = JSON.parse(raw)
      return { token: j.token, stored: 'file', path: p }
    }
  } catch (e) {
    console.warn('file read failed', e)
  }
  return { token: null }
})

async function getFileSha(owner, repo, filePath, branch, token) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath)}?ref=${encodeURIComponent(branch)}`
  const res = await fetch(url, { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github+json' } })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`getFileSha failed ${res.status} ${res.statusText}`)
  const json = await res.json()
  return json.sha
}

async function putFile(owner, repo, filePath, contentBase64, message, branch, sha, token) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath)}`
  const body = { message, content: contentBase64, branch }
  if (sha) body.sha = sha
  const res = await fetch(url, { method: 'PUT', headers: { Authorization: `token ${token}`, 'Content-Type': 'application/json', Accept: 'application/vnd.github+json' }, body: JSON.stringify(body) })
  const text = await res.text()
  if (!res.ok) throw new Error(`putFile failed ${res.status} ${res.statusText} - ${text}`)
  return JSON.parse(text)
}

ipcMain.handle('commit-files', async (_, { owner, repo, branch = 'main', message, files, token: providedToken }) => {
  const resp = { results: [], errors: [] }
  let token = providedToken
  if (!token) {
    try {
      const stored = keytar ? await keytar.getPassword(TOKEN_SERVICE, TOKEN_ACCOUNT) : null
      if (stored) token = stored
      else {
        const p = path.join(app.getPath('userData'), 'token.json')
        if (fsSync.existsSync(p)) {
          const raw = await fs.readFile(p, 'utf8')
          token = JSON.parse(raw).token
        }
      }
    } catch (e) {
      console.warn('token load failed', e)
    }
  }

  if (!token) {
    throw new Error('No GitHub token provided or stored')
  }

  for (const f of files) {
    try {
      // target path in repo: preserve filename only (basename) unless user provided mapping. For now use basename
      const targetPath = path.basename(f.path)
      const sha = await (async () => {
        try {
          return await getFileSha(owner, repo, targetPath, branch, token)
        } catch (e) {
          // continue
          return null
        }
      })()
      if (f.isBinary) {
        // skip binary files for now
        resp.results.push({ path: targetPath, skipped: true, reason: 'binary' })
        continue
      }
      const contentBase64 = Buffer.from(f.content || '', 'utf8').toString('base64')
      const put = await putFile(owner, repo, targetPath, contentBase64, message || `Add ${targetPath} via Copilots Desktop`, branch, sha, token)
      resp.results.push({ path: targetPath, commit: put.commit && put.commit.sha })
    } catch (e) {
      resp.errors.push({ file: f.path, error: String(e) })
    }
  }
  return resp
})

ipcMain.handle('show-open-dialog', async (_, options) => {
  const res = await dialog.showOpenDialog(BrowserWindow.getFocusedWindow(), options)
  return res
})
