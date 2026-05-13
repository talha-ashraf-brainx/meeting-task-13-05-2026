export const KANBAN_COLUMNS = [
  { id: 'backlog', label: 'Backlog' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'ready_for_test', label: 'Ready for testing' },
  { id: 'done', label: 'Done' },
]

export const KANBAN_COLUMN_IDS = KANBAN_COLUMNS.map((c) => c.id)

export const KANBAN_DEFAULT_STATUS = 'backlog'

export function isKanbanColumnId(id) {
  return KANBAN_COLUMN_IDS.includes(id)
}
