import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X, ArrowLeft, Star, Sparkles } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { PublicBackground } from '@/components/layout/PublicBackground';

import planLanca from '@/assets/plans/plan-lanca.png';
import planArco from '@/assets/plans/plan-arco.png';
import planCatapulta from '@/assets/plans/plan-catapulta.png';

const plans = [
  {
    key: 'starter',
    name: 'Lança',
    subtitle: 'Freelancers / Pequenas Agências',
    price: '$19',
    tagline: 'O essencial para começar a crescer.',
    image: planLanca,
    color: 'hsl(var(--primary))',
    bgColor: 'hsl(var(--primary) / 0.1)',
    borderColor: 'border-primary/30',
    textColor: 'text-primary',
    features: [
      '5 Marcas (Clientes)',
      'Redes Sociais Ilimitadas',
      '5 Créditos Studio AI / dia',
      'Módulos: Finanças, Editorial, Link23'
    ]
  },
  {
    key: 'pro',
    name: 'Arco',
    subtitle: 'Agências em Crescimento',
    price: '$54',
    tagline: 'Ferramentas para escalar seus resultados.',
    image: planArco,
    color: 'hsl(var(--primary))',
    bgColor: 'hsl(var(--primary) / 0.1)',
    borderColor: 'border-primary/40',
    textColor: 'text-primary',
    popular: true,
    recommended: 'Mais Popular',
    features: [
      '15 Marcas (Clientes)',
      '15 Créditos Studio AI / dia',
      'Tudo + Inbox/Analytics',
      'Suporte Prioritário'
    ]
  },
  {
    key: 'agency',
    name: 'Catapulta',
    subtitle: 'Grandes Agências / White Label',
    price: '$99',
    tagline: 'Poder total para dominar o mercado.',
    image: planCatapulta,
    color: 'hsl(var(--primary))',
    bgColor: 'hsl(var(--primary) / 0.1)',
    borderColor: 'border-primary/30',
    textColor: 'text-primary',
    features: [
      '30 Marcas (Clientes)',
      '30 Créditos Studio AI / dia',
      'Tudo + Suporte VIP',
      'Todos os Módulos'
    ]
  },
];

const comparisonFeatures = [
  {
    category: 'Geral',
    features: [
      { name: 'Marcas (Clientes)', starter: '5', pro: '15', agency: '30' },
      { name: 'Redes Sociais (por marca)', starter: 'Ilimitado', pro: 'Ilimitado', agency: 'Ilimitado' },
      { name: 'Postagens Mensais', starter: 'Ilimitado', pro: 'Ilimitado', agency: 'Ilimitado' },
    ],
  },
  {
    category: 'Inteligência Artificial',
    features: [
      { name: 'Studio AI (Créditos / dia)', starter: '5', pro: '15', agency: '30' },
      { name: 'QIA - Mensagens/mês', starter: '500', pro: '1200', agency: 'Ilimitado' },
    ],
  },
  {
    category: 'Módulos e Suporte',
    features: [
      { name: 'Finanças, Editorial, Link23', starter: true, pro: true, agency: true },
      { name: 'Inbox & Analytics', starter: false, pro: true, agency: true },
      { name: 'Suporte VIP Dedicado', starter: false, pro: false, agency: true },
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
      <div className="h-screen overflow-y-auto custom-scrollbar">
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
              Escolha o plano ideal para sua agência
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Todos os planos incluem <strong>7 dias grátis</strong> para testar
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <Card 
                key={plan.key} 
                className={`relative overflow-hidden ${plan.borderColor} ${plan.popular ? 'ring-2 ring-primary shadow-xl' : ''}`}
                style={{ backgroundColor: plan.bgColor }}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0">
                    <Badge className="rounded-none rounded-bl-lg bg-primary text-primary-foreground">
                      <Star className="h-3 w-3 mr-1" />
                      {plan.recommended || 'Popular'}
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
                  <CardDescription className="font-medium text-foreground/80">{plan.subtitle}</CardDescription>
                  <CardDescription className="italic">{plan.tagline}</CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="mb-4">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <p className="text-sm text-muted-foreground mt-1">por mês</p>
                    <p className="text-xs font-bold text-orange-500 uppercase mt-1">7 dias grátis</p>
                  </div>

                  <ul className="space-y-2 mb-6 text-left">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        <Check className={`h-4 w-4 shrink-0 ${plan.textColor}`} />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link to="/auth">
                    <Button
                      className="w-full gap-2"
                      style={{
                        backgroundColor: plan.color,
                        color: 'white'
                      }}
                    >
                      <Sparkles className="h-4 w-4" />
                      Começar Agora
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
                              {renderValue((feature as any).starter, plans[0])}
                            </td>
                            <td className="p-4 text-center">
                              {renderValue((feature as any).pro, plans[1])}
                            </td>
                            <td className="p-4 text-center">
                              {renderValue((feature as any).agency, plans[2])}
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
              Teste grátis por 7 dias. Sem compromisso, cancele quando quiser.
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