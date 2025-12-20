import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSubscription, PlanType } from '@/hooks/useSubscription';
import { PLAN_COLORS } from '@/lib/plan-colors';
import { useTheme } from 'next-themes';

function applyPlanTheme(planType: PlanType, isDark: boolean) {
  const colors = PLAN_COLORS[planType] || PLAN_COLORS.agency;
  const root = document.documentElement;

  // Apply light/dark specific colors
  root.style.setProperty('--primary', colors.primary);
  root.style.setProperty('--primary-foreground', colors.primaryForeground);
  root.style.setProperty('--ring', colors.ring);
  root.style.setProperty('--sidebar-primary', colors.sidebarPrimary);
  root.style.setProperty('--sidebar-ring', colors.ring);
  root.style.setProperty('--chart-1', isDark ? colors.chart1Dark : colors.chart1);

  if (isDark) {
    root.style.setProperty('--accent', colors.accentDark);
    root.style.setProperty('--accent-foreground', colors.accentForegroundDark);
    root.style.setProperty('--sidebar-accent', colors.sidebarAccentDark);
    root.style.setProperty('--sidebar-accent-foreground', colors.sidebarAccentForegroundDark);
  } else {
    root.style.setProperty('--accent', colors.accent);
    root.style.setProperty('--accent-foreground', colors.accentForeground);
    root.style.setProperty('--sidebar-accent', colors.sidebarAccent);
    root.style.setProperty('--sidebar-accent-foreground', colors.sidebarAccentForeground);
  }
}

function resetToDefaultTheme(isDark: boolean) {
  const root = document.documentElement;
  
  // Reset to default orange theme (from index.css)
  root.style.removeProperty('--primary');
  root.style.removeProperty('--primary-foreground');
  root.style.removeProperty('--ring');
  root.style.removeProperty('--sidebar-primary');
  root.style.removeProperty('--sidebar-ring');
  root.style.removeProperty('--chart-1');
  root.style.removeProperty('--accent');
  root.style.removeProperty('--accent-foreground');
  root.style.removeProperty('--sidebar-accent');
  root.style.removeProperty('--sidebar-accent-foreground');
}

interface PlanThemeProviderProps {
  children: React.ReactNode;
}

export function PlanThemeProvider({ children }: PlanThemeProviderProps) {
  const { planType, loading } = useSubscription();
  const { resolvedTheme } = useTheme();
  const location = useLocation();

  // Check if we're inside the app dashboard routes
  const isInsideApp = location.pathname.startsWith('/app');

  useEffect(() => {
    const isDark = resolvedTheme === 'dark';
    
    if (isInsideApp && !loading) {
      // Apply plan-based theme only inside the dashboard
      applyPlanTheme(planType, isDark);
    } else {
      // Reset to default system theme on public pages
      resetToDefaultTheme(isDark);
    }
  }, [planType, loading, resolvedTheme, isInsideApp]);

  return <>{children}</>;
}
