import { useNavigate } from 'react-router-dom';
import { StudioToolsHub } from '@/components/studio/StudioToolsHub';
import { StudioBanner } from '@/components/studio/StudioBanner';

export default function StudioDashboard() {
  const navigate = useNavigate();

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