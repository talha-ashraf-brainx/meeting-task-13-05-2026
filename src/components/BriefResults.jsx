import { SubList } from './SubList.jsx'
import { toMarkdown } from '../lib/briefMarkdown.js'

export function BriefResults({ result }) {
  if (!result) return null

  const md = toMarkdown(result)

  const copyMd = () => navigator.clipboard.writeText(md).catch(() => {})
  const copyJson = () =>
    navigator.clipboard
      .writeText(JSON.stringify(result, null, 2))
      .catch(() => {})

  const copySummaries = () => {
    if (!result.jira_tickets?.length) return
    const text = result.jira_tickets.map((j) => j.summary).join('\n')
    navigator.clipboard.writeText(text).catch(() => {})
  }

  const downloadJson = () => {
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

  return (
    <div className="editor-output">
      <h2 className="editor-output-title">Breakdown</h2>
      <p className="editor-output-intro">
        Review structured output below. Copy or download for your PMO or issue
        tracker.
      </p>

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
                    <span className="meta-k">Grouping</span> {t.grouping_name}
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
              <li
                key={`${j.summary}-${j.issue_type}`}
                className="card jira-card"
              >
                <div className="jira-head">
                  <span className="issue-type">{j.issue_type}</span>
                  <h3>{j.summary}</h3>
                </div>
                <p className="task-desc">{j.description}</p>
                {j.labels?.length ? (
                  <p className="meta">
                    <span className="meta-k">Labels</span> {j.labels.join(', ')}
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
    </div>
  )
}
