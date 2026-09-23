import Link from "next/link";
import { SearchIcon, SparkIcon } from "@/components/icons";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link href="/" className="brand" aria-label="Recall Knowledge home">
          <span className="brand-mark">
            <SparkIcon />
          </span>
          <span>
            Recall <b>Knowledge</b>
          </span>
        </Link>
        <nav className="nav-links" aria-label="Primary navigation">
          <Link href="/">Overview</Link>
          <Link href="/entities">Wiki</Link>
          <Link href="/meetings">Meetings</Link>
        </nav>
        <Link href="/search" className="search-link">
          <SearchIcon /> Ask the knowledge base
        </Link>
      </header>
      <main>{children}</main>
    </div>
  );
}
