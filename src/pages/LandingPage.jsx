import { Link } from 'react-router-dom'
import { SiteHeader } from '../components/SiteHeader.jsx'

export default function LandingPage() {
  return (
    <div className="landing-page">
      <SiteHeader />
      <main>
        <section className="hero-section" aria-labelledby="hero-heading">
          <div className="hero-inner">
            <div className="hero-copy">
              <p className="landing-eyebrow">TaskForge AI</p>
              <h1 id="hero-heading">
                From messy briefs to{' '}
                <span className="hero-highlight">clear developer work</span>
              </h1>
              <p className="hero-lede">
                Drop in meeting notes, PDFs, or Markdown. Get facts, open
                questions, grouped tasks, and Jira-style tickets—grounded in
                what the client actually said, not invented scope.
              </p>
              <div className="hero-actions">
                <Link to="/editor" className="btn primary hero-cta">
                  Open editor
                </Link>
                <a href="#how-it-works" className="btn secondary hero-cta-secondary">
                  How it works
                </a>
              </div>
              <p className="hero-footnote">
                Uses OpenAI <code>gpt-4.1-mini</code> with strict JSON schema
                so output is predictable and machine-readable.
              </p>
            </div>
            <div className="hero-aside" aria-hidden>
              <div className="hero-card hero-card-a">
                <span className="hero-card-label">Input</span>
                <p className="hero-card-text">
                  Briefs, PDFs, <code>.md</code>—alone or together
                </p>
              </div>
              <div className="hero-card hero-card-b">
                <span className="hero-card-label">Output</span>
                <p className="hero-card-text">
                  Tasks, tickets, acceptance criteria, cited excerpts
                </p>
              </div>
              <div className="hero-card hero-card-c">
                <span className="hero-card-label">Safety</span>
                <p className="hero-card-text">
                  Gaps surface as questions—not silent assumptions
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="section how-section">
          <div className="section-inner">
            <h2 className="section-title">How it works</h2>
            <p className="section-sub">
              Three steps from raw material to a breakdown your team can execute.
            </p>
            <ol className="steps">
              <li className="step">
                <span className="step-num">1</span>
                <div>
                  <h3 className="step-title">Collect source material</h3>
                  <p className="step-body">
                    Paste text in the editor or attach multiple PDF and Markdown
                    files. Everything is merged into one view for the model.
                  </p>
                </div>
              </li>
              <li className="step">
                <span className="step-num">2</span>
                <div>
                  <h3 className="step-title">Generate structured breakdown</h3>
                  <p className="step-body">
                    The model extracts facts, highlights unknowns, proposes
                    groupings, developer tasks, and Jira-oriented tickets—each
                    tied to quotes or paraphrases from the brief.
                  </p>
                </div>
              </li>
              <li className="step">
                <span className="step-num">3</span>
                <div>
                  <h3 className="step-title">Ship to your workflow</h3>
                  <p className="step-body">
                    Copy Markdown, JSON, or ticket summaries into Confluence,
                    Jira, Linear, or your PMO tool.
                  </p>
                </div>
              </li>
            </ol>
          </div>
        </section>

        <section className="section outcomes-section">
          <div className="section-inner">
            <h2 className="section-title">What you get</h2>
            <div className="outcomes-grid">
              <article className="outcome-card">
                <h3 className="outcome-title">Traceable scope</h3>
                <p className="outcome-body">
                  Work items include brief excerpts so engineers and PMs can
                  verify wording without rereading everything.
                </p>
              </article>
              <article className="outcome-card">
                <h3 className="outcome-title">Explicit risk</h3>
                <p className="outcome-body">
                  Open questions and blocking unknowns stay visible on tasks
                  and tickets instead of buried in chat.
                </p>
              </article>
              <article className="outcome-card">
                <h3 className="outcome-title">Export-ready</h3>
                <p className="outcome-body">
                  Markdown and JSON exports fit docs, repos, and automation.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="cta-section" aria-labelledby="cta-heading">
          <div className="cta-inner">
            <h2 id="cta-heading" className="cta-title">
              Ready to structure your next brief?
            </h2>
            <p className="cta-lede">
              Use the editor to combine pasted text with file uploads in one
              pass.
            </p>
            <Link to="/editor" className="btn primary cta-btn">
              Go to editor
            </Link>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="site-footer-inner">
          <span className="site-footer-brand">TaskForge AI</span>
          <Link to="/editor" className="site-footer-link">
            Editor
          </Link>
        </div>
      </footer>
    </div>
  )
}
