import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  isKanbanColumnId,
  KANBAN_COLUMN_IDS,
  KANBAN_DEFAULT_STATUS,
} from '../lib/kanbanColumns.js'

const STORAGE_KEY = 'meeting-task-kanban'
const EMPTY_TICKETS = []

export function ticketsFingerprint(tickets) {
  const list = tickets ?? []
  const s = JSON.stringify(list)
  let h = 0
  for (let i = 0; i < s.length; i += 1) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }
  return `${h}:${s.length}`
}

function slugSummary(summary) {
  const base = String(summary || '')
    .slice(0, 48)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')
  return base.length ? base : 'ticket'
}

export function makeTicketItemId(index, ticket) {
  return `t-${index}-${slugSummary(ticket?.summary)}`
}

function readStoredStatuses(fingerprint) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (data?.fingerprint !== fingerprint || !Array.isArray(data?.statusById))
      return null
    const rows = data.statusById.filter((row) => isKanbanColumnId(row.status))
    return new Map(rows.map((row) => [row.id, row.status]))
  } catch {
    return null
  }
}

function writeStoredStatuses(fingerprint, items) {
  try {
    const statusById = items.map(({ id, status }) => ({ id, status }))
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ fingerprint, statusById }),
    )
  } catch {
    void 0
  }
}

export function buildKanbanItemsFromTickets(jiraTickets) {
  const tickets = jiraTickets == null ? [] : jiraTickets
  if (!tickets.length) return []
  const fingerprint = ticketsFingerprint(tickets)
  const built = tickets.map((ticket, i) => ({
    id: makeTicketItemId(i, ticket),
    status: KANBAN_DEFAULT_STATUS,
    ticket,
  }))
  const statusMap = readStoredStatuses(fingerprint)
  if (!statusMap) return built
  return built.map((it) => {
    const s = statusMap.get(it.id)
    return {
      ...it,
      status: s && KANBAN_COLUMN_IDS.includes(s) ? s : KANBAN_DEFAULT_STATUS,
    }
  })
}

export function useKanbanBoard(jiraTickets) {
  const tickets = jiraTickets == null ? EMPTY_TICKETS : jiraTickets
  const fingerprint = useMemo(
    () => ticketsFingerprint(tickets),
    [tickets],
  )

  const [items, setItems] = useState(() =>
    buildKanbanItemsFromTickets(jiraTickets),
  )

  useEffect(() => {
    if (!tickets.length || !items.length) return
    writeStoredStatuses(fingerprint, items)
  }, [fingerprint, items, tickets.length])

  const updateItems = useCallback((updater) => {
    setItems((prev) => (typeof updater === 'function' ? updater(prev) : updater))
  }, [])

  return { items, setItems: updateItems, fingerprint }
}
