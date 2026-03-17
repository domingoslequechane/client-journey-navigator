import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

export function StudioBanner() {
  const navigate = useNavigate();

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200/50 mb-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,165,0,0.1),transparent_50%)]" />
      
      <div className="relative flex flex-col md:flex-row items-center gap-6 p-6 md:p-10">
        <div className="flex-1 space-y-4 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-200/50 border border-orange-300/50 text-orange-700 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" />
            Novo Recurso
          </div>
          
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Design com <span className="text-primary bg-clip-text text-transparent bg-gradient-to-r from-primary to-orange-600">IA</span>
          </h2>
          
          <p className="text-base text-slate-600 max-w-xl leading-relaxed">
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
          <div className="relative rounded-2xl overflow-hidden border border-white/20 shadow-2xl transition-transform duration-500 group-hover:-translate-y-2">
            <div className="aspect-video w-full">
              <img 
                src="/assets/studio/banner_mockup.png" 
                alt="Design com IA" 
                className="w-full h-full object-cover transform transition-transform duration-700 group-hover:scale-105" 
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Decorative elements */}
      <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute -top-6 -right-6 w-32 h-32 bg-orange-400/10 rounded-full blur-3xl" />
    </div>
  );
}
