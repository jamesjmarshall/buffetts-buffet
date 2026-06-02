import { Link, useLocation } from "wouter";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background selection:bg-accent/30">

      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <header className="border-b border-border/40 bg-background/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 group">
            {/* Diner icon */}
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0 shadow-sm group-hover:bg-accent transition-colors">
              <span className="text-sm" aria-hidden="true">🍽️</span>
            </div>
            <span className="font-serif text-xl font-bold italic tracking-tight text-primary group-hover:text-accent transition-colors whitespace-nowrap">
              Buffett's Buffet
            </span>
          </Link>

          <nav className="flex items-center gap-6">
            <Link
              href="/research"
              className={`text-sm font-medium transition-colors ${location === "/research" ? "text-accent" : "text-foreground/70 hover:text-primary"}`}
            >
              Research
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Main ──────────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col">
        {children}
      </main>

      {/* ── Footer ────────────────────────────────────────────────────────────── */}
      <footer className="border-t border-border/40 bg-primary text-primary-foreground mt-12">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="flex flex-col items-center text-center space-y-5">
            {/* Ornamental divider */}
            <svg width="180" height="12" viewBox="0 0 180 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <line x1="0" y1="6" x2="72" y2="6" stroke="hsl(44 54% 54% / 0.5)" strokeWidth="1" />
              <circle cx="80" cy="6" r="2" fill="hsl(44 54% 54% / 0.6)" />
              <circle cx="90" cy="6" r="3.5" fill="hsl(44 54% 54% / 0.6)" />
              <circle cx="100" cy="6" r="2" fill="hsl(44 54% 54% / 0.6)" />
              <line x1="108" y1="6" x2="180" y2="6" stroke="hsl(44 54% 54% / 0.5)" strokeWidth="1" />
            </svg>

            <div className="font-serif italic text-xl text-primary-foreground/80">
              Built by James Marshall
            </div>

            <div className="flex items-center gap-6 text-sm">
              <a
                href="https://github.com/jamesjmarshall"
                target="_blank"
                rel="noreferrer"
                className="text-accent hover:text-accent/80 transition-colors font-medium underline underline-offset-4"
              >
                GitHub
              </a>
              <span className="text-primary-foreground/30">•</span>
              <a
                href="https://linkedin.com/in/jamesjmarshall"
                target="_blank"
                rel="noreferrer"
                className="text-accent hover:text-accent/80 transition-colors font-medium underline underline-offset-4"
              >
                LinkedIn
              </a>
            </div>
            <span className="text-sm text-primary-foreground/50">Historical patterns from 2020–2024. Not financial advice.</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
