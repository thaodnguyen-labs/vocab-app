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

      <div className="bg-card border border-border rounded-xl p-4 text-sm">
        <h3 className="font-semibold text-foreground mb-2">Set up the Apps Script</h3>
        <ol className="list-decimal ml-5 space-y-1 text-muted mb-4">
          <li>Open your Google Sheet → Extensions → Apps Script.</li>
          <li>Replace the editor contents with the script below.</li>
          <li>
            Click <em>Deploy → New deployment → Web app</em>. Set <em>Execute as: me</em> and{' '}
            <em>Who has access: Anyone</em>. Copy the{' '}
            <code className="bg-row-alt px-1 rounded">/exec</code> URL and paste it above.
          </li>
          <li>
            After any script edit, redeploy as a <em>new version</em> — the old URL keeps the old
            code.
          </li>
        </ol>

        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-muted uppercase tracking-wide font-medium">Apps Script</p>
          <button
            onClick={() => navigator.clipboard.writeText(APPS_SCRIPT_SOURCE)}
            className="text-xs px-2 py-1 bg-row-alt border border-border rounded hover:bg-border text-foreground transition"
          >
            Copy
          </button>
        </div>
        <pre className="bg-near-white border border-border rounded-lg p-3 text-xs text-foreground overflow-x-auto whitespace-pre leading-relaxed">
          {APPS_SCRIPT_SOURCE}
        </pre>

        <p className="text-xs text-muted mt-3">
          Columns expected in the <code className="bg-row-alt px-1 rounded">List</code> sheet:
          Week (A), No (B), EN (C), VN (D), Source (E), Note (F), — (G), Status (H), Used (I).
          Status=&quot;NO&quot; means a row is eligible to be picked. &quot;Confirm learned&quot; in
          the player increments column I (Used) by 1 for each picked row.
        </p>
      </div>
    </div>
  )
}

const APPS_SCRIPT_SOURCE = `// Vocab Practice — Apps Script bound to your Sheet
// Sheet: "List" — columns: Week(A), No(B), EN(C), VN(D), Source(E), Note(F), (G), Status(H), Used(I)

function doGet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("List");
  const values = sheet.getDataRange().getValues();
  // skip header row
  const rows = values.slice(1).map(function (r) {
    return {
      week:   r[0],
      no:     r[1],
      en:     r[2],
      vn:     r[3],
      source: r[4],
      note:   r[5],
      status: r[7],
      used:   r[8],
    };
  });
  // Summary cells from row 1 (used-count buckets)
  // Sheet layout: N1 = used 7+, O1 = used 5+, P1 = used 3+
  const summary = {
    used3: sheet.getRange("P1").getValue(),
    used5: sheet.getRange("O1").getValue(),
    used7: sheet.getRange("N1").getValue(),
  };
  return ContentService
    .createTextOutput(JSON.stringify({ data: rows, summary: summary }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var body = {};
  try { body = JSON.parse(e.postData.contents || "{}"); } catch (err) {}

  if (body.action !== "confirm") {
    return ContentService
      .createTextOutput(JSON.stringify({ error: "unknown action" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const sheet  = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("List");
  const enCol   = sheet.getRange("C:C").getValues();   // EN column
  const usedCol = sheet.getRange("I:I").getValues();   // Used column
  const targets = new Set(
    (body.enList || []).map(function (s) { return String(s).trim().toLowerCase(); })
  );

  var updated = 0;
  for (var i = 0; i < enCol.length; i++) {
    var en = String(enCol[i][0] || "").trim().toLowerCase();
    if (en && targets.has(en)) {
      var cur = Number(usedCol[i][0]) || 0;
      sheet.getRange(i + 1, 9).setValue(cur + 1); // column I = 9
      updated++;
    }
  }

  return ContentService
    .createTextOutput(JSON.stringify({ updated: updated }))
    .setMimeType(ContentService.MimeType.JSON);
}
`

