import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

export function LandingHeader({ t, isScrolled }: { t: any, isScrolled: boolean }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header 
      className={`w-full z-[100] transition-all duration-300 fixed top-0 left-0 right-0 ${
        isScrolled || isMenuOpen
          ? 'bg-background border-b border-border shadow-md py-3' 
          : 'bg-transparent py-5 md:py-8'
      }`}
    >
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-primary text-primary-foreground rounded-lg flex items-center justify-center font-bold text-lg shadow-lg border border-primary/20">
              Q
            </div>
            <span className="text-xl font-bold tracking-tight">Qualify</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#problema" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Desafio</a>
            <a href="#solucao" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Solução</a>
            <a href="#funcionalidades" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Funcionalidades</a>
            <a href="#planos" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Planos</a>
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
          <div className="md:hidden absolute top-full left-0 w-full bg-background/98 backdrop-blur-xl border-b border-border animate-in slide-in-from-top duration-300">
            <nav className="flex flex-col p-6 gap-6">
              <a 
                href="#problema" 
                onClick={() => setIsMenuOpen(false)}
                className="text-lg font-bold text-foreground hover:text-primary transition-colors border-l-4 border-transparent hover:border-primary pl-4"
              >
                Desafio
              </a>
              <a 
                href="#solucao" 
                onClick={() => setIsMenuOpen(false)}
                className="text-lg font-bold text-foreground hover:text-primary transition-colors border-l-4 border-transparent hover:border-primary pl-4"
              >
                Solução
              </a>
              <a 
                href="#funcionalidades" 
                onClick={() => setIsMenuOpen(false)}
                className="text-lg font-bold text-foreground hover:text-primary transition-colors border-l-4 border-transparent hover:border-primary pl-4"
              >
                Funcionalidades
              </a>
              <a 
                href="#planos" 
                onClick={() => setIsMenuOpen(false)}
                className="text-lg font-bold text-foreground hover:text-primary transition-colors border-l-4 border-transparent hover:border-primary pl-4"
              >
                Planos
              </a>
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
