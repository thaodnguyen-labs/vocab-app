'use client'

import { useState, useEffect } from 'react'

export default function SettingsPage() {
  const [scriptUrl, setScriptUrl] = useState('')
  const [original, setOriginal] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/settings?key=sheets_script_url')
      .then((r) => r.json())
      .then(({ value }) => {
        setScriptUrl(value || '')
        setOriginal(value || '')
        setLoading(false)
      })
  }, [])

  const save = async () => {
    setSaving(true)
    setMessage('')
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'sheets_script_url', value: scriptUrl.trim() }),
    })
    const json = await res.json()
    setSaving(false)
    if (json.error) {
      setMessage(`Error: ${json.error}`)
    } else {
      setOriginal(scriptUrl.trim())
      setMessage('Saved')
    }
  }

  const testConnection = async () => {
    setTesting(true)
    setTestResult(null)
    const res = await fetch('/api/sheet')
    const json = await res.json()
    setTesting(false)
    if (json.error) {
      setTestResult(`Error: ${json.error}`)
    } else {
      const rows = json.data || []
      const newCount = rows.filter(
        (r: { status?: string }) => String(r.status || '').trim().toUpperCase() === 'NO'
      ).length
      setTestResult(`OK · ${rows.length} rows total · ${newCount} with status=NO`)
    }
  }

  const dirty = scriptUrl.trim() !== original.trim()

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1 text-foreground">Settings</h1>
      <p className="text-sm text-muted mb-6">Data source for the app</p>

      <div className="bg-card border border-border rounded-xl p-4 mb-4">
        <label className="block text-sm font-semibold mb-1 text-foreground">
          Google Apps Script Web App URL
        </label>
        <p className="text-xs text-muted mb-3">
          Paste the <code className="bg-row-alt px-1 rounded">/exec</code> URL from your Apps
          Script deployment. It must be deployed as a Web App with &quot;Anyone&quot; access. This is the
          single connection between the web app and your Google Sheet.
        </p>

        {loading ? (
          <div className="h-10 bg-row-alt rounded-lg animate-pulse" />
        ) : (
          <>
            <input
              type="text"
              value={scriptUrl}
              onChange={(e) => setScriptUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full text-sm px-3 py-2 border border-border rounded-lg bg-near-white focus:outline-none focus:border-foreground text-foreground font-mono"
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={save}
                disabled={saving || !dirty}
                className="px-4 py-2 bg-foreground text-background rounded-lg text-sm font-medium disabled:opacity-50 hover:opacity-80 transition"
              >
                {saving ? 'Saving...' : dirty ? 'Save' : 'Saved'}
              </button>
              <button
                onClick={testConnection}
                disabled={testing || !scriptUrl.trim() || dirty}
                className="px-4 py-2 bg-row-alt border border-border text-foreground rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-border transition"
                title={dirty ? 'Save first, then test' : 'Fetch from the Sheet'}
              >
                {testing ? 'Testing...' : 'Test connection'}
              </button>
            </div>

            {message && (
              <p
                className={`text-sm mt-2 ${
                  message.startsWith('Error') ? 'text-danger' : 'text-foreground font-medium'
                }`}
              >
                {message}
              </p>
            )}

            {testResult && (
              <p
                className={`text-sm mt-2 ${
                  testResult.startsWith('Error') ? 'text-danger' : 'text-foreground font-medium'
                }`}
              >
                {testResult}
              </p>
            )}
          </>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl p-4 text-sm text-muted">
        <h3 className="font-semibold text-foreground mb-2">Apps Script requirements</h3>
        <ul className="list-disc ml-5 space-y-1">
          <li>
            The script must expose <code className="bg-row-alt px-1 rounded">doGet</code> returning{' '}
            <code className="bg-row-alt px-1 rounded">
              {'{data: [{en, vn, status, used, ...}]}'}
            </code>{' '}
            for the &quot;List&quot; sheet.
          </li>
          <li>
            The script must expose <code className="bg-row-alt px-1 rounded">doPost</code> accepting{' '}
            <code className="bg-row-alt px-1 rounded">
              {'{action: "confirm", enList: [...]}'}
            </code>{' '}
            and incrementing column I for each matched row.
          </li>
          <li>
            Deploy as a Web App: <em>Execute as: me</em>, <em>Who has access: Anyone</em>. Copy the{' '}
            <code className="bg-row-alt px-1 rounded">/exec</code> URL.
          </li>
          <li>After editing the script, redeploy as a new version — old URLs keep the old code.</li>
        </ul>
      </div>
    </div>
  )
}
