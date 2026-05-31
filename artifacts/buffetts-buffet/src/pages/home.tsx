import { useState } from "react";
import { useLocation } from "wouter";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const EXAMPLES = ["AAPL", "KO", "BRK-B", "JNJ"];

export function Home() {
  const [, setLocation] = useLocation();
  const [ticker, setTicker] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (ticker.trim()) {
      setLocation(`/stock/${ticker.trim().toUpperCase()}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-24">
      <div className="max-w-2xl w-full text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="space-y-4">
          <h1 className="font-serif text-6xl sm:text-7xl font-bold tracking-tight text-primary drop-shadow-sm">
            Buffett's Buffet
          </h1>
          <p className="text-lg sm:text-xl text-foreground/80 max-w-xl mx-auto leading-relaxed">
            Warren Buffett has beaten the market for 60 years. We tested his 8 core metrics on nearly 2,000 S&P500 companies to find which ones actually predicted outperformance. 
            <br/><br/>
            Now you can run any stock through the same lens.
          </p>
        </div>

        <div className="bg-card border-2 border-border/50 rounded-xl p-8 shadow-xl max-w-lg mx-auto relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-accent" />
          
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input 
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                placeholder="Enter a ticker (e.g. AAPL)" 
                className="pl-10 h-12 text-lg uppercase bg-background border-primary/20 focus-visible:ring-accent"
              />
            </div>
            <Button type="submit" size="lg" className="h-12 px-8 text-base bg-primary text-primary-foreground hover:bg-primary/90 font-medium tracking-wide">
              Check the Menu
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-border/50 flex flex-col items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Today's Specials</span>
            <div className="flex flex-wrap justify-center gap-2">
              {EXAMPLES.map(ex => (
                <button
                  key={ex}
                  onClick={() => setLocation(`/stock/${ex}`)}
                  className="px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary font-medium text-sm transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
