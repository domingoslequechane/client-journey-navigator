import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X, ArrowLeft, Star, Sparkles, TrendingUp } from 'lucide-react';
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
    color: 'hsl(217, 91%, 60%)',
    bgColor: 'hsl(217, 91%, 60%, 0.1)',
    borderColor: 'border-blue-500/30',
    textColor: 'text-blue-500',
    profitMargin: 'Alta (~$11/user)',
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
    price: '$39',
    tagline: 'Ferramentas para escalar seus resultados.',
    image: planArco,
    color: 'hsl(270, 91%, 65%)',
    bgColor: 'hsl(270, 91%, 65%, 0.1)',
    borderColor: 'border-purple-500/30',
    textColor: 'text-purple-500',
    popular: true,
    recommended: 'Mais Popular',
    profitMargin: 'Média (~$14/user)',
    features: [
      '15 Marcas (Clientes)',
      '15 Créditos Studio AI / dia',
      'Tudo do Lança + Inbox/Analytics',
      'Suporte Prioritário'
    ]
  },
  {
    key: 'agency',
    name: 'Catapulta',
    subtitle: 'Grandes Agências / White Label',
    price: '$79',
    tagline: 'Poder total para dominar o mercado.',
    image: planCatapulta,
    color: 'hsl(25, 95%, 53%)',
    bgColor: 'hsl(25, 95%, 53%, 0.1)',
    borderColor: 'border-orange-500/30',
    textColor: 'text-orange-500',
    profitMargin: 'Estável (~$26/user)',
    features: [
      '50 Marcas (Clientes)',
      '30 Créditos Studio AI / dia',
      'Tudo do Arco + Suporte VIP',
      'Acesso Antecipado a Recursos'
    ]
  },
];

const comparisonFeatures = [
  {
    category: 'Geral',
    features: [
      { name: 'Público-Alvo', starter: 'Freelancers / Pequenas Agências', pro: 'Agências em Crescimento', agency: 'Grandes Agências / White Label' },
      { name: 'Redes Sociais (por marca)', starter: 'Ilimitadas', pro: 'Ilimitadas', agency: 'Ilimitadas' },
      { name: 'Postagens', starter: 'Ilimitadas', pro: 'Ilimitadas', agency: 'Ilimitadas' },
      { name: 'Variações de IA por Flyer', starter: '2', pro: '2', agency: '2' },
    ],
  },
  {
    category: 'Limites e Performance',
    features: [
      { name: 'Marcas (Clientes)', starter: '5', pro: '15', agency: '50' },
      { name: 'Studio AI (Créditos / dia)', starter: '5', pro: '15', agency: '30' },
      { name: 'Margem de Lucro', starter: 'Alta (~$11/user)', pro: 'Média (~$14/user)', agency: 'Estável (~$26/user)' },
    ],
  },
  {
    category: 'Módulos e Suporte',
    features: [
      { name: 'Finanças, Editorial, Link23', starter: true, pro: true, agency: true },
      { name: 'Inbox/Analytics', starter: false, pro: true, agency: true },
      { name: 'Suporte VIP', starter: false, pro: false, agency: true },
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
    return <span className="font-medium text-sm">{value}</span>;
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
              Tabela de Planos e Limitações
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Escolha o plano ideal para a escala da sua operação.
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
                  <CardDescription className="italic text-xs">{plan.tagline}</CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="mb-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <p className="text-sm text-muted-foreground mt-1">por mês</p>
                  </div>

                  <div className="mb-6 p-3 bg-background/50 rounded-lg border border-border/50">
                    <div className="flex items-center justify-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      <TrendingUp className="h-3 w-3 text-green-500" />
                      Margem de Lucro
                    </div>
                    <div className="text-sm font-bold text-foreground">{plan.profitMargin}</div>
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
                      className="w-full gap-2 text-white shadow-lg"
                      style={{
                        backgroundColor: plan.color,
                      }}
                    >
                      <Sparkles className="h-4 w-4" />
                      Assinar Plano {plan.name}
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
            <h2 className="text-2xl font-bold mb-4">Pronto para escalar sua agência?</h2>
            <p className="text-muted-foreground mb-6">
              Teste grátis por 14 dias em qualquer plano. Sem compromisso, cancele quando quiser.
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