"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useSubscription } from '@/hooks/useSubscription';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { supabase } from '@/integrations/supabase/client';
import {
  LayoutDashboard,
  Building2,
  Kanban,
  Sparkles,
  MessagesSquare,
  PenTool,
  UsersRound,
  LogOut,
  GraduationCap,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CreditCard,
  HeadphonesIcon,
  Compass,
  Target,
  TrendingUp,
  Rocket,
  RefreshCw,
  Link2,
  CalendarDays,
  Wallet,
  Megaphone,
  Lock,
  Wand2,
  Download,
  BrainCircuit,
  Bot,
  Zap,
  ShieldAlert
} from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { LanguageSelector } from '@/components/ui/language-selector';
import { ModuleLockedModal } from '@/components/subscription/ModuleLockedModal';
import { AnimatedContainer } from '@/components/ui/animated-container';
import { Skeleton } from '@/components/ui/skeleton';

const SIDEBAR_COLLAPSED_KEY = 'qualify-sidebar-collapsed';
const TABLET_MIN = 768;
const TABLET_MAX = 1024;

const PLAN_CONFIG = {
  starter: { name: 'plans.lance', icon: Target },
  pro: { name: 'plans.bow', icon: TrendingUp },
  agency: { name: 'plans.catapult', icon: Rocket },
  trial: { name: 'plans.trial', icon: Zap },
};

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { loading: subLoading, planType, organization, daysRemaining, hasActiveSubscription, hasSubscriptionRecord } = useSubscription();
  const { t } = useTranslation('common');
  const {
    canAccessModule,
    isAdmin,
    isInternalAdmin
  } = usePermissions();

  const {
    canAccessFinance,
    canAccessStudio,
    canAccessLinkTree,
    canAccessEditorial,
    canAccessSocialMedia,
    canAccessAtendeAI,
  } = usePlanLimits();
  const { canInstall, install } = usePWAInstall();


  const isNoPlan = !subLoading && (!planType || (planType as string) === 'free') && !hasActiveSubscription;
  const currentPlan = planType && planType !== 'free' 
    ? (PLAN_CONFIG[planType as keyof typeof PLAN_CONFIG] || { name: 'Escolher um Plano', icon: Target })
    : { name: 'Escolher um Plano', icon: Target };
  
  const PlanIcon = (isNoPlan || !currentPlan.icon) ? Target : currentPlan.icon;

  const [manualCollapsed, setManualCollapsed] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return saved === 'true';
  });

  const [hasMultipleOrgs, setHasMultipleOrgs] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [lockedModule, setLockedModule] = useState<{ name: string; plan: string; type: 'plan' | 'privilege' | 'development' } | null>(null);

  // Detect tablet viewport
  useEffect(() => {
    const checkTablet = () => {
      const width = window.innerWidth;
      setIsTablet(width >= TABLET_MIN && width < TABLET_MAX);
    };

    checkTablet();
    window.addEventListener('resize', checkTablet);
    return () => window.removeEventListener('resize', checkTablet);
  }, []);

  // Effective collapsed state: auto-collapse on tablet OR manual toggle
  const collapsed = isTablet || manualCollapsed;

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(manualCollapsed));
  }, [manualCollapsed]);

  // Check if user has multiple organizations
  useEffect(() => {
    const checkMultipleOrgs = async () => {
      if (!user) return;

      const { data } = await supabase.rpc('get_user_organizations', {
        user_uuid: user.id
      });

      setHasMultipleOrgs(data && data.length > 1);
    };

    checkMultipleOrgs();
  }, [user]);

  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  const handleScroll = () => {
    if (navRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = navRef.current;
      // Show indicator if there's more than 5px of content below
      setShowScrollIndicator(scrollHeight > clientHeight && scrollTop + clientHeight < scrollHeight - 5);
    }
  };

  // Role check is now centralized in usePermissions
  // Removed hardcoded email check for a more robust role-based approach

  const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0);

  useEffect(() => {
    if (!isInternalAdmin) return;
    
    const fetchPendingCount = async () => {
      const { count, error } = await (supabase as any)
        .from('manual_payment_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
        
      if (!error && count !== null) {
        setPendingPaymentsCount(count);
      }
    };

    fetchPendingCount();
    
    // Set up realtime subscription for updates
    const channel = supabase
      .channel('pending-payments-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'manual_payment_requests', filter: "status=eq.pending" }, () => {
        fetchPendingCount();
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [isInternalAdmin]);

  // Filter navigation items based on role + module access
  const navigation = useMemo(() => {
    const allItems: Array<{ 
      name: string; 
      href: string; 
      icon: any; 
      tutorialId: string; 
      show: boolean; 
      locked: boolean; 
      lockType: 'plan' | 'privilege' | 'development' | null;
      requiredPlan: string; 
      badge?: React.ReactNode; 
    }> = [
      { 
        name: t('navigation.dashboard'), 
        href: '/app', 
        icon: LayoutDashboard, 
        tutorialId: 'sidebar-dashboard', 
        show: true, 
        locked: isNoPlan, 
        lockType: isNoPlan ? 'plan' : null,
        requiredPlan: 'Lança' 
      },
      { 
        name: t('navigation.pipeline'), 
        href: '/app/pipeline', 
        icon: Kanban, 
        tutorialId: 'sidebar-pipeline', 
        show: true, 
        locked: !canAccessModule('pipeline') || isNoPlan, 
        lockType: isNoPlan ? 'plan' : (!canAccessModule('pipeline') ? 'privilege' : null),
        requiredPlan: 'Lança' 
      },
      { 
        name: t('navigation.finance'), 
        href: '/app/finance', 
        icon: Wallet, 
        tutorialId: 'sidebar-finance', 
        show: true, 
        locked: !canAccessModule('finances') || !canAccessFinance, 
        lockType: !canAccessFinance ? 'plan' : (!canAccessModule('finances') ? 'privilege' : null),
        requiredPlan: 'Lança' 
      },
      { 
        name: t('navigation.link23'), 
        href: '/app/link-trees', 
        icon: Link2, 
        tutorialId: 'sidebar-linktree', 
        show: true, 
        locked: !canAccessModule('link23') || !canAccessLinkTree, 
        lockType: !canAccessLinkTree ? 'plan' : (!canAccessModule('link23') ? 'privilege' : null),
        requiredPlan: 'Lança' 
      },
      { 
        name: t('navigation.editorial'), 
        href: '/app/editorial', 
        icon: CalendarDays, 
        tutorialId: 'sidebar-editorial', 
        show: true, 
        locked: !canAccessModule('editorial') || !canAccessEditorial || !hasActiveSubscription, 
        lockType: (!canAccessEditorial || !hasActiveSubscription) ? 'plan' : (!canAccessModule('editorial') ? 'privilege' : null),
        requiredPlan: 'Lança' 
      },
      { 
        name: t('navigation.socialMedia'), 
        href: '/app/social-media', 
        icon: ((props: any) => <Megaphone {...props} className={cn(props.className, "-rotate-12")} />) as any, 
        tutorialId: 'sidebar-social-media', 
        show: true, 
        locked: !canAccessModule('social') || !canAccessSocialMedia || !hasActiveSubscription, 
        lockType: (!canAccessSocialMedia || !hasActiveSubscription) ? 'plan' : (!canAccessModule('social') ? 'privilege' : null),
        requiredPlan: 'Lança' 
      },
      { 
        name: t('navigation.qia'), 
        href: '/app/ai-assistant', 
        icon: MessagesSquare, 
        tutorialId: 'sidebar-ai', 
        show: true, 
        locked: !canAccessModule('qia'), 
        lockType: !canAccessModule('qia') ? 'privilege' : null,
        requiredPlan: 'Lança' 
      },
      { 
        name: t('navigation.aiAgents'), 
        href: '/app/ai-agents', 
        icon: Bot, 
        tutorialId: 'sidebar-ai-agents', 
        show: true, 
        locked: true, 
        lockType: 'development',
        requiredPlan: 'arco' 
      },
      { 
        name: t('navigation.studio'), 
        href: '/app/studio', 
        icon: PenTool, 
        tutorialId: 'sidebar-studio', 
        show: true, 
        locked: !canAccessModule('studio') || !canAccessStudio || isNoPlan || !hasActiveSubscription, 
        lockType: (!canAccessStudio || isNoPlan || !hasActiveSubscription) ? 'plan' : (!canAccessModule('studio') ? 'privilege' : null),
        requiredPlan: 'Lança' 
      },
      { 
        name: t('navigation.academy'), 
        href: '/app/academia', 
        icon: GraduationCap, 
        tutorialId: 'sidebar-academia', 
        show: true, 
        locked: !canAccessModule('academy') || isNoPlan, 
        lockType: isNoPlan ? 'plan' : (!canAccessModule('academy') ? 'privilege' : null),
        requiredPlan: 'Lança' 
      },
      { 
        name: t('navigation.clients'), 
        href: '/app/clients', 
        icon: Building2, 
        tutorialId: 'sidebar-clients', 
        show: true, 
        locked: !canAccessModule('clients') || isNoPlan, 
        lockType: isNoPlan ? 'plan' : (!canAccessModule('clients') ? 'privilege' : null),
        requiredPlan: 'Lança' 
      },
      { 
        name: t('navigation.team'), 
        href: '/app/team', 
        icon: UsersRound, 
        tutorialId: 'sidebar-team', 
        show: true, 
        locked: !canAccessModule('team') || isNoPlan, 
        lockType: isNoPlan ? 'plan' : (!canAccessModule('team') ? 'privilege' : null),
        requiredPlan: 'Lança' 
      },
      { 
        name: 'Administração', 
        href: '/admin', 
        icon: ShieldAlert, 
        tutorialId: 'sidebar-admin', 
        show: !!isInternalAdmin, 
        locked: false, 
        lockType: null,
        requiredPlan: '',
        badge: pendingPaymentsCount > 0 ? (
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold">
            {pendingPaymentsCount}
          </span>
        ) : undefined
      },
      { 
        name: 'Financeiro', 
        href: '/admin/finance', 
        icon: Wallet, 
        tutorialId: 'sidebar-admin-finance', 
        show: !!isInternalAdmin, 
        locked: false, 
        lockType: null,
        requiredPlan: '' 
      },
    ];
    return allItems.filter(item => item.show);
  }, [canAccessModule, canAccessFinance, canAccessStudio, canAccessLinkTree, canAccessEditorial, canAccessSocialMedia, hasActiveSubscription, t, isNoPlan, isInternalAdmin, pendingPaymentsCount]);

  useEffect(() => {
    handleScroll();
    // Re-check on window resize or when sidebar collapses/expands
    window.addEventListener('resize', handleScroll);
    const timeoutId = setTimeout(handleScroll, 350); // Wait for transition to finish
    return () => {
      window.removeEventListener('resize', handleScroll);
      clearTimeout(timeoutId);
    };
  }, [collapsed, navigation]);

  const handleSignOut = async () => {
    await signOut();
    setLogoutDialogOpen(false);
    navigate('/auth');
  };

  const handleSwitchOrganization = () => {
    setLogoutDialogOpen(false);
    navigate('/app/select-organization');
  };

  const NavItem = ({ item, isActive }: { item: typeof navigation[0]; isActive: boolean }) => {
    // Items in development will navigate to their pages directly to show the splash screen
    if (item.locked && item.lockType === 'development') {
      const devContent = (
        <Link
          to={item.href}
          data-tutorial={item.tutorialId}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full text-left',
            isActive 
              ? 'bg-accent/30 text-foreground' 
              : 'text-muted-foreground/70 hover:bg-accent/50 cursor-pointer',
            collapsed && 'justify-center px-2'
          )}
        >
          <item.icon className="h-5 w-5 shrink-0 opacity-70" />
          {!collapsed && (
            <>
              <span className="flex-1 opacity-80">{item.name}</span>
              <Lock className="h-3.5 w-3.5 opacity-60" />
            </>
          )}
        </Link>
      );

      if (collapsed) {
        return (
          <Tooltip>
            <TooltipTrigger asChild>{devContent}</TooltipTrigger>
            <TooltipContent side="right">
              🚧 {item.name} (Brevemente)
            </TooltipContent>
          </Tooltip>
        );
      }
      return devContent;
    }

    if (item.locked) {
      const lockedContent = (
        <button
          onClick={() => setLockedModule({ 
            name: item.name as string, 
            plan: item.requiredPlan,
            type: item.lockType || 'plan'
          })}
          data-tutorial={item.tutorialId}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full text-left',
            'text-muted-foreground/50 hover:bg-accent/50 cursor-pointer',
            collapsed && 'justify-center px-2'
          )}
        >
          <item.icon className="h-5 w-5 shrink-0 opacity-50" />
          {!collapsed && (
            <>
              <span className="flex-1 opacity-60">{item.name}</span>
              <Lock className="h-3.5 w-3.5 opacity-50" />
            </>
          )}
        </button>
      );

      if (collapsed) {
        return (
          <Tooltip>
            <TooltipTrigger asChild>{lockedContent}</TooltipTrigger>
            <TooltipContent side="right">
              🔒 {item.name} (Plano {item.requiredPlan})
            </TooltipContent>
          </Tooltip>
        );
      }
      return lockedContent;
    }

    const content = (
      <Link
        to={item.href}
        data-tutorial={item.tutorialId}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
          collapsed && 'justify-center px-2'
        )}
      >
        <item.icon className="h-5 w-5 shrink-0" />
        {!collapsed && (
          <div className="flex items-center justify-between flex-1">
            <span>{item.name}</span>
            {item.badge && (
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] px-1.5 h-4 font-bold border-secondary text-secondary-foreground uppercase tracking-wider",
                  isActive ? "bg-white/20 text-white border-white/30" : "bg-secondary/10"
                )}
              >
                {item.badge}
              </Badge>
            )}
          </div>
        )}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right">
            {item.name}
          </TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className={cn(
        "flex h-full flex-col bg-card border-r border-border transition-all duration-300 overflow-hidden",
        collapsed ? "w-16" : "w-64"
      )}>
        <div className="border-b border-border shrink-0">
          <div className={cn(
            "flex h-14 items-center gap-2 px-4 shadow-sm",
            collapsed && "justify-center px-2"
          )}>
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <span className="text-primary-foreground font-bold text-lg">Q</span>
          </div>
            {!collapsed && <span className="font-bold text-xl">Qualify</span>}
          </div>
        </div>

        {/* Organization Name with Plan Color */}
        {organization && (
          collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="border-b border-border flex justify-center shrink-0">
                  <div className="px-2 py-3">
                    <PlanIcon
                      className={cn("h-5 w-5", isNoPlan ? "text-destructive animate-pulse" : "")}
                      style={!isNoPlan ? { color: `hsl(var(--plan-${planType}-primary, var(--primary)))` } : {}}
                    />
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">{organization.name}</TooltipContent>
            </Tooltip>
          ) : (
            <div className="border-b border-border shrink-0">
              <div className="px-4 py-3">
                <p
                  className={cn("text-sm font-medium truncate", isNoPlan ? "text-destructive" : "")}
                  style={!isNoPlan ? { color: `hsl(var(--plan-${planType}-primary, var(--primary)))` } : {}}
                >
                  {organization.name}
                </p>
                {!collapsed && !isNoPlan && daysRemaining > 0 && (
                  <p className="text-[10px] font-bold text-muted-foreground/60 flex items-center gap-1 mt-1">
                    <CalendarDays className="h-3 w-3" />
                    {daysRemaining} {daysRemaining === 1 ? 'dia restante' : 'dias restantes'}
                  </p>
                )}
              </div>
            </div>
          )
        )}

        <div className="flex-1 relative flex flex-col overflow-hidden">
          <nav
            ref={navRef}
            onScroll={handleScroll}
            className="flex-1 px-2 py-4 space-y-1 overflow-y-auto overflow-x-hidden"
          >
            {subLoading ? (
              // Navigation Skeletons
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5 blur-[2px] animate-pulse">
                  <Skeleton className="h-5 w-5 rounded-lg shrink-0" />
                  {!collapsed && <Skeleton className="h-4 w-32" />}
                </div>
              ))
            ) : (
              navigation.map((item, index) => {
                const isActive = item.href === '/app'
                  ? location.pathname === '/app'
                  : location.pathname.startsWith(item.href);
                return (
                  <AnimatedContainer 
                    key={item.href} 
                    delay={index * 0.03} 
                    duration={0.4}
                  >
                    <NavItem item={item} isActive={isActive} />
                  </AnimatedContainer>
                );
              })
            )}
          </nav>
          {showScrollIndicator && (
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-card to-transparent pointer-events-none flex items-end justify-center pb-2">
              <ChevronDown className="h-4 w-4 text-muted-foreground animate-bounce" />
            </div>
          )}
        </div>

        <div className="border-t border-border shrink-0">
          <div className="p-2 space-y-1">
          {/* Theme Toggle & Language Selector */}
          {collapsed ? (
            <div className="flex flex-col items-center gap-1 py-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex justify-center">
                    <ThemeToggle />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">{t('theme.toggleTheme')}</TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <div className="flex items-center justify-between px-2 py-2">
              <div className="flex items-center gap-1">
                <ThemeToggle />
              </div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{t('theme.toggle')}</span>
            </div>
          )}

          {/* Support & Feedback */}
          <AnimatedContainer delay={0.25}>
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    to="/app/support"
                    className={cn(
                      'flex items-center justify-center px-2 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      location.pathname === '/app/support'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <HeadphonesIcon className="h-5 w-5" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{t('navigation.support')}</TooltipContent>
              </Tooltip>
            ) : (
              <Link
                to="/app/support"
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  location.pathname === '/app/support'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <HeadphonesIcon className="h-5 w-5" />
                {t('navigation.support')}
              </Link>
            )}
          </AnimatedContainer>

          {/* Notifications */}
          <AnimatedContainer delay={0.3}>
            <NotificationBell collapsed={collapsed} />
          </AnimatedContainer>

          {/* Settings - Available to all users, but locked visually if no plan */}
          <AnimatedContainer delay={0.35}>
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  {isNoPlan ? (
                    <button
                      onClick={() => setLockedModule({ name: t('navigation.settings'), plan: 'Lança', type: 'plan' })}
                      className={cn(
                        'flex items-center justify-center px-2 py-2.5 rounded-lg text-sm font-medium transition-colors w-full',
                        'text-muted-foreground/50 hover:bg-accent/50 cursor-pointer'
                      )}
                    >
                      <Settings className="h-5 w-5 opacity-50" />
                    </button>
                  ) : (
                    <Link
                      to="/app/settings"
                      data-tutorial="sidebar-settings"
                      className={cn(
                        'flex items-center justify-center px-2 py-2.5 rounded-lg text-sm font-medium transition-colors',
                        location.pathname === '/app/settings'
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      <Settings className="h-5 w-5" />
                    </Link>
                  )}
                </TooltipTrigger>
                <TooltipContent side="right">
                  {isNoPlan ? `🔒 ${t('navigation.settings')} (Plano Lança)` : t('navigation.settings')}
                </TooltipContent>
              </Tooltip>
            ) : (
              isNoPlan ? (
                <button
                  onClick={() => setLockedModule({ name: t('navigation.settings'), plan: 'Lança', type: 'plan' })}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full text-left',
                    'text-muted-foreground/50 hover:bg-accent/50 cursor-pointer'
                  )}
                >
                  <Settings className="h-5 w-5 shrink-0 opacity-50" />
                  <span className="flex-1 opacity-60">{t('navigation.settings')}</span>
                  <Lock className="h-3.5 w-3.5 opacity-50" />
                </button>
              ) : (
                <Link
                  to="/app/settings"
                  data-tutorial="sidebar-settings"
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    location.pathname === '/app/settings'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <Settings className="h-5 w-5" />
                  {t('navigation.settings')}
                </Link>
              )
            )}
          </AnimatedContainer>

          {/* Subscription - Available to all users to see status */}
          <AnimatedContainer delay={0.4}>
            {true && (
              collapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      to={hasSubscriptionRecord ? "/app/subscription" : "/select-plan"}
                      className={cn(
                        'flex items-center justify-center px-2 py-2.5 rounded-lg text-sm font-medium transition-colors',
                        (location.pathname === '/select-plan' || location.pathname === '/app/subscription')
                          ? 'bg-primary text-primary-foreground'
                          : isNoPlan ? 'bg-destructive/10 text-destructive hover:bg-destructive/20' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      <div className={cn(
                        "p-1 rounded",
                        (location.pathname === '/select-plan' || location.pathname === '/app/subscription') ? 'bg-primary-foreground/20' : isNoPlan ? 'bg-destructive/10' : 'bg-primary/10'
                      )}>
                        <PlanIcon className={cn(
                          "h-4 w-4",
                          (location.pathname === '/select-plan' || location.pathname === '/app/subscription') ? 'text-primary-foreground' : isNoPlan ? 'text-destructive' : 'text-primary'
                        )} />
                      </div>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {isNoPlan ? 'Escolher um Plano' : `Plano ${t(currentPlan.name)}`}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Link
                  to={hasSubscriptionRecord ? "/app/subscription" : "/select-plan"}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    (location.pathname === '/select-plan' || location.pathname === '/app/subscription')
                      ? 'bg-primary text-primary-foreground'
                      : isNoPlan ? 'bg-destructive/10 text-destructive hover:bg-destructive/20 font-bold' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <div className={cn(
                    "p-1 rounded",
                    (location.pathname === '/select-plan' || location.pathname === '/app/subscription') ? 'bg-primary-foreground/20' : isNoPlan ? 'bg-destructive/10' : 'bg-primary/10'
                  )}>
                    <PlanIcon className={cn(
                      "h-4 w-4",
                      (location.pathname === '/select-plan' || location.pathname === '/app/subscription') ? 'text-primary-foreground' : isNoPlan ? 'text-destructive' : 'text-primary'
                    )} />
                  </div>
                  <span>{isNoPlan ? 'Escolher um Plano' : `Plano ${t(currentPlan.name)}`}</span>
                </Link>
              )
            )}
          </AnimatedContainer>

          {canInstall && (
            collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={install}
                    className="w-full flex justify-center py-2.5 rounded-lg text-primary hover:bg-primary/10 transition-colors"
                  >
                    <Download className="h-5 w-5 animate-bounce" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Instalar Aplicação</TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant="ghost"
                onClick={install}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold text-primary hover:bg-primary/10 transition-all active:scale-95"
              >
                <Download className="h-5 w-5 animate-bounce" />
                <span>Instalar Aplicação</span>
              </Button>
            )
          )}

          {user && (
            <div className={cn("pt-2 border-t border-border mt-2", collapsed && "px-1")}>
              {!collapsed && (
                <p className="px-3 py-1 text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
              )}
              {collapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-center px-2 py-2.5 h-auto text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setLogoutDialogOpen(true)}
                    >
                      <LogOut className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">{t('navigation.logout')}</TooltipContent>
                </Tooltip>
              ) : (
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 px-3 py-2.5 h-auto text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setLogoutDialogOpen(true)}
                >
                  <LogOut className="h-5 w-5" />
                  {t('navigation.logout')}
                </Button>
              )}
            </div>
          )}

          {/* Logout Confirmation Dialog */}
          <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('logout.dialogTitle')}</DialogTitle>
                <DialogDescription>
                  {t('logout.dialogDescription')}
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-3 py-4">
                {hasMultipleOrgs && (
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3 h-auto py-3"
                    onClick={handleSwitchOrganization}
                  >
                    <RefreshCw className="h-5 w-5" />
                    <div className="text-left">
                      <p className="font-medium">{t('logout.switchAgency')}</p>
                      <p className="text-xs text-muted-foreground">{t('logout.switchAgencyDescription')}</p>
                    </div>
                  </Button>
                )}
                <Button
                  variant="destructive"
                  className="w-full justify-start gap-3 h-auto py-3"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-5 w-5" />
                  <div className="text-left">
                    <p className="font-medium">{t('logout.signOut')}</p>
                    <p className="text-xs text-destructive-foreground/70">{t('logout.signOutDescription')}</p>
                  </div>
                </Button>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setLogoutDialogOpen(false)}>
                  {t('actions.cancel')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Collapse Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setManualCollapsed(!manualCollapsed)}
            className={cn(
              "w-full mt-2 text-muted-foreground hover:bg-accent",
              collapsed ? "justify-center px-2" : "justify-start gap-3 px-3"
            )}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                {t('actions.collapseMenu')}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>

      {/* Module Locked Modal */}
      <ModuleLockedModal
        open={!!lockedModule}
        onOpenChange={(open) => !open && setLockedModule(null)}
        moduleName={lockedModule?.name || ''}
        requiredPlan={lockedModule?.plan}
        type={lockedModule?.type}
      />
    </TooltipProvider>
  );
}