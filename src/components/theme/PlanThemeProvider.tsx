import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useSubscription, PlanType } from '@/hooks/useSubscription';
import { PLAN_COLORS } from '@/lib/plan-colors';
import { useTheme } from 'next-themes';

function applyPlanTheme(planType: PlanType, isDark: boolean) {
  const root = document.documentElement;
  const colors = PLAN_COLORS[planType];
  
  if (!colors) return;

  // Apply plan-specific colors
  root.style.setProperty('--primary', colors.primary);
  root.style.setProperty('--primary-foreground', colors.primaryForeground);
  root.style.setProperty('--ring', colors.ring);
  root.style.setProperty('--sidebar-primary', colors.sidebarPrimary);
  root.style.setProperty('--sidebar-ring', colors.ring);
  root.style.setProperty('--chart-1', isDark ? colors.chart1Dark : colors.chart1);
  
  // Apply accent colors based on theme
  root.style.setProperty('--accent', isDark ? colors.accentDark : colors.accent);
  root.style.setProperty('--accent-foreground', isDark ? colors.accentForegroundDark : colors.accentForeground);
  root.style.setProperty('--sidebar-accent', isDark ? colors.sidebarAccentDark : colors.sidebarAccent);
  root.style.setProperty('--sidebar-accent-foreground', isDark ? colors.sidebarAccentForegroundDark : colors.sidebarAccentForeground);
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
  const previousIsInsideApp = useRef<boolean | null>(null);

  // Check if we're inside the app dashboard routes
  const isInsideApp = location.pathname.startsWith('/app');

  useEffect(() => {
    const root = document.documentElement;
    const isDark = resolvedTheme === 'dark';
    
    // Determine if we're transitioning between app and public pages
    const isTransitioning = previousIsInsideApp.current !== null && 
                           previousIsInsideApp.current !== isInsideApp;
    
    if (isTransitioning) {
      // Add transition class for smooth color change
      root.classList.add('theme-transitioning');
      
      // Use requestAnimationFrame to ensure transition is applied
      requestAnimationFrame(() => {
        if (isInsideApp && !loading) {
          applyPlanTheme(planType, isDark);
        } else {
          resetToDefaultTheme(isDark);
        }
        
        // Remove transition class after animation completes
        setTimeout(() => {
          root.classList.remove('theme-transitioning');
        }, 350);
      });
    } else {
      // No transition needed, apply directly
      if (isInsideApp && !loading) {
        applyPlanTheme(planType, isDark);
      } else {
        resetToDefaultTheme(isDark);
      }
    }
    
    previousIsInsideApp.current = isInsideApp;
  }, [planType, loading, resolvedTheme, isInsideApp]);

  return <>{children}</>;
}
