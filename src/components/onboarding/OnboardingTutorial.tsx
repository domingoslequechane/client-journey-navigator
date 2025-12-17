import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, 
  BarChart3, 
  Settings, 
  Bot, 
  GraduationCap,
  Workflow,
  X
} from 'lucide-react';

const TUTORIAL_COMPLETED_KEY = 'qualify_tutorial_completed';

interface TutorialStep {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const tutorialSteps: TutorialStep[] = [
  {
    title: 'Bem-vindo ao Qualify!',
    description: 'Este é o seu painel principal onde você pode ver uma visão geral dos seus clientes, métricas e ações rápidas.',
    icon: <BarChart3 className="h-8 w-8 text-primary" />,
  },
  {
    title: 'Funil de Vendas',
    description: 'Gerencie seus clientes através das etapas do funil: Prospecção, Reunião, Contratação, Produção, Tráfego, Retenção e Fidelização.',
    icon: <Workflow className="h-8 w-8 text-primary" />,
  },
  {
    title: 'Gestão de Clientes',
    description: 'Acesse a lista completa de clientes, visualize detalhes, gerencie contratos e acompanhe o progresso de cada um.',
    icon: <Users className="h-8 w-8 text-primary" />,
  },
  {
    title: 'Assistente de IA',
    description: 'Use nosso assistente inteligente para obter insights sobre seus clientes. A IA conhece todos os detalhes de cada cliente.',
    icon: <Bot className="h-8 w-8 text-primary" />,
  },
  {
    title: 'Academia',
    description: 'Acesse sugestões de estudo e materiais de aprendizado gerados por IA para aprimorar suas habilidades.',
    icon: <GraduationCap className="h-8 w-8 text-primary" />,
  },
  {
    title: 'Configurações',
    description: 'Configure sua agência, gerencie sua equipe, base de conhecimento e assinatura no menu de configurações.',
    icon: <Settings className="h-8 w-8 text-primary" />,
  },
];

interface OnboardingTutorialProps {
  onComplete?: () => void;
}

export function OnboardingTutorial({ onComplete }: OnboardingTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(TUTORIAL_COMPLETED_KEY);
    if (!completed) {
      setIsVisible(true);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem(TUTORIAL_COMPLETED_KEY, 'true');
    setIsVisible(false);
    onComplete?.();
  };

  const handleSkip = () => {
    handleComplete();
  };

  if (!isVisible) return null;

  const step = tutorialSteps[currentStep];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card className="w-full max-w-md mx-4 shadow-lg animate-scale-in">
        <CardHeader className="relative pb-2">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2"
            onClick={handleSkip}
          >
            <X className="h-4 w-4" />
          </Button>
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-full bg-primary/10">
              {step.icon}
            </div>
          </div>
          <CardTitle className="text-center text-xl">{step.title}</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground">{step.description}</p>
          <div className="flex justify-center gap-1.5 mt-6">
            {tutorialSteps.map((_, index) => (
              <div
                key={index}
                className={`h-1.5 w-6 rounded-full transition-colors ${
                  index === currentStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between gap-2">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
          >
            Anterior
          </Button>
          <Button variant="ghost" onClick={handleSkip} className="text-muted-foreground">
            Pular
          </Button>
          <Button onClick={handleNext}>
            {currentStep === tutorialSteps.length - 1 ? 'Começar' : 'Próximo'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
