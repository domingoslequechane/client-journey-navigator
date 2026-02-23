import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X, ArrowLeft, Star } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { PublicBackground } from '@/components/layout/PublicBackground';

import planLanca from '@/assets/plans/plan-lanca.png';
import planArco from '@/assets/plans/plan-arco.png';
import planCatapulta from '@/assets/plans/plan-catapulta.png';

const plans = [
  {
    key: 'starter',
    name: 'Lança',
    subtitle: 'Crescimento',
    price: 19,
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
    price: 39,
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
    price: 79,
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
      { name: 'Clientes ativos (operacionais)', starter: '15', pro: '50', agency: 'Ilimitado' },
      { name: 'Funil de vendas (prospectos)', starter: 'Ilimitado', pro: 'Ilimitado', agency: 'Ilimitado' },
      { name: 'Pipeline Kanban', starter: true, pro: true, agency: true },
      { name: 'Qualificação BANT', starter: true, pro: true, agency: true },
      { name: 'Exportação de dados', starter: true, pro: true, agency: true },
    ],
  },
  {
    category: 'Contratos & Documentos',
    features: [
      { name: 'Contratos por mês', starter: '15', pro: '50', agency: 'Ilimitado' },
      { name: 'Templates de contrato', starter: '3', pro: '10', agency: 'Ilimitado' },
    ],
  },
  {
    category: 'Inteligência Artificial',
    features: [
      { name: 'QIA - Mensagens/mês', starter: '500', pro: '1200', agency: 'Ilimitado' },
      { name: 'Studio AI - Flyers/mês', starter: '30', pro: '100', agency: 'Ilimitado' },
      { name: 'Sugestões personalizadas', starter: true, pro: true, agency: true },
    ],
  },
  {
    category: 'Módulos',
    features: [
      { name: 'Finanças', starter: true, pro: true, agency: true },
      { name: 'Link23 (páginas)', starter: '1', pro: '5', agency: 'Ilimitado' },
      { name: 'Linha Editorial', starter: true, pro: true, agency: true },
      { name: 'Social Media (contas)', starter: '3', pro: '7', agency: '15' },
      { name: 'Posts sociais/mês', starter: '50', pro: '200', agency: 'Ilimitado' },
      { name: 'Inbox (DMs)', starter: false, pro: true, agency: true },
    ],
  },
  {
    category: 'Equipe & Suporte',
    features: [
      { name: 'Usuários inclusos', starter: '5', pro: '10', agency: '20' },
      { name: 'Academia', starter: true, pro: true, agency: true },
      { name: 'Suporte prioritário', starter: false, pro: true, agency: true },
      { name: 'Suporte VIP dedicado', starter: false, pro: false, agency: true },
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

        <main className="container mx-auto px-4 pt-24 pb-16">
          <div className="text-center mb-8">
            <Badge variant="outline" className="mb-4">Planos & Preços</Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Comparação Completa de Planos
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Todos os planos incluem <strong>14 dias grátis</strong> para testar
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16 max-w-5xl mx-auto">
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
                    <span className="text-4xl font-bold">${plan.price}</span>
                    <span className="text-muted-foreground">/mês</span>
                    <p className="text-sm text-primary font-medium mt-1">14 dias grátis</p>
                  </div>
                  <Link to="/auth">
                    <Button 
                      className="w-full"
                      style={{ 
                        backgroundColor: plan.color,
                        color: 'white'
                      }}
                    >
                      Começar Grátis
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>

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
                              {renderValue(feature.starter, plans[0])}
                            </td>
                            <td className="p-4 text-center">
                              {renderValue(feature.pro, plans[1])}
                            </td>
                            <td className="p-4 text-center">
                              {renderValue(feature.agency, plans[2])}
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

          <div className="text-center mt-16">
            <h2 className="text-2xl font-bold mb-4">Pronto para começar?</h2>
            <p className="text-muted-foreground mb-6">
              Teste grátis por 14 dias. Sem compromisso, cancele quando quiser.
            </p>
            <Link to="/auth">
              <Button size="lg" className="gap-2">
                Criar Conta e Testar Grátis
              </Button>
            </Link>
          </div>
        </main>
      </div>
    </PublicBackground>
  );
};

export default Pricing;
