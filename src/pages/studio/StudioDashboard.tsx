import { useNavigate } from 'react-router-dom';
import { StudioToolsHub } from '@/components/studio/StudioToolsHub';
import { StudioBanner } from '@/components/studio/StudioBanner';
import { useSubscription } from '@/hooks/useSubscription';
import { SubscriptionRequired } from '@/components/subscription/SubscriptionRequired';

export default function StudioDashboard() {
  const navigate = useNavigate();
  const { hasActiveSubscription, loading } = useSubscription();

  if (loading) return null;

  if (!hasActiveSubscription) {
    return (
      <SubscriptionRequired
        feature="Studio Criativo"
        title="Studio Criativo Bloqueado"
        description="Renove a sua assinatura para continuar a criar imagens, vídeos e carrosséis com IA no Studio Criativo."
      />
    );
  }

  return (
    <div className="w-full p-4 md:p-6 pt-2 md:pt-6">
      {/* Hero Banner */}
      <StudioBanner />

      <div className="w-full">
        <StudioToolsHub />
      </div>
    </div>
  );
}