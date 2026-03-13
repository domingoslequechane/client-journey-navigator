import { useNavigate } from 'react-router-dom';
import { PenTool } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { StudioToolsHub } from '@/components/studio/StudioToolsHub';

export default function StudioDashboard() {
  const navigate = useNavigate();
  const { limits, usage } = usePlanLimits();

  return (
    <div className="w-full p-4 md:p-6 pt-2 md:pt-6">
      {/* Header */}
      <div className="hidden md:flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <PenTool className="h-8 w-8 text-primary" />
              Studio Criativo
            </div>
            {limits.dailyStudioLimit !== null && (usage.studioGenerationsToday || 0) < limits.dailyStudioLimit && (
              <Badge variant="secondary" className="font-mono bg-primary/10 text-primary border-primary/20">
                Créditos hoje: {usage.studioGenerationsToday}/{limits.dailyStudioLimit}
              </Badge>
            )}
            {limits.dailyStudioLimit !== null && (usage.studioGenerationsToday || 0) >= limits.dailyStudioLimit && (
              <Badge variant="destructive" className="font-mono">
                Limite atingido: {usage.studioGenerationsToday}/{limits.dailyStudioLimit}
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Ferramentas profissionais de criação e edição com inteligência artificial
          </p>
        </div>
      </div>

      <div className="w-full">
        <StudioToolsHub />
      </div>
    </div>
  );
}