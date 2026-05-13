export function SubList({ title, items }) {
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
