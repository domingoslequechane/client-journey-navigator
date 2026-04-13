import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { cn } from "@/lib/utils";

export function LandingHeader({ t, isScrolled }: { t: any, isScrolled: boolean }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/' && location.pathname !== '/') return false;
    return location.pathname.startsWith(path);
  };

  const linkClass = (path: string) => cn(
    "text-sm font-medium transition-colors hover:text-primary",
    isActive(path) ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
  );

  const mobileLinkClass = (path: string) => cn(
    "text-lg font-bold transition-colors border-l-4 pl-4",
    isActive(path) 
      ? "text-primary border-primary" 
      : "text-foreground hover:text-primary border-transparent hover:border-primary"
  );

  return (
    <header 
      className={cn(
        "z-[250] transition-all duration-300 fixed top-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[1355px] border border-border/50 shadow-xl py-3 rounded-2xl",
        isMenuOpen ? "bg-background/80 backdrop-blur-lg shadow-2xl" : "bg-background/80 backdrop-blur-lg shadow-xl"
      )}
    >
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group transition-opacity hover:opacity-80">
            <div className="h-9 w-9 bg-primary text-primary-foreground rounded-xl flex items-center justify-center font-black text-xl shadow-lg border-2 border-primary/20 ring-4 ring-primary/5">
              Q
            </div>
            <span className="text-2xl font-black tracking-tighter text-foreground">Qualify</span>
          </Link>

          {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
            <Link to="/" className={linkClass('/')}>Home</Link>
            <Link to="/features" className={linkClass('/features')}>Funcionalidades</Link>
            <Link to="/about" className={linkClass('/about')}>Sobre</Link>
            <Link to="/pricing" className={linkClass('/pricing')}>Planos</Link>
            <Link to="/insights" className={linkClass('/insights')}>Insights</Link>
            <Link to="/contact" className={linkClass('/contact')}>Contato</Link>
          </nav>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-4">
              <ThemeToggle />
              <Link to="/auth">
                <span className="text-sm font-semibold hover:text-primary transition-colors cursor-pointer">
                  Entrar
                </span>
              </Link>
              <Link to="/auth">
                <Button className="rounded-xl px-6 shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 font-bold" size="sm">
                  {t('header.ctaMobile')}
                </Button>
              </Link>
            </div>

            {/* Mobile Actions */}
            <div className="flex md:hidden items-center gap-3">
              <ThemeToggle />
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 text-foreground hover:bg-muted rounded-lg transition-colors"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Overlay */}
        {isMenuOpen && (
          <div className="md:hidden w-full bg-transparent animate-in slide-in-from-top duration-300">
            <nav className="flex flex-col p-6 gap-6">
              <Link 
                to="/" 
                onClick={() => setIsMenuOpen(false)}
                className={mobileLinkClass('/')}
              >
                Home
              </Link>
              <Link 
                to="/features" 
                onClick={() => setIsMenuOpen(false)}
                className={mobileLinkClass('/features')}
              >
                Funcionalidades
              </Link>
              <Link 
                to="/about" 
                onClick={() => setIsMenuOpen(false)}
                className={mobileLinkClass('/about')}
              >
                Sobre
              </Link>
              <Link 
                to="/pricing" 
                onClick={() => setIsMenuOpen(false)}
                className={mobileLinkClass('/pricing')}
              >
                Planos
              </Link>
              <Link 
                to="/insights" 
                onClick={() => setIsMenuOpen(false)}
                className={mobileLinkClass('/insights')}
              >
                Insights
              </Link>
              <Link 
                to="/contact" 
                onClick={() => setIsMenuOpen(false)}
                className={mobileLinkClass('/contact')}
              >
                Contato
              </Link>
              <div className="pt-6 border-t border-border flex flex-col gap-4">
                <Link to="/auth" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="outline" className="w-full text-base font-bold rounded-xl h-12">
                    Entrar
                  </Button>
                </Link>
                <Link to="/auth" onClick={() => setIsMenuOpen(false)}>
                  <Button className="w-full text-base font-bold rounded-xl h-12 shadow-lg">
                    {t('header.ctaMobile')}
                  </Button>
                </Link>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
