import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import {
  LayoutDashboard,
  Building2,
  Kanban,
  Sparkles,
  Workflow,
  UsersRound,
  LogOut,
  GraduationCap,
  Settings,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  HeadphonesIcon,
  Compass,
  Target,
  TrendingUp,
  Rocket,
  RefreshCw,
  Link2,
  Palette
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { LanguageSelector } from '@/components/ui/language-selector';

const SIDEBAR_COLLAPSED_KEY = 'qualify-sidebar-collapsed';

const PLAN_CONFIG = {
  free: { name: 'plans.compass', icon: Compass },
  starter: { name: 'plans.lance', icon: Target },
  pro: { name: 'plans.bow', icon: TrendingUp },
  agency: { name: 'plans.catapult', icon: Rocket },
};

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { planType, organization } = useSubscription();
  const { t } = useTranslation('common');
  const { 
    canSeeSalesFunnel, 
    canSeeOperationalFlow, 
    canSeeClients, 
    canSeeTeam, 
    canSeeSettings, 
    canSeeSubscription 
  } = useUserRole();

  const currentPlan = PLAN_CONFIG[planType] || PLAN_CONFIG.free;
  const PlanIcon = currentPlan.icon;

  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return saved === 'true';
  });

  const [hasMultipleOrgs, setHasMultipleOrgs] = useState(false);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
  }, [collapsed]);

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

  // Filter navigation items based on role
  const navigation = useMemo(() => {
    const allItems = [
      { name: t('navigation.dashboard'), href: '/app', icon: LayoutDashboard, tutorialId: 'sidebar-dashboard', show: true },
      { name: t('navigation.salesFunnel'), href: '/app/sales-funnel', icon: Kanban, tutorialId: 'sidebar-funnel', show: canSeeSalesFunnel },
      { name: t('navigation.operationalFlow'), href: '/app/operational-flow', icon: Workflow, tutorialId: 'sidebar-operational', show: canSeeOperationalFlow },
      { name: t('navigation.clients'), href: '/app/clients', icon: Building2, tutorialId: 'sidebar-clients', show: canSeeClients },
      { name: 'Link23', href: '/app/link-trees', icon: Link2, tutorialId: 'sidebar-linktree', show: true },
      { name: 'Studio AI', href: '/app/studio', icon: Palette, tutorialId: 'sidebar-studio', show: true, badge: 'novo' },
      { name: t('navigation.qia'), href: '/app/ai-assistant', icon: Sparkles, tutorialId: 'sidebar-ai', show: true },
      { name: t('navigation.academy'), href: '/app/academia', icon: GraduationCap, tutorialId: 'sidebar-academia', show: true },
      { name: t('navigation.team'), href: '/app/team', icon: UsersRound, tutorialId: 'sidebar-team', show: canSeeTeam },
    ];
    return allItems.filter(item => item.show);
  }, [canSeeSalesFunnel, canSeeOperationalFlow, canSeeClients, canSeeTeam, t]);

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
    const content = (
      <Link
        to={item.href}
        data-tutorial={item.tutorialId}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
          isActive
            ? 'bg-primary text-primary-foreground [&>svg]:text-primary-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
          collapsed && 'justify-center px-2'
        )}
      >
        <item.icon className="h-5 w-5 shrink-0" />
        {!collapsed && item.name}
        {!collapsed && item.badge && (
          <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0 h-4 uppercase font-semibold">
            {item.badge}
          </Badge>
        )}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" className="flex items-center gap-2">
            {item.name}
            {item.badge && (
              <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 uppercase font-semibold">
                {item.badge}
              </Badge>
            )}
          </TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className={cn(
        "flex h-screen flex-col bg-card border-r border-border transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}>
        <div className={cn(
          "flex h-16 items-center gap-2 px-4 border-b border-border",
          collapsed && "justify-center px-2"
        )}>
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <span className="text-primary-foreground font-bold text-lg">Q</span>
          </div>
          {!collapsed && <span className="font-bold text-xl">Qualify</span>}
        </div>

        {/* Organization Name with Plan Color */}
        {organization && (
          collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="px-2 py-3 border-b border-border flex justify-center">
                  <Building2 
                    className="h-5 w-5"
                    style={{ color: `hsl(var(--plan-${planType}-primary, var(--primary)))` }}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">{organization.name}</TooltipContent>
            </Tooltip>
          ) : (
            <div className="px-4 py-3 border-b border-border">
              <p 
                className="text-sm font-medium truncate"
                style={{ color: `hsl(var(--plan-${planType}-primary, var(--primary)))` }}
              >
                {organization.name}
              </p>
            </div>
          )
        )}
        
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return <NavItem key={item.name} item={item} isActive={isActive} />;
          })}
        </nav>

        <div className="p-2 border-t border-border space-y-1">
          {/* Theme Toggle & Language Selector */}
          {collapsed ? (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex justify-center">
                    <ThemeToggle />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">{t('theme.toggleTheme')}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex justify-center">
                    <LanguageSelector />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">{t('language.select')}</TooltipContent>
              </Tooltip>
            </>
          ) : (
            <div className="flex items-center gap-3 px-3 py-2.5">
              <ThemeToggle />
              <LanguageSelector />
              <span className="text-sm text-muted-foreground">{t('theme.toggle')}</span>
            </div>
          )}

          {/* Support & Feedback */}
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  to="/app/support"
                  className={cn(
                    'flex items-center justify-center px-2 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    location.pathname === '/app/support'
                      ? 'bg-primary text-primary-foreground [&>svg]:text-primary-foreground'
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
                  ? 'bg-primary text-primary-foreground [&>svg]:text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <HeadphonesIcon className="h-5 w-5" />
              {t('navigation.support')}
            </Link>
          )}

          {/* Notifications */}
          <NotificationBell collapsed={collapsed} />

          {/* Settings - Available to all users */}
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  to="/app/settings"
                  data-tutorial="sidebar-settings"
                  className={cn(
                    'flex items-center justify-center px-2 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    location.pathname === '/app/settings'
                      ? 'bg-primary text-primary-foreground [&>svg]:text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <Settings className="h-5 w-5" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">{t('navigation.settings')}</TooltipContent>
            </Tooltip>
          ) : (
            <Link
              to="/app/settings"
              data-tutorial="sidebar-settings"
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                location.pathname === '/app/settings'
                  ? 'bg-primary text-primary-foreground [&>svg]:text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Settings className="h-5 w-5" />
              {t('navigation.settings')}
            </Link>
          )}

          {/* Subscription - Admin only */}
          {canSeeSubscription && (
            collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    to="/app/subscription"
                    className={cn(
                      'flex items-center justify-center px-2 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      location.pathname === '/app/subscription'
                        ? 'bg-primary text-primary-foreground [&>svg]:text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <div className={cn(
                      "p-1 rounded",
                      location.pathname === '/app/subscription' ? 'bg-primary-foreground/20' : 'bg-primary/10'
                    )}>
                      <PlanIcon className={cn(
                        "h-4 w-4",
                        location.pathname === '/app/subscription' ? 'text-primary-foreground' : 'text-primary'
                      )} />
                    </div>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {t('plans.plan')} {t(currentPlan.name)}
                </TooltipContent>
              </Tooltip>
            ) : (
              <Link
                to="/app/subscription"
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  location.pathname === '/app/subscription'
                    ? 'bg-primary text-primary-foreground [&>svg]:text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <div className={cn(
                  "p-1 rounded",
                  location.pathname === '/app/subscription' ? 'bg-primary-foreground/20' : 'bg-primary/10'
                )}>
                  <PlanIcon className={cn(
                    "h-4 w-4",
                    location.pathname === '/app/subscription' ? 'text-primary-foreground' : 'text-primary'
                  )} />
                </div>
                <span>{t('plans.plan')} {t(currentPlan.name)}</span>
              </Link>
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
            onClick={() => setCollapsed(!collapsed)}
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
    </TooltipProvider>
  );
}