function formatListMD(title, lines) {
  if (!lines?.length) return `### ${title}\n\n_None._\n\n`
  const body = lines.map((l) => `- ${l}`).join('\n')
  return `### ${title}\n\n${body}\n\n`
}

export function toMarkdown(data) {
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
