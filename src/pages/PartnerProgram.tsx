import { useState } from "react";
import { PublicBackground } from "@/components/layout/PublicBackground";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Shield,
  Award,
  Crown,
  Users,
  Percent,
  Gift,
  Headphones,
  Calendar,
  FileText,
  Megaphone,
  CheckCircle2,
  ArrowRight,
  Handshake,
  Rocket,
  Target,
  Zap,
  TrendingUp,
  Heart,
  Loader2,
  Facebook,
  Instagram,
  Linkedin,
  Youtube,
  Link
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PartnerLevelCardProps {
  level: "bronze" | "prata" | "ouro";
  icon: React.ReactNode;
  range: string;
  partnerDiscount: string;
  audienceDiscount: string;
  benefits: string[];
  support: string;
}

function PartnerLevelCard({ level, icon, range, partnerDiscount, audienceDiscount, benefits, support }: PartnerLevelCardProps) {
  const levelStyles = {
    bronze: {
      gradient: "from-amber-600/20 to-orange-700/20",
      border: "border-amber-500/30",
      badge: "bg-amber-500/20 text-amber-300 border-amber-500/30",
      icon: "text-amber-400",
      title: "Bronze"
    },
    prata: {
      gradient: "from-slate-400/20 to-gray-500/20",
      border: "border-slate-400/30",
      badge: "bg-slate-400/20 text-slate-300 border-slate-400/30",
      icon: "text-slate-300",
      title: "Prata"
    },
    ouro: {
      gradient: "from-yellow-500/20 to-amber-400/20",
      border: "border-yellow-500/30",
      badge: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
      icon: "text-yellow-400",
      title: "Ouro"
    }
  };

  const style = levelStyles[level];

  return (
    <Card className={`relative overflow-hidden bg-gradient-to-br ${style.gradient} ${style.border} backdrop-blur-sm`}>
      {level === "ouro" && (
        <div className="absolute top-0 right-0 px-3 py-1 bg-yellow-500/30 text-yellow-200 text-xs font-semibold rounded-bl-lg">
          MELHOR VALOR
        </div>
      )}
      <CardHeader className="text-center pb-2">
        <div className={`mx-auto p-4 rounded-full bg-background/10 ${style.icon} mb-4`}>
          {icon}
        </div>
        <Badge variant="outline" className={style.badge}>
          {style.title}
        </Badge>
        <CardTitle className="text-2xl mt-3 text-foreground">{range}</CardTitle>
        <CardDescription className="text-muted-foreground">indicados ativos</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-1">Seu desconto</p>
          <p className="text-3xl font-bold text-primary">{partnerDiscount}</p>
        </div>

        <Separator className="bg-border/30" />

        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-1">Desconto para sua audiência</p>
          <p className="text-xl font-semibold text-foreground">{audienceDiscount}</p>
          <p className="text-xs text-muted-foreground">(primeiros 6 meses)</p>
        </div>

        <Separator className="bg-border/30" />

        <div>
          <p className="text-sm font-medium text-foreground mb-3">Benefícios incluídos:</p>
          <ul className="space-y-2">
            {benefits.map((benefit, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="pt-2">
          <p className="text-xs text-muted-foreground text-center">
            <Headphones className="h-3 w-3 inline mr-1" />
            {support}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PartnerProgram() {
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    whatsapp: "",
    message: "",
    socialMedia: {
      facebook: "",
      instagram: "",
      linkedin: "",
      tiktok: "",
      youtube: "",
      other: ""
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.whatsapp) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha email e WhatsApp.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke("send-partner-inquiry", {
        body: {
          email: formData.email,
          whatsapp: formData.whatsapp,
          message: formData.message || undefined,
          socialMedia: formData.socialMedia
        }
      });

      if (error) throw error;

      toast({
        title: "Solicitação enviada!",
        description: "Entraremos em contato em breve. Obrigado pelo interesse!"
      });
      
      setIsModalOpen(false);
      setFormData({ email: "", whatsapp: "", message: "", socialMedia: { facebook: "", instagram: "", linkedin: "", tiktok: "", youtube: "", other: "" } });
    } catch (error: any) {
      console.error("Error submitting partner inquiry:", error);
      toast({
        title: "Erro ao enviar",
        description: "Ocorreu um erro. Por favor, tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const partnerLevels: PartnerLevelCardProps[] = [
    {
      level: "bronze",
      icon: <Shield className="h-8 w-8" />,
      range: "0 – 50",
      partnerDiscount: "50% OFF",
      audienceDiscount: "10% OFF",
      benefits: [
        "Cupom personalizado exclusivo",
        "Dashboard de acompanhamento",
        "Material de divulgação básico",
        "Acesso à comunidade de parceiros"
      ],
      support: "Suporte por e-mail"
    },
    {
      level: "prata",
      icon: <Award className="h-8 w-8" />,
      range: "51 – 149",
      partnerDiscount: "75% OFF",
      audienceDiscount: "15-25% OFF",
      benefits: [
        "Todos os benefícios Bronze",
        "Co-marketing em campanhas",
        "Menção em cases de sucesso",
        "Prioridade em novos recursos"
      ],
      support: "Suporte prioritário"
    },
    {
      level: "ouro",
      icon: <Crown className="h-8 w-8" />,
      range: "150+",
      partnerDiscount: "100% VITALÍCIO",
      audienceDiscount: "Até 50% OFF",
      benefits: [
        "Todos os benefícios Prata",
        "Patrocínio em eventos próprios",
        "Acesso antecipado a features",
        "Linha direta com fundadores"
      ],
      support: "Gerente de conta dedicado"
    }
  ];

  const discountTable = [
    {
      plan: "Lança",
      icon: <Zap className="h-5 w-5" />,
      bronzeDiscount: "10%",
      prataDiscount: "25%",
      ouroDiscount: "50%",
      profile: "Agências consolidadas"
    },
    {
      plan: "Arco",
      icon: <Target className="h-5 w-5" />,
      bronzeDiscount: "10%",
      prataDiscount: "20%",
      ouroDiscount: "35%",
      profile: "Agências em crescimento"
    },
    {
      plan: "Catapulta",
      icon: <Rocket className="h-5 w-5" />,
      bronzeDiscount: "10%",
      prataDiscount: "15%",
      ouroDiscount: "25%",
      profile: "Agências iniciantes"
    }
  ];

  const eventSupport = [
    {
      icon: <Gift className="h-8 w-8" />,
      title: "Patrocínio Financeiro",
      description: "Apoio financeiro para eventos presenciais ou online da sua comunidade."
    },
    {
      icon: <FileText className="h-8 w-8" />,
      title: "Material de Apoio",
      description: "Slides, banners, vídeos e materiais personalizados para suas apresentações."
    },
    {
      icon: <Megaphone className="h-8 w-8" />,
      title: "Divulgação Cruzada",
      description: "Promovemos seu evento em nossos canais oficiais e base de usuários."
    }
  ];

  const rules = [
    "Indicados devem permanecer ativos por pelo menos 60 dias para contar",
    "Descontos para audiência são válidos apenas nos primeiros 6 meses",
    "Upgrade de nível é automático ao atingir a meta de indicados",
    "Downgrade ocorre se indicados ativos caírem abaixo do mínimo por 90 dias",
    "Cupom de desconto é pessoal e intransferível",
    "Parceiros Ouro mantêm o benefício vitalício mesmo sem novos indicados"
  ];

  const steps = [
    {
      number: "01",
      title: "Onboarding",
      description: "Reunião de 15 minutos para conhecer o programa e alinhar expectativas.",
      icon: <Calendar className="h-6 w-6" />
    },
    {
      number: "02",
      title: "Setup",
      description: "Criação do seu cupom personalizado e acesso ao dashboard de parceiro.",
      icon: <Zap className="h-6 w-6" />
    },
    {
      number: "03",
      title: "Lançamento",
      description: "Primeira divulgação com nosso suporte e materiais profissionais.",
      icon: <Rocket className="h-6 w-6" />
    }
  ];

  return (
    <PublicBackground>
      <div className="min-h-screen">
        {/* Hero Section */}
        <section className="pt-24 pb-16 px-4">
          <div className="container mx-auto max-w-6xl text-center">
            <Badge variant="outline" className="mb-6 border-primary/30 text-primary">
              <Handshake className="h-4 w-4 mr-2" />
              Programa Oficial
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">
              Programa de Parcerias
              <span className="block text-primary mt-2">Qualify AI CRM</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-4">
              Seja bem-vindo ao ecossistema de crescimento da Qualify
            </p>
            <p className="text-lg text-primary/80 font-medium italic">
              "Crescendo juntos, um lead por vez."
            </p>
          </div>
        </section>

        {/* Overview Section */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-4xl">
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardContent className="p-8 md:p-12">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <TrendingUp className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">Visão Geral</h2>
                </div>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  O Programa de Parcerias da Qualify foi criado para <strong className="text-foreground">profissionais de marketing, 
                  educadores e líderes de comunidade</strong> que desejam agregar valor à sua audiência enquanto 
                  constroem uma nova fonte de receita. Ao se tornar parceiro, você oferece uma{" "}
                  <strong className="text-foreground">camada de inteligência</strong> para a gestão de clientes, 
                  ajudando agências a saírem do caos e entrarem em uma operação previsível e escalável.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Partner Levels */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-foreground mb-4">Níveis de Parceria</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Quanto mais você cresce, mais benefícios você desbloqueia. Seus ganhos aumentam 
                proporcionalmente ao impacto que você gera.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
              {partnerLevels.map((level) => (
                <PartnerLevelCard key={level.level} {...level} />
              ))}
            </div>
          </div>
        </section>

        {/* Discount Table */}
        <section className="py-16 px-4 bg-background/50">
          <div className="container mx-auto max-w-4xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                <Percent className="h-8 w-8 inline mr-3 text-primary" />
                Descontos para sua Audiência
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Seus indicados recebem descontos exclusivos nos primeiros 6 meses de assinatura.
              </p>
            </div>
            <Card className="bg-card/50 backdrop-blur-sm border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead className="text-foreground">Plano</TableHead>
                    <TableHead className="text-center text-amber-400">Bronze</TableHead>
                    <TableHead className="text-center text-slate-300">Prata</TableHead>
                    <TableHead className="text-center text-yellow-400">Ouro</TableHead>
                    <TableHead className="text-muted-foreground hidden md:table-cell">Perfil</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {discountTable.map((row) => (
                    <TableRow key={row.plan} className="border-border/30">
                      <TableCell className="font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <span className="text-primary">{row.icon}</span>
                          {row.plan}
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-semibold text-amber-400">{row.bronzeDiscount}</TableCell>
                      <TableCell className="text-center font-semibold text-slate-300">{row.prataDiscount}</TableCell>
                      <TableCell className="text-center font-semibold text-yellow-400">{row.ouroDiscount}</TableCell>
                      <TableCell className="text-muted-foreground hidden md:table-cell">{row.profile}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        </section>

        {/* Event Support */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                <Users className="h-8 w-8 inline mr-3 text-primary" />
                Apoio a Eventos e Comunidade
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Queremos que você brilhe. Por isso, oferecemos suporte para suas iniciativas.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {eventSupport.map((item) => (
                <Card key={item.title} className="bg-card/50 backdrop-blur-sm border-border/50 text-center">
                  <CardContent className="p-8">
                    <div className="mx-auto p-4 rounded-full bg-primary/10 text-primary w-fit mb-6">
                      {item.icon}
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-3">{item.title}</h3>
                    <p className="text-muted-foreground">{item.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Rules */}
        <section className="py-16 px-4 bg-background/50">
          <div className="container mx-auto max-w-3xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-foreground mb-4">Regras e Condições</h2>
              <p className="text-muted-foreground">
                Transparência em primeiro lugar. Conheça as regras do programa.
              </p>
            </div>
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardContent className="p-8">
                <ul className="space-y-4">
                  {rules.map((rule, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{rule}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* How to Start */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-4xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-foreground mb-4">Como Começar</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Em apenas 3 passos simples, você estará pronto para crescer conosco.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 mb-12">
              {steps.map((step, index) => (
                <div key={step.number} className="relative">
                  <div className="text-center">
                    <div className="mx-auto p-4 rounded-full bg-primary/10 text-primary w-fit mb-4">
                      {step.icon}
                    </div>
                    <div className="text-4xl font-bold text-primary/30 mb-2">{step.number}</div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">{step.title}</h3>
                    <p className="text-muted-foreground text-sm">{step.description}</p>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="hidden md:block absolute top-1/4 right-0 translate-x-1/2">
                      <ArrowRight className="h-6 w-6 text-primary/30" />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="text-center">
              <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20 inline-block">
                <CardContent className="p-8">
                  <Heart className="h-10 w-10 text-primary mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-foreground mb-3">
                    Pronto para fazer parte?
                  </h3>
                  <p className="text-muted-foreground mb-6 max-w-md">
                    Entre em contato conosco e comece sua jornada como parceiro Qualify.
                  </p>
                  <Button size="lg" className="gap-2" onClick={() => setIsModalOpen(true)}>
                    Quero ser parceiro
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 px-4 border-t border-border/30">
          <div className="container mx-auto max-w-6xl text-center">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Qualify AI CRM. Todos os direitos reservados.
            </p>
          </div>
        </footer>

        {/* Partner Inquiry Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Handshake className="h-5 w-5 text-primary" />
                Quero ser parceiro
              </DialogTitle>
              <DialogDescription>
                Preencha seus dados e entraremos em contato para iniciar sua jornada como parceiro Qualify.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp *</Label>
                <PhoneInput
                  value={formData.whatsapp}
                  onChange={(value) => setFormData(prev => ({ ...prev, whatsapp: value || "" }))}
                  defaultCountry="MZ"
                  placeholder="+258 84 123 4567"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Mensagem (opcional)</Label>
                <Textarea
                  id="message"
                  placeholder="Conte-nos um pouco sobre você e sua audiência..."
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  rows={3}
                />
              </div>
              
              {/* Social Media Section */}
              <div className="space-y-3 pt-2">
                <Label className="text-base font-medium">Mídias Sociais (opcional)</Label>
                <p className="text-sm text-muted-foreground">Informe os links das suas redes sociais</p>
                
                <div className="grid gap-3">
                  <div className="flex items-center gap-2">
                    <Facebook className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Input
                      placeholder="https://facebook.com/seuperfil"
                      value={formData.socialMedia.facebook}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        socialMedia: { ...prev.socialMedia, facebook: e.target.value } 
                      }))}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Instagram className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Input
                      placeholder="https://instagram.com/seuperfil"
                      value={formData.socialMedia.instagram}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        socialMedia: { ...prev.socialMedia, instagram: e.target.value } 
                      }))}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Linkedin className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Input
                      placeholder="https://linkedin.com/in/seuperfil"
                      value={formData.socialMedia.linkedin}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        socialMedia: { ...prev.socialMedia, linkedin: e.target.value } 
                      }))}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-muted-foreground shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                    </svg>
                    <Input
                      placeholder="https://tiktok.com/@seuperfil"
                      value={formData.socialMedia.tiktok}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        socialMedia: { ...prev.socialMedia, tiktok: e.target.value } 
                      }))}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Youtube className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Input
                      placeholder="https://youtube.com/@seucanal"
                      value={formData.socialMedia.youtube}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        socialMedia: { ...prev.socialMedia, youtube: e.target.value } 
                      }))}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Link className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Input
                      placeholder="Outro link (site, blog, etc.)"
                      value={formData.socialMedia.other}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        socialMedia: { ...prev.socialMedia, other: e.target.value } 
                      }))}
                    />
                  </div>
                </div>
              </div>
              <Button type="submit" className="w-full gap-2" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    Enviar solicitação
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </PublicBackground>
  );
}
