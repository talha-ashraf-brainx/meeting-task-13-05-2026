import { Link, NavLink } from 'react-router-dom'

function navClass({ isActive }) {
  return `site-nav-link${isActive ? ' is-active' : ''}`
}

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link to="/" className="site-logo">
          Brief <span className="site-logo-mark">→</span> Tasks
        </Link>
        <nav className="site-nav-links" aria-label="Main">
          <NavLink to="/" end className={navClass}>
            Home
          </NavLink>
          <NavLink to="/editor" className={navClass}>
            Editor
          </NavLink>
        </nav>
      </div>
    </header>
  )
}
