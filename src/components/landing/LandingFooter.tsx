import { Link } from 'react-router-dom';

export function LandingFooter() {
  return (
    <footer className="bg-muted text-muted-foreground py-12 border-t border-border mt-auto w-full">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 bg-primary text-primary-foreground rounded-lg flex items-center justify-center font-black text-sm shadow-sm ring-1 ring-primary/20 opacity-80 group-hover:opacity-100 transition-opacity">
              Q
            </div>
            <span className="font-semibold text-foreground">Qualify</span>
          </div>
          
          <div className="flex gap-8 text-sm font-medium">
            <Link to="/terms" className="hover:text-foreground transition-colors">Termos & Condições</Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">Política de Privacidade</Link>
            <Link to="/contact" className="hover:text-foreground transition-colors">Contato</Link>
          </div>
          
          <p className="text-sm">
            &copy; {new Date().getFullYear()} Qualify Marketing. Direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
