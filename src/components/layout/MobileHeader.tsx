"use client";

import { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from 'next-themes';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

import {
  LayoutDashboard,
  Kanban,
  MessagesSquare,
  GraduationCap,
  Users,
  MessageSquare,
  Bell,
  Settings,
  CreditCard,
  Sun,
  Moon,
  LogOut,
  RefreshCw,
  Link2,
  CalendarDays,
  Wallet,
  Building2,
  Megaphone,
  PenTool,
  BrainCircuit,
  Menu,
  ChevronRight,
  Rocket,
  Headset,
  Download,
  X,
  Bot
} from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Badge } from '@/components/ui/badge';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

import { useHeader } from '@/contexts/HeaderContext';
import { ArrowLeft } from 'lucide-react';

export function MobileHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  const { canSeeSalesFunnel, canSeeOperationalFlow, canSeeClients, canSeeTeam, isAdmin, canManageFinance } = useUserRole();
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { planType, organization } = useSubscription();
  const { backAction, customTitle, customIcon, rightAction } = useHeader();
  const [open, setOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [hasMultipleOrgs, setHasMultipleOrgs] = useState(false);
  const { canInstall, install } = usePWAInstall();

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

  // Main navigation items for the menu
  const menuItems = useMemo(() => {
    const mainItems: Array<{ name: string; href: string; icon: any; show: boolean; isQia?: boolean; badge?: string }> = [
      { name: 'Dashboard', href: '/app', icon: LayoutDashboard, show: true },
      { name: 'Pipeline', href: '/app/pipeline', icon: Kanban, show: true },
      { name: 'Finanças', href: '/app/finance', icon: Wallet, show: true },
    ];

    mainItems.push({ name: t('navigation.link23'), href: '/app/link-trees', icon: Link2, show: true });
    mainItems.push({ name: t('navigation.editorial'), href: '/app/editorial', icon: CalendarDays, show: true });
    mainItems.push({ name: t('navigation.socialMedia'), href: '/app/social-media', icon: ((props: any) => <Megaphone {...props} className={cn(props.className, "-rotate-12")} />) as any, show: true });

    mainItems.push({ name: t('navigation.qia'), href: '/app/ai-assistant', icon: MessagesSquare, show: true, isQia: true });
    mainItems.push({ name: t('navigation.atendeAI', 'Atende AI'), href: '/app/atende-ai', icon: Bot, show: true });
    mainItems.push({ name: t('navigation.studio'), href: '/app/studio', icon: PenTool, show: true });
    mainItems.push({ name: t('navigation.academy'), href: '/app/academia', icon: GraduationCap, show: true });

    if (canSeeClients) {
      mainItems.push({ name: t('navigation.clients'), href: '/app/clients', icon: Building2, show: true });
    }

    if (canSeeTeam) {
      mainItems.push({ name: t('navigation.team'), href: '/app/team', icon: Users, show: true });
    }

    return mainItems;
  }, [canSeeSalesFunnel, canSeeOperationalFlow, canManageFinance, canSeeClients, canSeeTeam, t]);

  const bottomItems = useMemo(() => {
    const items: Array<{ name: string; href: string; icon: any; show: boolean; className?: string }> = [
      { name: t('navigation.support'), href: '/app/support', icon: Headset, show: true },
      { name: t('navigation.notifications'), href: '/app/notifications', icon: Bell, show: true },
    ];

    if (isAdmin) {
      items.push({ name: t('navigation.settings'), href: '/app/settings', icon: Settings, show: true });
    }

    // Plan name mapping
    const planNames: Record<string, string> = {
      starter: 'Lança',
      pro: 'Arco',
      agency: 'Catapulta',
      free: 'Free'
    };
    const planName = planNames[planType || 'free'] || 'Free';

    items.push({ 
      name: `Plano ${planName}`, 
      href: '/app/subscription', 
      icon: Rocket, 
      show: true,
      className: "text-[#F97316]" // Orange text for the plan
    });

    return items;
  }, [isAdmin, planType, t]);

  const handleNavigate = (href: string) => {
    setOpen(false);
    navigate(href);
  };

  const handleToggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleOpenLogoutDialog = () => {
    setOpen(false);
    setLogoutDialogOpen(true);
  };

  const handleSignOut = async () => {
    await signOut();
    setLogoutDialogOpen(false);
    navigate('/auth');
  };

  const handleSwitchOrganization = () => {
    setLogoutDialogOpen(false);
    navigate('/app/select-organization');
  };

  // Get active page title and icon
  const activePageInfo = useMemo(() => {
    const path = location.pathname;
    
    const getBaseInfo = () => {
      if (path === '/app') return { title: 'Dashboard', icon: LayoutDashboard };
      if (path.startsWith('/app/pipeline')) return { title: 'Pipeline', icon: Kanban };
      if (path.startsWith('/app/finance')) return { title: 'Finanças', icon: Wallet };
      if (path.startsWith('/app/ai-assistant')) return { title: t('navigation.qia'), icon: MessagesSquare };
      if (path.startsWith('/app/clients')) return { title: t('navigation.clients'), icon: Building2 };
      if (path.startsWith('/app/social-media')) return { title: t('navigation.socialMedia'), icon: ((props: any) => <Megaphone {...props} className={cn(props.className, "-rotate-12")} />) as any };
      if (path.startsWith('/app/editorial')) return { title: t('navigation.editorial'), icon: CalendarDays };
      if (path.startsWith('/app/link-trees')) return { title: t('navigation.link23'), icon: Link2 };
      if (path.startsWith('/app/studio')) return { title: t('navigation.studio'), icon: PenTool };
      if (path.startsWith('/app/atende-ai')) return { title: t('navigation.atendeAI', 'Atende AI'), icon: Bot };
      if (path.startsWith('/app/academia')) return { title: t('navigation.academy'), icon: GraduationCap };
      if (path.startsWith('/app/team')) return { title: t('navigation.team'), icon: Users };
      if (path.startsWith('/app/settings')) return { title: t('navigation.settings'), icon: Settings };
      if (path.startsWith('/app/subscription')) return { title: t('navigation.subscription'), icon: CreditCard };
      if (path.startsWith('/app/notifications')) return { title: t('navigation.notifications'), icon: Bell };
      if (path.startsWith('/app/support')) return { title: t('navigation.support'), icon: Headset };
      return { title: 'Qualify', icon: null };
    };

    const base = getBaseInfo();
    return {
      title: customTitle || base.title,
      icon: customIcon || base.icon
    };
  }, [location.pathname, t, customTitle, customIcon]);

  return (
    <>
      <header 
        className={cn(
          "fixed top-3 left-1/2 -translate-x-1/2 z-[200] transition-all duration-300 md:hidden w-[calc(100%-2rem)] max-w-lg rounded-2xl flex flex-col overflow-hidden border",
          open ? "shadow-2xl border-border/50 bg-background/95 backdrop-blur-xl" : "shadow-xl border-primary/20 bg-primary backdrop-blur-lg"
        )}
      >
        <div className={cn(
          "flex items-center justify-between py-2 px-4 transition-colors",
          open ? "bg-primary text-primary-foreground" : "text-primary-foreground"
        )}>

          <div className="flex items-center gap-2 overflow-hidden">
            {backAction && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={backAction}
                className="shrink-0 -ml-2 text-primary-foreground hover:bg-black/10 hover:text-white"
              >
                <ArrowLeft className="h-6 w-6" />
              </Button>
            )}
            {activePageInfo.icon && (
              <activePageInfo.icon className={cn("h-5 w-5 text-current shrink-0 animate-in fade-in scale-in duration-500", backAction && "ml-1")} />
            )}
            <h1 className="font-bold text-xl md:text-2xl animate-in fade-in slide-in-from-left-2 duration-300">
              {activePageInfo.title}
            </h1>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <ThemeToggle variant="ghost" size="icon" className="h-9 w-9 text-current hover:bg-black/10 hover:text-white" />
            {rightAction && <div className="animate-in fade-in zoom-in duration-300 text-current">{rightAction}</div>}

            <Button 
              variant="ghost" 
              size="icon" 
              className="relative text-current hover:bg-black/10 hover:text-white"
              onClick={() => setOpen(!open)}
            >
              {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {open && (
          <div className="w-full bg-transparent animate-in slide-in-from-top-4 duration-300 border-t border-border/10">

            <div className="overflow-y-auto max-h-[70vh] px-2 py-4 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
              <div className="space-y-6">
                {/* Main Menu */}
                <div className="space-y-1">
                  {menuItems.map((item) => {
                    const isActive = location.pathname === item.href;
                    const isQia = (item as any).isQia;
                    
                    return (
                      <button
                        key={item.name}
                        onClick={() => handleNavigate(item.href)}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-3 rounded-xl transition-all active:scale-[0.98]",
                          isActive 
                            ? isQia 
                              ? "bg-[#F97316] text-white shadow-lg shadow-orange-500/20" 
                              : "bg-primary/10 text-primary" 
                            : "hover:bg-muted text-foreground/80 hover:text-foreground"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon className={cn("h-5 w-5", isActive ? (isQia ? "text-white" : "text-primary") : "text-muted-foreground")} />
                          <span className={cn("font-semibold", isActive ? "font-bold" : "")}>{item.name}</span>
                          {item.badge && (
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] h-4 px-1.5 font-bold border-primary text-primary opacity-80 uppercase tracking-wider",
                                isActive && isQia && "border-white text-white"
                              )}
                            >
                              {item.badge}
                            </Badge>
                          )}
                        </div>
                        {isQia && isActive && <div className="h-2 w-2 rounded-full bg-white animate-pulse" />}
                      </button>
                    );
                  })}
                </div>

                <Separator className="mx-2 opacity-50" />

                {/* Bottom Menu */}
                <div className="space-y-1">

                  {bottomItems.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                      <button
                        key={item.name}
                        onClick={() => handleNavigate(item.href)}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all active:scale-[0.98]",
                          isActive ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground/80 hover:text-foreground",
                          (item as any).className
                        )}
                      >
                        <div className="flex items-center gap-3 text-sm">
                          <item.icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground", (item as any).className)} />
                          <span className="font-medium">{item.name}</span>
                        </div>
                      </button>
                    );
                  })}

                  {canInstall && (
                    <button
                      onClick={install}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all active:scale-[0.98] hover:bg-primary/10 text-primary group"
                    >
                      <div className="flex items-center gap-3 text-sm">
                        <Download className="h-4 w-4 text-primary animate-bounce" />
                        <span className="font-bold">Instalar Aplicação</span>
                      </div>
                      <ChevronRight className="h-3 w-3 opacity-50" />
                    </button>
                  )}
                </div>

                <Separator className="mx-2 opacity-50" />

                {/* Desktop Logout simulation inside Menu */}
                <div className="space-y-1">
                  <div className="px-3 pb-2 pt-1">
                    <p className="text-[11px] text-muted-foreground font-medium truncate">
                      {user?.email}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-4 px-3 text-foreground/80 hover:bg-destructive/10 hover:text-destructive rounded-xl transition-all group"
                    onClick={handleOpenLogoutDialog}
                  >
                    <LogOut className="h-5 w-5 text-muted-foreground group-hover:text-destructive" />
                    <span className="font-medium text-sm">{t('navigation.logout')}</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

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
    </>
  );
}
