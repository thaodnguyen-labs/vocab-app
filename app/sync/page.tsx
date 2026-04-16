'use client'

import { useState, useEffect } from 'react'

const APPS_SCRIPT_CODE = `function doGet(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('List');
    if (!sheet) return err('Sheet "List" not found');
    const data = sheet.getDataRange().getValues();
    const rows = data.slice(1).filter(r => r[2] || r[3]).map(r => ({
      week: r[0] || null,
      en: String(r[2] || '').trim(),
      vn: String(r[3] || '').trim(),
      source: String(r[4] || '').trim(),
      note: String(r[5] || '').trim(),
      status: String(r[7] || 'NO').trim(),
      used: Number(r[8]) || 0,
    }));
    return ok({data: rows});
  } catch (error) {
    return err(error.toString());
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('List');
    if (!sheet) return err('Sheet "List" not found');

    const toRow = r => [r.week || '', r.no || '', r.en, r.vn, r.source || '', r.note || '', '', r.status || 'NO', r.used || 0];

    if (body.action === 'replace') {
      const last = sheet.getLastRow();
      if (last > 1) sheet.getRange(2, 1, last - 1, 9).clearContent();
    }
    const rows = body.rows.map(toRow);
    if (rows.length > 0) {
      const startRow = sheet.getLastRow() + 1;
      sheet.getRange(startRow, 1, rows.length, 9).setValues(rows);
    }
    return ok({written: rows.length});
  } catch (error) {
    return err(error.toString());
  }
}

function ok(data) {
  return ContentService.createTextOutput(JSON.stringify(Object.assign({success: true}, data)))
    .setMimeType(ContentService.MimeType.JSON);
}
function err(msg) {
  return ContentService.createTextOutput(JSON.stringify({error: msg}))
    .setMimeType(ContentService.MimeType.JSON);
}`

type Msg = { type: 'success' | 'error' | 'info'; text: string } | null

export default function SyncPage() {
  const [scriptUrl, setScriptUrl] = useState('')
  const [savedUrl, setSavedUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [pulling, setPulling] = useState(false)
  const [pushing, setPushing] = useState(false)
  const [msg, setMsg] = useState<Msg>(null)
  const [showSetup, setShowSetup] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => {
        const url = d.settings?.sheets_script_url || ''
        setSavedUrl(url)
        setScriptUrl(url)
      })
      .catch(() => {})
  }, [])

  const safeJson = async (res: Response) => {
    const text = await res.text()
    try {
      return JSON.parse(text)
    } catch {
      return { error: `Non-JSON response: ${text.slice(0, 200)}` }
    }
  }

  const saveUrl = async () => {
    setSaving(true)
    setMsg(null)
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'sheets_script_url', value: scriptUrl.trim() }),
    })
    const result = await safeJson(res)
    if (result.error) {
      setMsg({ type: 'error', text: result.error })
    } else {
      setSavedUrl(scriptUrl.trim())
      setMsg({ type: 'success', text: 'URL saved' })
    }
    setSaving(false)
  }

  const testConnection = async () => {
    setTesting(true)
    setMsg({ type: 'info', text: 'Testing connection...' })
    try {
      // Call via server proxy to avoid browser CORS
      const res = await fetch('/api/sync/pull', { method: 'POST' })
      const result = await safeJson(res)
      if (result.error) {
        setMsg({ type: 'error', text: result.error })
      } else {
        setMsg({
          type: 'success',
          text: `Connected. Sheet has ${result.total || 0} rows. (Pull was also executed: added ${result.added}, updated ${result.updated})`,
        })
      }
    } catch (e) {
      setMsg({ type: 'error', text: String(e) })
    }
    setTesting(false)
  }

  const pull = async () => {
    setPulling(true)
    setMsg({ type: 'info', text: 'Pulling from Google Sheets...' })
    try {
      const res = await fetch('/api/sync/pull', { method: 'POST' })
      const result = await safeJson(res)
      if (result.error) {
        setMsg({ type: 'error', text: result.error })
      } else {
        setMsg({
          type: 'success',
          text: `Pulled ${result.total} rows. Added ${result.added}, updated ${result.updated}.`,
        })
      }
    } catch (e) {
      setMsg({ type: 'error', text: String(e) })
    }
    setPulling(false)
  }

  const push = async (action: 'append' | 'replace') => {
    if (action === 'replace') {
      if (
        !confirm(
          'Replace ALL rows in your Google Sheet "List" tab? This clears existing rows first.'
        )
      )
        return
    }
    setPushing(true)
    setMsg({ type: 'info', text: `Pushing to Google Sheets (${action})...` })
    try {
      const res = await fetch('/api/sync/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const result = await safeJson(res)
      if (result.error) {
        setMsg({ type: 'error', text: result.error })
      } else {
        setMsg({ type: 'success', text: `Pushed ${result.count} rows (${action}).` })
      }
    } catch (e) {
      setMsg({ type: 'error', text: String(e) })
    }
    setPushing(false)
  }

  const copyScript = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1 text-foreground">Google Sheets Sync</h1>
      <p className="text-sm text-muted mb-6">Bidirectional sync with your Google Sheet</p>

      {/* Script URL config */}
      <div className="bg-card border border-border rounded-xl p-4 mb-4">
        <label className="text-sm font-medium block mb-2 text-foreground">
          Apps Script Web App URL
        </label>
        <input
          type="text"
          placeholder="https://script.google.com/macros/s/.../exec"
          value={scriptUrl}
          onChange={(e) => setScriptUrl(e.target.value)}
          className="w-full text-xs px-3 py-2 border border-border rounded-lg bg-near-white focus:outline-none focus:border-foreground text-foreground font-mono"
        />
        <p className="text-xs text-muted mt-1">
          Must end in <span className="font-mono">/exec</span> (not <span className="font-mono">/edit</span>)
        </p>
        <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
          <button
            onClick={() => setShowSetup(!showSetup)}
            className="text-xs text-muted hover:text-foreground underline"
          >
            {showSetup ? 'Hide' : 'Show'} setup instructions
          </button>
          <div className="flex gap-2">
            <button
              onClick={saveUrl}
              disabled={saving || scriptUrl === savedUrl || !scriptUrl}
              className="text-sm px-4 py-1.5 bg-foreground text-background rounded-lg font-medium disabled:opacity-50 hover:opacity-80 transition"
            >
              {saving ? 'Saving...' : 'Save URL'}
            </button>
            {savedUrl && (
              <button
                onClick={testConnection}
                disabled={testing}
                className="text-sm px-4 py-1.5 bg-card border border-border text-foreground rounded-lg font-medium disabled:opacity-50 hover:bg-row-alt transition"
              >
                {testing ? 'Testing...' : 'Test'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Setup instructions */}
      {showSetup && (
        <div className="bg-card border border-border rounded-xl p-4 mb-4 text-sm text-foreground">
          <h3 className="font-semibold mb-3">One-time setup (~2 minutes)</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted">
            <li>
              Open your Google Sheet (must have a tab named{' '}
              <span className="font-mono text-foreground">List</span>)
            </li>
            <li>
              Menu: <span className="font-mono text-foreground">Extensions → Apps Script</span>
            </li>
            <li>Delete the default code. Paste the script below (click Copy)</li>
            <li>
              Save (disk icon or <span className="font-mono">Ctrl/Cmd+S</span>)
            </li>
            <li>
              Click <span className="font-mono text-foreground">Deploy → New deployment</span>
            </li>
            <li>
              Click the gear icon → Select{' '}
              <span className="font-mono text-foreground">Web app</span>
            </li>
            <li>
              Execute as: <span className="font-mono text-foreground">Me</span>
            </li>
            <li>
              Who has access: <span className="font-mono text-foreground font-bold bg-row-alt px-1">Anyone</span>{' '}
              (this is critical — without it you will get HTML errors)
            </li>
            <li>Click Deploy → Authorize → Allow permissions</li>
            <li>
              Copy the <span className="font-mono text-foreground">Web app URL</span> (must end
              in <span className="font-mono">/exec</span>)
            </li>
            <li>Paste it above, click Save URL, then click Test</li>
          </ol>

          <div className="mt-4 p-3 bg-row-alt border border-border rounded-lg">
            <p className="text-xs text-foreground">
              <strong>If you re-edit the script later:</strong> Go to Deploy → Manage deployments
              → pencil icon → Version: New version → Deploy. The URL stays the same.
            </p>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-muted uppercase tracking-wide">
                Apps Script Code
              </span>
              <button
                onClick={copyScript}
                className="text-xs px-3 py-1 bg-foreground text-background rounded transition hover:opacity-80"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre className="bg-row-alt border border-border rounded-lg p-3 text-xs overflow-x-auto font-mono text-foreground max-h-60 overflow-y-auto">
              {APPS_SCRIPT_CODE}
            </pre>
          </div>

          <p className="text-xs text-muted mt-4">
            <strong className="text-foreground">Expected columns:</strong> A=Week, B=No, C=EN,
            D=VN, E=Source, F=Note, H=Status, I=Used. This matches your existing sheet.
          </p>
        </div>
      )}

      {/* Sync buttons */}
      {savedUrl && (
        <div className="space-y-3">
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="font-semibold mb-1 text-foreground">Pull from Sheets → App</h3>
            <p className="text-xs text-muted mb-3">
              Reads your Google Sheet. New rows are added. Existing rows (matched by English
              text) have their status/used/notes updated.
            </p>
            <button
              onClick={pull}
              disabled={pulling}
              className="px-4 py-2 bg-foreground text-background rounded-lg text-sm font-medium hover:opacity-80 disabled:opacity-50 transition"
            >
              {pulling ? 'Pulling...' : 'Pull from Sheets'}
            </button>
          </div>

          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="font-semibold mb-1 text-foreground">Push from App → Sheets</h3>
            <p className="text-xs text-muted mb-3">
              Writes app data to your Google Sheet&apos;s{' '}
              <span className="font-mono">List</span> tab.
            </p>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => push('append')}
                disabled={pushing}
                className="px-4 py-2 bg-foreground text-background rounded-lg text-sm font-medium hover:opacity-80 disabled:opacity-50 transition"
              >
                {pushing ? 'Pushing...' : 'Append to Sheet'}
              </button>
              <button
                onClick={() => push('replace')}
                disabled={pushing}
                className="px-4 py-2 bg-danger text-white rounded-lg text-sm font-medium hover:opacity-80 disabled:opacity-50 transition"
              >
                Replace All Rows
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message display */}
      {msg && (
        <div
          className={`mt-4 p-3 rounded-lg text-sm border ${
            msg.type === 'error'
              ? 'bg-card border-danger text-danger'
              : msg.type === 'success'
              ? 'bg-row-alt border-border text-foreground'
              : 'bg-row-alt border-border text-muted'
          }`}
        >
          {msg.text}
        </div>
      )}
    </div>
  )
}
