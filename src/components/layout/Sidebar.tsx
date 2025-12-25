import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

const SIDEBAR_COLLAPSED_KEY = 'qualify-sidebar-collapsed';

const PLAN_CONFIG = {
  free: { name: 'Bússola', icon: Compass },
  starter: { name: 'Lança', icon: Target },
  pro: { name: 'Arco', icon: TrendingUp },
  agency: { name: 'Catapulta', icon: Rocket },
};

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { planType, organization } = useSubscription();
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
      { name: 'Dashboard', href: '/app', icon: LayoutDashboard, tutorialId: 'sidebar-dashboard', show: true },
      { name: 'Funil de Vendas', href: '/app/sales-funnel', icon: Kanban, tutorialId: 'sidebar-funnel', show: canSeeSalesFunnel },
      { name: 'Fluxo Operacional', href: '/app/operational-flow', icon: Workflow, tutorialId: 'sidebar-operational', show: canSeeOperationalFlow },
      { name: 'Clientes', href: '/app/clients', icon: Building2, tutorialId: 'sidebar-clients', show: canSeeClients },
      { name: 'QIA', href: '/app/ai-assistant', icon: Sparkles, tutorialId: 'sidebar-ai', show: true },
      { name: 'Academia', href: '/app/academia', icon: GraduationCap, tutorialId: 'sidebar-academia', show: true },
      { name: 'Equipe', href: '/app/team', icon: UsersRound, tutorialId: 'sidebar-team', show: canSeeTeam },
    ];
    return allItems.filter(item => item.show);
  }, [canSeeSalesFunnel, canSeeOperationalFlow, canSeeClients, canSeeTeam]);

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
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right">{item.name}</TooltipContent>
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
          {/* Theme Toggle */}
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex justify-center">
                  <ThemeToggle />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">Alternar tema</TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex items-center gap-3 px-3 py-2.5">
              <ThemeToggle />
              <span className="text-sm text-muted-foreground">Tema</span>
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
              <TooltipContent side="right">Suporte e Feedback</TooltipContent>
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
              Suporte e Feedback
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
              <TooltipContent side="right">Configurações</TooltipContent>
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
              Configurações
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
                  Plano {currentPlan.name}
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
                <span>Plano {currentPlan.name}</span>
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
                  <TooltipContent side="right">Sair</TooltipContent>
                </Tooltip>
              ) : (
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 px-3 py-2.5 h-auto text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setLogoutDialogOpen(true)}
                >
                  <LogOut className="h-5 w-5" />
                  Sair
                </Button>
              )}
            </div>
          )}

          {/* Logout Confirmation Dialog */}
          <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>O que deseja fazer?</DialogTitle>
                <DialogDescription>
                  Escolha uma opção abaixo para continuar.
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
                      <p className="font-medium">Mudar de Agência</p>
                      <p className="text-xs text-muted-foreground">Trocar para outra agência que você tem acesso</p>
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
                    <p className="font-medium">Sair da Aplicação</p>
                    <p className="text-xs text-destructive-foreground/70">Encerrar sua sessão completamente</p>
                  </div>
                </Button>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setLogoutDialogOpen(false)}>
                  Cancelar
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
                Recolher Menu
              </>
            )}
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}
