import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

export function StudioBanner() {
  const navigate = useNavigate();

  return (
    <div className="relative overflow-hidden rounded-3xl transition-colors duration-300 shadow-xl
      bg-gradient-to-br from-white to-slate-50 border border-slate-200 mb-8
      dark:bg-[#1a1a1a] dark:border-slate-800">
      
      {/* Dynamic Background Accents */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,165,0,0.05),transparent_50%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(255,165,0,0.1),transparent_50%)]" />
      
      <div className="relative flex flex-col md:flex-row items-center gap-6 p-6 md:p-10">
        <div className="flex-1 space-y-4 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full 
            bg-orange-100 border border-orange-200 text-orange-700 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm
            dark:bg-orange-500/10 dark:border-orange-500/20 dark:text-orange-400">
            <Sparkles className="h-3.5 w-3.5" />
            Novo Recurso
          </div>
          
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight dark:text-white">
            Design com <span className="text-primary bg-clip-text text-transparent bg-gradient-to-r from-primary to-orange-600">IA</span>
          </h2>
          
          <p className="text-base text-slate-600 max-w-xl leading-relaxed dark:text-slate-400">
            Crie flyers e materiais profissionais em segundos. O Qualify utiliza as tecnologias mais avançadas de visão computacional para transformar suas ideias em realidade.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
            <Button 
              onClick={() => navigate('/app/studio/tools/flyer')}
              size="lg" 
              className="rounded-full px-8 h-11 text-base font-semibold shadow-xl shadow-primary/20 transition-transform hover:scale-105 active:scale-95"
            >
              Explorar agora
            </Button>
          </div>
        </div>
        
        <div className="flex-1 relative group w-full max-w-[650px]">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary to-orange-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
          <div className="relative rounded-2xl overflow-hidden border border-white/20 dark:border-slate-800 transition-all duration-500">
            <div className="aspect-video w-full bg-slate-100 dark:bg-slate-800">
              <img 
                src="/assets/studio/banner_mockup.png" 
                alt="Design com IA" 
                className="w-full h-full object-cover" 
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Decorative elements */}
      <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-primary/5 rounded-full blur-3xl dark:bg-primary/10" />
      <div className="absolute -top-6 -right-6 w-32 h-32 bg-orange-400/5 rounded-full blur-3xl dark:bg-orange-400/10" />
    </div>
  );
}
