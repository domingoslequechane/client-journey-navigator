import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

export function StudioBanner() {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200/50 mb-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,165,0,0.1),transparent_50%)]" />
      
      <div className="relative flex flex-col md:flex-row items-center gap-8 p-8 md:p-12">
        <div className="flex-1 space-y-6 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-200/50 border border-orange-300/50 text-orange-700 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm animate-pulse">
            <Sparkles className="h-3.5 w-3.5" />
            Novo Recurso
          </div>
          
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Design com <span className="text-primary bg-clip-text text-transparent bg-gradient-to-r from-primary to-orange-600">IA</span>
          </h2>
          
          <p className="text-lg text-slate-600 max-w-xl leading-relaxed">
            Crie flyers e materiais profissionais em segundos. O Qualify utiliza as tecnologias mais avançadas de visão computacional para transformar suas ideias em realidade.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
            <Button size="lg" className="rounded-full px-8 h-12 text-base font-semibold shadow-xl shadow-primary/20 transition-transform hover:scale-105 active:scale-95">
              Explorar agora
            </Button>
            <p className="text-sm font-medium text-slate-400">
              Mais de 1.000 designs gerados hoje
            </p>
          </div>
        </div>
        
        <div className="flex-1 relative group w-full max-w-[500px]">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary to-orange-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
          <div className="relative rounded-2xl overflow-hidden border border-white/20 shadow-2xl transition-transform duration-500 group-hover:-translate-y-2 group-hover:rotate-1">
            <img 
              src="/assets/studio/banner.png" 
              alt="Design com IA" 
              className="w-full h-auto object-cover transform transition-transform duration-700 group-hover:scale-110" 
            />
          </div>
        </div>
      </div>
      
      {/* Decorative elements */}
      <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute -top-6 -right-6 w-32 h-32 bg-orange-400/10 rounded-full blur-3xl" />
    </div>
  );
}
