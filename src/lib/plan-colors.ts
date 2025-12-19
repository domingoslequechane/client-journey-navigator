import { PlanType } from '@/hooks/useSubscription';

export interface PlanColorConfig {
  name: string;
  // HSL values (without hsl() wrapper)
  primary: string;
  primaryForeground: string;
  accent: string;
  accentForeground: string;
  ring: string;
  sidebarPrimary: string;
  sidebarAccent: string;
  sidebarAccentForeground: string;
  chart1: string;
  // Dark mode variants
  accentDark: string;
  accentForegroundDark: string;
  sidebarAccentDark: string;
  sidebarAccentForegroundDark: string;
  chart1Dark: string;
}

export const PLAN_COLORS: Record<PlanType, PlanColorConfig> = {
  free: {
    name: 'Bússola',
    // Green theme
    primary: '142 71% 45%',
    primaryForeground: '0 0% 100%',
    accent: '142 71% 95%',
    accentForeground: '142 71% 30%',
    ring: '142 71% 45%',
    sidebarPrimary: '142 71% 45%',
    sidebarAccent: '142 71% 95%',
    sidebarAccentForeground: '142 71% 30%',
    chart1: '142 71% 45%',
    // Dark
    accentDark: '142 71% 15%',
    accentForegroundDark: '142 71% 70%',
    sidebarAccentDark: '142 71% 15%',
    sidebarAccentForegroundDark: '142 71% 70%',
    chart1Dark: '142 71% 55%',
  },
  starter: {
    name: 'Lança',
    // Blue theme
    primary: '217 91% 60%',
    primaryForeground: '0 0% 100%',
    accent: '217 91% 95%',
    accentForeground: '217 91% 35%',
    ring: '217 91% 60%',
    sidebarPrimary: '217 91% 60%',
    sidebarAccent: '217 91% 95%',
    sidebarAccentForeground: '217 91% 35%',
    chart1: '217 91% 60%',
    // Dark
    accentDark: '217 91% 15%',
    accentForegroundDark: '217 91% 70%',
    sidebarAccentDark: '217 91% 15%',
    sidebarAccentForegroundDark: '217 91% 70%',
    chart1Dark: '217 91% 65%',
  },
  pro: {
    name: 'Arco',
    // Purple theme
    primary: '270 91% 65%',
    primaryForeground: '0 0% 100%',
    accent: '270 91% 95%',
    accentForeground: '270 91% 35%',
    ring: '270 91% 65%',
    sidebarPrimary: '270 91% 65%',
    sidebarAccent: '270 91% 95%',
    sidebarAccentForeground: '270 91% 35%',
    chart1: '270 91% 65%',
    // Dark
    accentDark: '270 91% 15%',
    accentForegroundDark: '270 91% 70%',
    sidebarAccentDark: '270 91% 15%',
    sidebarAccentForegroundDark: '270 91% 70%',
    chart1Dark: '270 91% 70%',
  },
  agency: {
    name: 'Catapulta',
    // Orange theme (default/original)
    primary: '25 95% 53%',
    primaryForeground: '0 0% 100%',
    accent: '25 95% 95%',
    accentForeground: '25 95% 35%',
    ring: '25 95% 53%',
    sidebarPrimary: '25 95% 53%',
    sidebarAccent: '25 95% 95%',
    sidebarAccentForeground: '25 95% 35%',
    chart1: '25 95% 53%',
    // Dark
    accentDark: '25 95% 15%',
    accentForegroundDark: '25 95% 70%',
    sidebarAccentDark: '25 95% 15%',
    sidebarAccentForegroundDark: '25 95% 70%',
    chart1Dark: '25 95% 60%',
  },
};
