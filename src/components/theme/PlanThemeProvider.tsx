import { useEffect } from 'react';
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

interface PlanThemeProviderProps {
  children: React.ReactNode;
}

export function PlanThemeProvider({ children }: PlanThemeProviderProps) {
  const { planType, loading } = useSubscription();
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (loading) return;
    
    const isDark = resolvedTheme === 'dark';
    applyPlanTheme(planType, isDark);
  }, [planType, loading, resolvedTheme]);

  return <>{children}</>;
}
