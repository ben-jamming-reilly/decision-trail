import Link from "next/link";
import {
  BookOpen,
  CalendarDays,
  CircleHelp,
  Database,
  LayoutDashboard,
  GitBranch,
  Search,
  Settings,
} from "lucide-react";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="brand" aria-label="Decision Trail home">
          <span className="brand-mark">
            <GitBranch size={17} />
          </span>
          <span>Decision Trail</span>
        </Link>
        <nav className="sidebar-nav" aria-label="Primary navigation">
          <p>Workspace</p>
          <Link href="/">
            <LayoutDashboard />
            Overview
          </Link>
          <Link href="/entities">
            <BookOpen />
            Decision memory
          </Link>
          <Link href="/meetings">
            <CalendarDays />
            Conversations
          </Link>
          <Link href="/search">
            <Search />
            Ask across meetings
          </Link>
        </nav>
        <div className="sidebar-nav sidebar-bottom">
          <p>System</p>
          <span>
            <Database />
            PostgreSQL connected
          </span>
          <span>
            <Settings />
            Domain-neutral template
          </span>
          <a href="https://docs.recall.ai" target="_blank" rel="noreferrer">
            <CircleHelp />
            Recall.ai docs
          </a>
        </div>
      </aside>
      <div className="content-shell">
        <header className="topbar">
          <div>
            <span>Workspace</span>
            <b>/</b>
            <strong>Decision memory</strong>
          </div>
          <Link href="/search" className="search-link">
            <Search />
            Search<span className="shortcut">⌘ K</span>
          </Link>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
