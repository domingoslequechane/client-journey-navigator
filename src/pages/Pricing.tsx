import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X, ArrowLeft, Star, Gift } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { PublicBackground } from '@/components/layout/PublicBackground';

// Plan images
import planBussola from '@/assets/plans/plan-bussola.png';
import planLanca from '@/assets/plans/plan-lanca.png';
import planArco from '@/assets/plans/plan-arco.png';
import planCatapulta from '@/assets/plans/plan-catapulta.png';

const plans = [
  {
    key: 'free',
    name: 'Bússola',
    subtitle: 'Essencial',
    price: 3,
    originalPrice: 6,
    tagline: 'Encontre o caminho certo para começar!',
    image: planBussola,
    color: 'hsl(142, 71%, 45%)',
    bgColor: 'hsl(142, 71%, 45%, 0.1)',
    borderColor: 'border-green-500/30',
    textColor: 'text-green-500',
  },
  {
    key: 'starter',
    name: 'Lança',
    subtitle: 'Crescimento',
    price: 7.50,
    originalPrice: 15,
    tagline: 'Lance sua marca no mundo digital!',
    image: planLanca,
    color: 'hsl(217, 91%, 60%)',
    bgColor: 'hsl(217, 91%, 60%, 0.1)',
    borderColor: 'border-blue-500/30',
    textColor: 'text-blue-500',
  },
  {
    key: 'pro',
    name: 'Arco',
    subtitle: 'Profissional',
    price: 19.99,
    originalPrice: 39.98,
    tagline: 'Alcance resultados com precisão!',
    image: planArco,
    color: 'hsl(270, 91%, 65%)',
    bgColor: 'hsl(270, 91%, 65%, 0.1)',
    borderColor: 'border-purple-500/30',
    textColor: 'text-purple-500',
    popular: true,
  },
  {
    key: 'agency',
    name: 'Catapulta',
    subtitle: 'Agência',
    price: 49.99,
    originalPrice: 99.98,
    tagline: 'Imponha sua agência no mercado!',
    image: planCatapulta,
    color: 'hsl(25, 95%, 53%)',
    bgColor: 'hsl(25, 95%, 53%, 0.1)',
    borderColor: 'border-orange-500/30',
    textColor: 'text-orange-500',
  },
];

const comparisonFeatures = [
  {
    category: 'Gestão de Clientes',
    features: [
      { name: 'Número de clientes', free: '6', starter: '15', pro: '50', agency: 'Ilimitado' },
      { name: 'Pipeline Kanban', free: true, starter: true, pro: true, agency: true },
      { name: 'Qualificação BANT', free: true, starter: true, pro: true, agency: true },
      { name: 'Histórico de atividades', free: true, starter: true, pro: true, agency: true },
      { name: 'Exportação de dados', free: false, starter: true, pro: true, agency: true },
    ],
  },
  {
    category: 'Contratos & Documentos',
    features: [
      { name: 'Contratos por mês', free: '6', starter: '15', pro: '50', agency: 'Ilimitado' },
      { name: 'Templates de contrato', free: '1', starter: '3', pro: '10', agency: 'Ilimitado' },
      { name: 'Geração automática', free: true, starter: true, pro: true, agency: true },
      { name: 'Personalização avançada', free: true, starter: true, pro: true, agency: true },
    ],
  },
  {
    category: 'Inteligência Artificial',
    features: [
      { name: 'Mensagens IA por mês', free: '150', starter: '500', pro: '1200', agency: 'Ilimitado' },
      { name: 'Assistente de estratégia', free: true, starter: true, pro: true, agency: true },
      { name: 'Análise de cliente', free: true, starter: true, pro: true, agency: true },
      { name: 'Sugestões personalizadas', free: true, starter: true, pro: true, agency: true },
    ],
  },
  {
    category: 'Equipe & Colaboração',
    features: [
      { name: 'Usuários inclusos', free: '2', starter: '7', pro: '10', agency: '20' },
      { name: 'Papéis e permissões', free: true, starter: true, pro: true, agency: true },
      { name: 'Gestão de equipe', free: true, starter: true, pro: true, agency: true },
      { name: 'Auditoria de ações', free: false, starter: false, pro: true, agency: true },
    ],
  },
  {
    category: 'Suporte & Extras',
    features: [
      { name: 'Suporte por email', free: true, starter: true, pro: true, agency: true },
      { name: 'Suporte prioritário', free: false, starter: false, pro: true, agency: true },
      { name: 'Suporte VIP dedicado', free: false, starter: false, pro: false, agency: true },
      { name: 'Onboarding personalizado', free: false, starter: false, pro: false, agency: true },
    ],
  },
];

const Pricing = () => {
  const renderValue = (value: boolean | string, plan: typeof plans[0]) => {
    if (typeof value === 'boolean') {
      return value ? (
        <Check className={`h-5 w-5 ${plan.textColor}`} />
      ) : (
        <X className="h-5 w-5 text-muted-foreground/50" />
      );
    }
    return <span className="font-medium">{value}</span>;
  };

  return (
    <PublicBackground>
      <div className="min-h-screen">
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link to="/" className="flex items-center gap-2">
                <ArrowLeft className="h-5 w-5" />
                <span className="font-bold text-xl">Qualify</span>
              </Link>
              <div className="flex items-center gap-4">
                <ThemeToggle />
                <Link to="/auth">
                  <Button>Começar Agora</Button>
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 pt-24 pb-16">
          {/* Hero */}
          <div className="text-center mb-8">
            <Badge variant="outline" className="mb-4">Planos & Preços</Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Comparação Completa de Planos
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Escolha o plano ideal para o tamanho da sua agência
            </p>
          </div>

          {/* Discount Banner */}
          <Card className="mb-12 border-primary/30 bg-primary/5 overflow-hidden">
            <CardContent className="py-6">
              <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-center md:text-left">
                <div className="p-3 rounded-full bg-primary/10">
                  <Gift className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-primary">50% de desconto aplicado automaticamente!</h3>
                  <p className="text-muted-foreground">
                    Desconto na primeira assinatura aplicado automaticamente no checkout (uso único por agência)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Plan Cards Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {plans.map((plan) => (
              <Card 
                key={plan.key} 
                className={`relative overflow-hidden ${plan.borderColor} ${plan.popular ? 'ring-2 ring-purple-500' : ''}`}
                style={{ backgroundColor: plan.bgColor }}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0">
                    <Badge className="rounded-none rounded-bl-lg bg-purple-500 text-white">
                      <Star className="h-3 w-3 mr-1" />
                      Popular
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-2">
                  <img 
                    src={plan.image} 
                    alt={plan.name}
                    className="w-24 h-24 mx-auto mb-2 object-contain"
                  />
                  <CardTitle className={plan.textColor}>{plan.name}</CardTitle>
                  <CardDescription>{plan.tagline}</CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="mb-4">
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-lg line-through text-muted-foreground">${plan.originalPrice}</span>
                      <Badge variant="secondary" className="text-xs">-50%</Badge>
                    </div>
                    <span className="text-4xl font-bold">${plan.price}</span>
                    <span className="text-muted-foreground">/mês</span>
                  </div>
                  <Link to="/auth">
                    <Button 
                      className="w-full"
                      style={{ 
                        backgroundColor: plan.color,
                        color: 'white'
                      }}
                    >
                      Escolher Plano
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Detailed Comparison Table */}
          <div className="space-y-8">
            <h2 className="text-2xl font-bold text-center mb-8">Comparação Detalhada</h2>
            
            {comparisonFeatures.map((category) => (
              <Card key={category.category} className="overflow-hidden">
                <CardHeader className="bg-muted/50">
                  <CardTitle className="text-lg">{category.category}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-4 font-medium">Recurso</th>
                          {plans.map((plan) => (
                            <th key={plan.key} className="p-4 text-center">
                              <span className={`font-semibold ${plan.textColor}`}>
                                {plan.name}
                              </span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {category.features.map((feature, idx) => (
                          <tr key={feature.name} className={idx % 2 === 0 ? 'bg-muted/20' : ''}>
                            <td className="p-4 text-sm">{feature.name}</td>
                            <td className="p-4 text-center">
                              {renderValue(feature.free, plans[0])}
                            </td>
                            <td className="p-4 text-center">
                              {renderValue(feature.starter, plans[1])}
                            </td>
                            <td className="p-4 text-center">
                              {renderValue(feature.pro, plans[2])}
                            </td>
                            <td className="p-4 text-center">
                              {renderValue(feature.agency, plans[3])}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center mt-16">
            <h2 className="text-2xl font-bold mb-4">Pronto para começar?</h2>
            <p className="text-muted-foreground mb-2">
              Todos os planos incluem 50% de desconto na primeira assinatura
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Desconto aplicado automaticamente no checkout (uso único por agência)
            </p>
            <Link to="/auth">
              <Button size="lg" className="gap-2">
                <Gift className="h-5 w-5" />
                Criar Conta e Assinar
              </Button>
            </Link>
          </div>
        </main>
      </div>
    </PublicBackground>
  );
};

export default Pricing;
