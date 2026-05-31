import { Link } from "wouter";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background selection:bg-accent/30">
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-serif text-2xl font-bold italic tracking-tight text-primary hover:text-accent transition-colors flex items-center gap-2">
            Buffett's Buffet
          </Link>
          <nav>
            <Link href="/research" className="text-sm font-medium text-foreground hover:text-accent transition-colors">
              Research
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {children}
      </main>

      <footer className="border-t border-border/40 bg-primary/5 py-12 mt-12">
        <div className="max-w-5xl mx-auto px-6 flex flex-col items-center justify-center text-center space-y-4">
          <div className="font-serif italic text-xl text-primary/80">
            "Built on data. Inspired by the Oracle of Omaha."
          </div>
          <div className="text-sm text-muted-foreground">
            Historical patterns from 2020–2024 data. Not financial advice.
          </div>
          <a href="https://github.com" target="_blank" rel="noreferrer" className="text-sm font-medium text-primary hover:text-accent transition-colors underline underline-offset-4">
            View on GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
