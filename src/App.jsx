import { useCallback, useRef, useState } from 'react'
import './App.css'

function formatListMD(title, lines) {
  if (!lines?.length) return `### ${title}\n\n_None._\n\n`
  const body = lines.map((l) => `- ${l}`).join('\n')
  return `### ${title}\n\n${body}\n\n`
}

function toMarkdown(data) {
  if (!data) return ''
  let md = `# Client brief breakdown\n\n`
  md += formatListMD('Facts from brief', data.facts_from_brief)
  md += formatListMD('Open questions', data.open_questions)
  md += formatListMD('Out of scope (explicit in brief only)', data.out_of_scope_inferred)
  if (data.groupings?.length) {
    md += `### Groupings\n\n`
    data.groupings.forEach((g) => {
      md += `#### ${g.name}\n\n${g.rationale}\n\n`
    })
  } else {
    md += `### Groupings\n\n_None._\n\n`
  }
  if (data.developer_tasks?.length) {
    md += `### Developer tasks\n\n`
    data.developer_tasks.forEach((t, i) => {
      md += `#### ${i + 1}. ${t.title}\n\n${t.description}\n\n`
      if (t.grouping_name) md += `_Grouping:_ ${t.grouping_name}\n\n`
      md += formatListMD('Acceptance criteria', t.acceptance_criteria)
      md += formatListMD('Dependencies', t.dependencies)
      md += formatListMD('Brief excerpts', t.brief_excerpts)
      md += formatListMD('Unknowns / blocking', t.unknowns_blocking)
    })
  } else {
    md += `### Developer tasks\n\n_None._\n\n`
  }
  if (data.jira_tickets?.length) {
    md += `### Jira-oriented tickets\n\n`
    data.jira_tickets.forEach((j, i) => {
      md += `#### ${i + 1}. [${j.issue_type}] ${j.summary}\n\n${j.description}\n\n`
      if (j.labels?.length) md += `Labels: ${j.labels.join(', ')}\n\n`
      md += formatListMD('Acceptance criteria', j.acceptance_criteria)
      md += formatListMD('Brief excerpts', j.brief_excerpts)
      md += formatListMD('Unknowns / blocking', j.unknowns_blocking)
    })
  } else {
    md += `### Jira-oriented tickets\n\n_None._\n\n`
  }
  return md.trimEnd()
}

const ACCEPT_FILES = '.pdf,.md'

function apiUrl(path) {
  const origin = import.meta.env.VITE_DEV_API_ORIGIN
  return origin ? `${origin}${path}` : path
}

function App() {
  const [view, setView] = useState('landing')
  const [brief, setBrief] = useState('')
  const [files, setFiles] = useState([])
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)

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
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }, [brief, files])

  const md = result ? toMarkdown(result) : ''
  const copyMd = () =>
    navigator.clipboard.writeText(md).catch(() => {})

  const copyJson = () =>
    result &&
    navigator.clipboard
      .writeText(JSON.stringify(result, null, 2))
      .catch(() => {})

  const copySummaries = () => {
    if (!result?.jira_tickets?.length) return
    const text = result.jira_tickets.map((j) => j.summary).join('\n')
    navigator.clipboard.writeText(text).catch(() => {})
  }

  const downloadJson = () => {
    if (!result) return
    const blob = new Blob([JSON.stringify(result, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'brief-breakdown.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadMd = () => {
    if (!md) return
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'brief-breakdown.md'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (view === 'landing') {
    return (
      <div className="app landing">
        <div className="landing-hero">
          <div className="landing-badge">Structured PMO output</div>
          <h1>Turn client briefs into developer tasks</h1>
          <p className="landing-lede">
            Paste a brief or upload PDFs and Markdown. The model extracts
            facts, flags gaps, groups work, and proposes Jira-style tickets—
            without inventing requirements that are not in the source.
          </p>
          <ul className="landing-features">
            <li>
              <span className="feature-dot" aria-hidden />
              <div>
                <strong>Honest scope</strong>
                <span>
                  Open questions and unknowns stay visible instead of hidden
                  assumptions.
                </span>
              </div>
            </li>
            <li>
              <span className="feature-dot" aria-hidden />
              <div>
                <strong>Ready for delivery</strong>
                <span>
                  Export Markdown or JSON for tickets, wikis, or your PMO
                  tool.
                </span>
              </div>
            </li>
            <li>
              <span className="feature-dot" aria-hidden />
              <div>
                <strong>Files + text</strong>
                <span>
                  Combine pasted notes with multiple .pdf or .md uploads in one
                  run.
                </span>
              </div>
            </li>
          </ul>
          <div className="landing-actions">
            <button
              type="button"
              className="btn primary"
              onClick={() => setView('tool')}
            >
              Start with your brief
            </button>
          </div>
          <p className="landing-note">
            Powered by OpenAI <code>gpt-4.1-mini</code> with strict JSON schema
            output.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <div className="tool-top">
        <span className="tool-brand">Brief to tasks</span>
        <button
          type="button"
          className="link-btn"
          onClick={() => setView('landing')}
        >
          About
        </button>
      </div>

      <header className="header">
        <h1>Client brief → dev tasks</h1>
        <p className="lede">
          Paste a client brief and/or attach PDF or Markdown files. The model
          returns structured facts, open questions, tasks, and Jira-style
          tickets without inventing scope.
        </p>
      </header>

      <section className="panel input-panel">
        <label className="label" htmlFor="brief">
          Client brief (optional if you attach files)
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
        <label className="label" style={{ marginTop: 18 }}>
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
            {loading ? 'Working…' : 'Generate'}
          </button>
        </div>
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
      </section>

      {result ? (
        <>
          <section className="panel toolbar">
            <div className="toolbar-inner">
              <button type="button" className="btn" onClick={copyMd}>
                Copy Markdown
              </button>
              <button type="button" className="btn" onClick={copyJson}>
                Copy JSON
              </button>
              <button
                type="button"
                className="btn"
                onClick={copySummaries}
                disabled={!result.jira_tickets?.length}
              >
                Copy ticket summaries
              </button>
              <button type="button" className="btn" onClick={downloadMd}>
                Download .md
              </button>
              <button type="button" className="btn" onClick={downloadJson}>
                Download .json
              </button>
            </div>
          </section>

          <section className="panel">
            <h2>Facts from brief</h2>
            <ul className="list">
              {result.facts_from_brief?.length ? (
                result.facts_from_brief.map((s) => <li key={s}>{s}</li>)
              ) : (
                <li className="muted">None.</li>
              )}
            </ul>
          </section>

          <section className="panel warn-panel">
            <h2>Open questions</h2>
            <ul className="list">
              {result.open_questions?.length ? (
                result.open_questions.map((s) => <li key={s}>{s}</li>)
              ) : (
                <li className="muted">None listed.</li>
              )}
            </ul>
          </section>

          <section className="panel">
            <h2>Out of scope (explicit in brief only)</h2>
            <ul className="list">
              {result.out_of_scope_inferred?.length ? (
                result.out_of_scope_inferred.map((s) => (
                  <li key={s}>{s}</li>
                ))
              ) : (
                <li className="muted">None (or not stated in the brief).</li>
              )}
            </ul>
          </section>

          <section className="panel">
            <h2>Groupings</h2>
            {result.groupings?.length ? (
              <ul className="card-list">
                {result.groupings.map((g) => (
                  <li key={g.name} className="card">
                    <h3>{g.name}</h3>
                    <p>{g.rationale}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">None.</p>
            )}
          </section>

          <section className="panel">
            <h2>Developer tasks</h2>
            {result.developer_tasks?.length ? (
              <ol className="task-list">
                {result.developer_tasks.map((t) => (
                  <li key={t.title} className="card task-card">
                    <h3>{t.title}</h3>
                    <p className="task-desc">{t.description}</p>
                    {t.grouping_name ? (
                      <p className="meta">
                        <span className="meta-k">Grouping</span>{' '}
                        {t.grouping_name}
                      </p>
                    ) : null}
                    <SubList title="Acceptance criteria" items={t.acceptance_criteria} />
                    <SubList title="Dependencies" items={t.dependencies} />
                    <SubList title="Brief excerpts" items={t.brief_excerpts} />
                    <SubList title="Unknowns / blocking" items={t.unknowns_blocking} />
                  </li>
                ))}
              </ol>
            ) : (
              <p className="muted">None.</p>
            )}
          </section>

          <section className="panel">
            <h2>Jira-oriented tickets</h2>
            {result.jira_tickets?.length ? (
              <ul className="card-list">
                {result.jira_tickets.map((j) => (
                  <li key={`${j.summary}-${j.issue_type}`} className="card jira-card">
                    <div className="jira-head">
                      <span className="issue-type">{j.issue_type}</span>
                      <h3>{j.summary}</h3>
                    </div>
                    <p className="task-desc">{j.description}</p>
                    {j.labels?.length ? (
                      <p className="meta">
                        <span className="meta-k">Labels</span>{' '}
                        {j.labels.join(', ')}
                      </p>
                    ) : null}
                    <SubList title="Acceptance criteria" items={j.acceptance_criteria} />
                    <SubList title="Brief excerpts" items={j.brief_excerpts} />
                    <SubList title="Unknowns / blocking" items={j.unknowns_blocking} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">None.</p>
            )}
          </section>
        </>
      ) : null}
    </div>
  )
}

function SubList({ title, items }) {
  return (
    <div className="sub-block">
      <h4>{title}</h4>
      <ul className="sub-list">
        {items?.length ? (
          items.map((s) => <li key={s}>{s}</li>)
        ) : (
          <li className="muted">—</li>
        )}
      </ul>
    </div>
  )
}

export default App
