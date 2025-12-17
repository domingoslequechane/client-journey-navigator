import { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { SubscriptionTab } from '@/components/subscription/SubscriptionTab';
import { AnimatedContainer } from '@/components/ui/animated-container';
import { toast } from '@/hooks/use-toast';

export default function Subscription() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const success = searchParams.get('success');
    if (success === 'true') {
      toast({
        title: 'Assinatura realizada!',
        description: 'Sua assinatura foi confirmada com sucesso.',
      });
    }
  }, [searchParams]);

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <AnimatedContainer animation="fade-up" className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Assinatura</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie sua assinatura do Qualify</p>
        </div>
      </AnimatedContainer>

      <AnimatedContainer animation="fade-up" delay={0.1}>
        <SubscriptionTab />
      </AnimatedContainer>
    </div>
  );
}
