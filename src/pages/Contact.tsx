import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { BackToTop } from '@/components/BackToTop';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Mail, Phone, MapPin, Send, MessageSquare, Clock, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { validateAndSanitize, sanitizeObject } from '@/lib/sanitize';
import { useRateLimit } from '@/hooks/useRateLimit';

const CONTACT_RATE_LIMIT = { maxRequests: 5, windowMs: 60000 };

export default function Contact() {
  const { t } = useTranslation('landing');
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { checkRateLimit, isRateLimited } = useRateLimit(CONTACT_RATE_LIMIT);
  
  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!checkRateLimit()) {
      return;
    }
    
    setIsSubmitting(true);
    
    const formData = new FormData(e.target as HTMLFormElement);
    const nameRaw = formData.get('name') as string;
    const emailRaw = formData.get('email') as string;
    const companyRaw = formData.get('company') as string;
    const messageRaw = formData.get('message') as string;

    const nameValidation = validateAndSanitize('Nome', nameRaw || '', 'name');
    const emailValidation = validateAndSanitize('Email', emailRaw || '', 'email');
    const companyValidation = validateAndSanitize('Empresa', companyRaw || '', 'text');
    const messageValidation = validateAndSanitize('Mensagem', messageRaw || '', 'text');

    if (!nameValidation.isValid) {
      toast.error(nameValidation.error || 'Nome inválido');
      setIsSubmitting(false);
      return;
    }
    if (!emailValidation.isValid) {
      toast.error(emailValidation.error || 'Email inválido');
      setIsSubmitting(false);
      return;
    }
    if (!companyValidation.isValid) {
      toast.error(companyValidation.error || 'Empresa inválida');
      setIsSubmitting(false);
      return;
    }
    if (!messageValidation.isValid) {
      toast.error(messageValidation.error || 'Mensagem inválida');
      setIsSubmitting(false);
      return;
    }

    const data = sanitizeObject({
      name: nameValidation.sanitized,
      email: emailValidation.sanitized,
      company: companyValidation.sanitized,
      subject: (e.target as HTMLFormElement).querySelector('select')?.value || 'Contato Web',
      message: messageValidation.sanitized,
    });

    try {
      const { data: response, error } = await supabase.functions.invoke('send-landing-contact', {
        body: data,
      });

      if (error) throw error;

      toast.success('Mensagem enviada com sucesso! Um de nossos associados responderá ao seu email corporativo muito em breve.');
      (e.target as HTMLFormElement).reset();
    } catch (error: any) {
      console.error('Error sending contact form:', error);
      toast.error('Erro ao enviar mensagem. Por favor, tente novamente mais tarde.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <LandingHeader t={t} isScrolled={isScrolled} />
      
      <div className="flex-1 w-full bg-background text-foreground font-sans relative overflow-x-hidden pt-36 lg:pt-48 pb-24">
        {/* Background elements */}
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none -translate-x-1/2" />
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl pointer-events-none translate-x-1/2" />

        <main className="container mx-auto px-6 max-w-6xl relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Entre em <span className="text-primary">Contato</span></h1>
            <p className="text-lg text-muted-foreground">
              Nossa equipe gerencial está pronta para ajudar. Se você tem dúvidas comerciais, busca consultoria para implementação na sua agência ou deseja discutir planos corporativos customizados (Plano Catapulta+), fale conosco abaixo.
            </p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20">
            {/* Left side: Contact Info */}
            <div className="space-y-6">
              
              <h2 className="text-2xl font-bold mb-4">Oficina Central Qualify</h2>

              <Card className="bg-card border-border/50 shadow-sm hover:shadow-md hover:border-primary/30 transition-all group">
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <MapPin className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">Nosso Escritório</h3>
                    <p className="text-muted-foreground mb-2 leading-relaxed">
                      Rua Alfredo Lawley, Beira, Sofala, 2100<br/>
                      Moçambique
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="grid sm:grid-cols-2 gap-6">
                <Card className="bg-card border-border/50 shadow-sm hover:shadow-md hover:border-primary/30 transition-all group">
                  <CardContent className="p-6">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:-translate-y-1 transition-transform">
                      <Mail className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-bold mb-1">E-mail de Negócios</h3>
                    <a href="mailto:comercial@qualify.app" className="text-sm text-primary font-medium hover:underline">
                      comercial@qualify.app
                    </a>
                  </CardContent>
                </Card>
                
                <Card className="bg-card border-border/50 shadow-sm hover:shadow-md hover:border-primary/30 transition-all group">
                  <CardContent className="p-6">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:-translate-y-1 transition-transform">
                      <Clock className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-bold mb-1">Horário Operacional</h3>
                    <p className="text-sm text-muted-foreground">
                      Seg-Sab, 08h às 17h (MPT)<br/>
                      <span className="text-xs italic">*Suporte logado 24/7.</span>
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-card border-border/50 shadow-sm hover:shadow-md hover:border-primary/30 transition-all group bg-gradient-to-br from-background to-primary/5">
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">Dificuldades Técnicas?</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-3">
                      Se você já é um cliente ativo e precisa reportar problemas vitais, utilize o Módulo de Suporte localizado no canto inferior da aplicação web acessando o seu painel de Agência. Contratos VIP possuem tempo de retorno estimado (SLA) inferior a 2 horas.
                    </p>
                  </div>
                </CardContent>
              </Card>

            </div>
            
            {/* Right side: Contact Form */}
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-violet-500/20 rounded-3xl blur opacity-70" />
              <Card className="bg-card border-border/50 shadow-2xl relative z-10 rounded-3xl">
                <CardContent className="p-8 md:p-10">
                  <h2 className="text-2xl font-bold mb-6">Fale Diretamente</h2>
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                      <label htmlFor="name" className="text-sm font-medium">Responsável C-Level / Sócio</label>
                      <Input id="name" name="name" placeholder="Seu nome completo" required className="h-12 bg-background border-border" />
                    </div>
                    
                    <div className="grid sm:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-medium">E-mail Operacional</label>
                        <Input id="email" name="email" type="email" placeholder="seu@dominio.com.br" required className="h-12 bg-background border-border" />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="company" className="text-sm font-medium">Sua Agência / Consultoria</label>
                        <Input id="company" name="company" placeholder="Ex: Onix Agencia" className="h-12 bg-background border-border" />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="subject" className="text-sm font-medium">Motivo do Contato</label>
                      <select 
                        id="subject" 
                        required 
                        className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                      >
                        <option value="" disabled selected>Selecione um tópico...</option>
                        <option value="sales">Comercial e Planos (Sales)</option>
                        <option value="partnership">Parcerias Estratégicas</option>
                        <option value="technical">Integração Externa Personalizada</option>
                        <option value="other">Outros Demais</option>
                      </select>
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor="message" className="text-sm font-medium">Mensagem ou Proposta</label>
                      <Textarea id="message" name="message" placeholder="Conte-nos o contexto da sua necessidade ou os problemas atuais da sua operação e faturamento..." required className="min-h-[150px] bg-background border-border resize-y" />
                    </div>
                    
                    <Button type="submit" disabled={isSubmitting} className="w-full h-14 text-base font-bold rounded-xl mt-4">
                      {isSubmitting ? (
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                          Processando...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          Enviar Contato Expresso
                          <Send className="w-4 h-4" />
                        </div>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center mt-4">
                      Ao prosseguir, as informações são regidas pela LGPD local de nossa <a href="/privacy" className="underline hover:text-primary">Política de Privacidade</a>.
                    </p>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>

      <LandingFooter />
      <BackToTop />
    </div>
  );
}
