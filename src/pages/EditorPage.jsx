import { useCallback, useEffect, useRef, useState } from 'react'
import { SiteHeader } from '../components/SiteHeader.jsx'
import { BriefResults } from '../components/BriefResults.jsx'
import { TicketBoard } from '../components/TicketBoard.jsx'
import { ticketsFingerprint, useKanbanBoard } from '../hooks/useKanbanBoard.js'
import { apiUrl } from '../lib/apiUrl.js'

const ACCEPT_FILES = '.pdf,.md'

function EditorBreakdownOutput({ result }) {
  const [boardView, setBoardView] = useState(false)
  const { items, setItems } = useKanbanBoard(result.jira_tickets)

  if (boardView && result.jira_tickets?.length) {
    return (
      <div className="editor-board-view">
        <div className="editor-board-toolbar">
          <button
            type="button"
            className="btn secondary"
            onClick={() => setBoardView(false)}
          >
            Back to breakdown
          </button>
        </div>
        <div className="editor-board-heading">
          <h2 className="editor-board-title">Ticket board</h2>
          <p className="editor-board-lede">
            Drag cards between columns. Details open inside each card.
          </p>
        </div>
        <TicketBoard items={items} setItems={setItems} />
      </div>
    )
  }

  return (
    <BriefResults
      result={result}
      onOpenTicketBoard={
        result.jira_tickets?.length
          ? () => setBoardView(true)
          : undefined
      }
    />
  )
}

export default function EditorPage() {
  const [brief, setBrief] = useState('')
  const [files, setFiles] = useState([])
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [inputPanelVisible, setInputPanelVisible] = useState(true)
  const fileInputRef = useRef(null)
  const outputAnchorRef = useRef(null)
  const inputBlockRef = useRef(null)

  useEffect(() => {
    if (!result) return
    outputAnchorRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }, [result])

  const openInputPanel = useCallback(() => {
    setInputPanelVisible(true)
    requestAnimationFrame(() => {
      inputBlockRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    })
  }, [])

  const addFiles = useCallback((list) => {
    const next = Array.from(list || []).filter((f) => {
      const n = f.name.toLowerCase()
      return n.endsWith('.pdf') || n.endsWith('.md')
    })
    if (!next.length) return
    setFiles((prev) => {
      const seen = new Set(prev.map((p) => `${p.name}:${p.size}`))
      const merged = [...prev]
      for (const f of next) {
        const k = `${f.name}:${f.size}`
        if (!seen.has(k)) {
          seen.add(k)
          merged.push(f)
        }
      }
      return merged.slice(0, 10)
    })
  }, [])

  const removeFile = useCallback((index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const canSubmit = brief.trim().length > 0 || files.length > 0

  const onSubmit = useCallback(async () => {
    setError(null)
    setResult(null)
    setInputPanelVisible(true)
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('brief', brief)
      for (const f of files) {
        fd.append('files', f, f.name)
      }
      const res = await fetch(apiUrl('/api/brief-to-tasks'), {
        method: 'POST',
        body: fd,
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(payload?.error || `Request failed (${res.status})`)
        return
      }
      setResult(payload)
      setInputPanelVisible(false)
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }, [brief, files])

  return (
    <div className="editor-page">
      <SiteHeader />
      <main className="editor-main">
        <header className="editor-page-header">
          <h1 className="editor-page-title">TaskForge AI · Editor</h1>
          <p className="editor-page-lede">
            {result && !inputPanelVisible
              ? 'Breakdown below. Open the editor to change your input or run again.'
              : 'Add your brief and attachments, then generate. Results appear below the form.'}
          </p>
          {result && !inputPanelVisible ? (
            <div className="editor-back-bar">
              <button type="button" className="btn secondary" onClick={openInputPanel}>
                Back to editor
              </button>
            </div>
          ) : null}
        </header>

        {(!result || inputPanelVisible) ? (
        <section
          ref={inputBlockRef}
          className="editor-input-block"
          aria-labelledby="input-heading"
        >
          <h2 id="input-heading" className="editor-section-title">
            Your input
          </h2>
          <p className="editor-section-hint">
            Paste text, attach PDF or Markdown files, or both. At least one is
            required to run.
          </p>

          <div className="panel input-panel">
            <label className="label" htmlFor="brief">
              Client brief
            </label>
            <textarea
              id="brief"
              className="brief-area"
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              rows={14}
              placeholder="Paste the full brief here, or rely on uploads below…"
              spellCheck
            />
            <label className="label label-spaced" htmlFor="file-input">
              Attachments
            </label>
            <div
              className={`drop-zone${dragOver ? ' dragover' : ''}`}
              role="presentation"
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                addFiles(e.dataTransfer.files)
              }}
            >
              <p className="drop-zone-hint">
                Drop <code>.pdf</code> or <code>.md</code> here, or choose files
                (up to 10).
              </p>
              <button
                type="button"
                className="btn secondary"
                onClick={() => fileInputRef.current?.click()}
              >
                Choose files
              </button>
              <input
                ref={fileInputRef}
                id="file-input"
                className="file-input-hidden"
                type="file"
                accept={ACCEPT_FILES}
                multiple
                onChange={(e) => {
                  addFiles(e.target.files)
                  e.target.value = ''
                }}
              />
            </div>
            {files.length > 0 ? (
              <ul className="file-list">
                {files.map((f, i) => (
                  <li key={`${f.name}-${i}`} className="file-chip">
                    <span className="file-chip-name">{f.name}</span>
                    <button
                      type="button"
                      className="file-chip-remove"
                      onClick={() => removeFile(i)}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="actions">
              <button
                type="button"
                className="btn primary"
                disabled={loading || !canSubmit}
                onClick={onSubmit}
              >
                {loading ? 'Working…' : 'Generate breakdown'}
              </button>
            </div>
            {error ? (
              <p className="error" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        </section>
        ) : null}

        {result ? (
          <div
            key={ticketsFingerprint(result.jira_tickets)}
            ref={outputAnchorRef}
          >
            <EditorBreakdownOutput result={result} />
          </div>
        ) : null}

        {!result ? (
          <p className="editor-placeholder muted">
            Run generate to see facts, tasks, and tickets here.
          </p>
        ) : null}
      </main>
    </div>
  )
}
