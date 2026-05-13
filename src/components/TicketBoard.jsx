import { useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { KANBAN_COLUMNS, isKanbanColumnId } from '../lib/kanbanColumns.js'
import { SubList } from './SubList.jsx'

export function KanbanCardContent({ item, className = '' }) {
  const t = item.ticket
  const desc = t.description || ''
  const short =
    desc.length > 140 ? `${desc.slice(0, 140)}…` : desc
  const rootClass = ['kanban-card', className].filter(Boolean).join(' ')
  return (
    <div className={rootClass}>
      <div className="kanban-card-top">
        <span className="issue-type">{t.issue_type}</span>
        <h3 className="kanban-card-title">{t.summary}</h3>
      </div>
      {short ? <p className="kanban-card-desc">{short}</p> : null}
      <details
        className="kanban-card-details"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <summary className="kanban-card-summary">Details</summary>
        {t.description ? <p className="task-desc">{t.description}</p> : null}
        {t.labels?.length ? (
          <p className="meta">
            <span className="meta-k">Labels</span> {t.labels.join(', ')}
          </p>
        ) : null}
        <SubList title="Acceptance criteria" items={t.acceptance_criteria} />
        <SubList title="Brief excerpts" items={t.brief_excerpts} />
        <SubList title="Unknowns / blocking" items={t.unknowns_blocking} />
      </details>
    </div>
  )
}

function KanbanCard({ item }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: item.id,
    })
  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`kanban-card-wrap${isDragging ? ' kanban-card-wrap-dragging' : ''}`}
      {...listeners}
      {...attributes}
    >
      <KanbanCardContent item={item} />
    </div>
  )
}

function KanbanColumn({ col, items }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id })
  return (
    <div className="kanban-column">
      <div className="kanban-column-head">
        <h3 className="kanban-column-title">{col.label}</h3>
        <span className="kanban-column-count">{items.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`kanban-column-body${isOver ? ' kanban-column-over' : ''}`}
      >
        {items.map((item) => (
          <KanbanCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  )
}

export function TicketBoard({ items, setItems }) {
  const [activeId, setActiveId] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  )

  const byColumn = useMemo(() => {
    const m = Object.fromEntries(KANBAN_COLUMNS.map((c) => [c.id, []]))
    for (const item of items) {
      if (m[item.status]) m[item.status].push(item)
    }
    return m
  }, [items])

  const activeItem = useMemo(
    () => (activeId ? items.find((i) => i.id === activeId) : null),
    [activeId, items],
  )

  function handleDragEnd(event) {
    setActiveId(null)
    const { active, over } = event
    if (!over) return
    const activeIdStr = String(active.id)
    const overId = String(over.id)
    let newStatus = null
    if (isKanbanColumnId(overId)) {
      newStatus = overId
    } else {
      const overItem = items.find((i) => i.id === overId)
      if (overItem) newStatus = overItem.status
    }
    if (!newStatus || !isKanbanColumnId(newStatus)) return
    setItems((prev) =>
      prev.map((i) =>
        i.id === activeIdStr ? { ...i, status: newStatus } : i,
      ),
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={({ active }) => {
        setActiveId(String(active.id))
      }}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="kanban-board">
        {KANBAN_COLUMNS.map((col) => (
          <KanbanColumn key={col.id} col={col} items={byColumn[col.id]} />
        ))}
      </div>
      <DragOverlay dropAnimation={null} className="kanban-drag-overlay-root">
        {activeItem ? (
          <div className="kanban-card-overlay-shell">
            <KanbanCardContent
              item={activeItem}
              className="kanban-card-overlay"
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
