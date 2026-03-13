"use client";

import { useState, useMemo, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from 'next-themes';
import { supabase } from '@/integrations/supabase/client';
import {
  LayoutDashboard,
  Kanban,
  Bot,
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
  Share2,
  PenTool,
  Menu,
  ChevronRight
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
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

export function MobileHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  const { canSeeSalesFunnel, canSeeOperationalFlow, canSeeClients, canSeeTeam, isAdmin, canManageFinance } = useUserRole();
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [hasMultipleOrgs, setHasMultipleOrgs] = useState(false);

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
    const mainItems = [
      { name: t('navigation.home'), href: '/app', icon: LayoutDashboard, show: true },
    ];

    if (canSeeSalesFunnel || canSeeOperationalFlow) {
      mainItems.push({ name: t('navigation.pipeline'), href: '/app/pipeline', icon: Kanban, show: true });
    }

    if (canManageFinance) {
      mainItems.push({ name: t('navigation.finance', 'Finanças'), href: '/app/finance', icon: Wallet, show: true });
    }

    mainItems.push({ name: t('navigation.qia'), href: '/app/ai-assistant', icon: Bot, show: true });

    const moreItems = [];
    if (canSeeClients) {
      moreItems.push({ name: t('navigation.clients'), href: '/app/clients', icon: Building2, show: true });
    }
    moreItems.push({ name: t('navigation.link23'), href: '/app/link-trees', icon: Link2, show: true });
    moreItems.push({ name: t('navigation.editorial'), href: '/app/editorial', icon: CalendarDays, show: true });
    moreItems.push({ name: t('navigation.socialMedia'), href: '/app/social-media', icon: Share2, show: true });
    moreItems.push({ name: t('navigation.studio'), href: '/app/studio', icon: PenTool, show: true });
    moreItems.push({ name: t('navigation.academy'), href: '/app/academia', icon: GraduationCap, show: true });
    moreItems.push({ name: t('navigation.notifications'), href: '/app/notifications', icon: Bell, show: true });
    moreItems.push({ name: t('navigation.support'), href: '/app/support', icon: MessageSquare, show: true });

    if (canSeeTeam) {
      moreItems.push({ name: t('navigation.team'), href: '/app/team', icon: Users, show: true });
    }

    const adminItems = [];
    if (isAdmin) {
      adminItems.push({ name: t('navigation.settings'), href: '/app/settings', icon: Settings, show: true });
      adminItems.push({ name: t('navigation.subscription'), href: '/app/subscription', icon: CreditCard, show: true });
    }

    return { mainItems, moreItems, adminItems };
  }, [canSeeSalesFunnel, canSeeOperationalFlow, canManageFinance, canSeeClients, canSeeTeam, isAdmin, t]);

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

  // Get active page title
  const activePageTitle = useMemo(() => {
    const path = location.pathname;
    
    // Exact matches first
    if (path === '/app') return t('navigation.home');
    if (path === '/app/pipeline') return t('navigation.pipeline');
    if (path === '/app/finance') return t('navigation.finance', 'Finanças');
    if (path === '/app/ai-assistant') return t('navigation.qia');
    if (path === '/app/clients') return t('navigation.clients');
    if (path.startsWith('/app/clients/')) return t('navigation.clients');
    if (path === '/app/social-media') return t('navigation.socialMedia');
    if (path === '/app/editorial') return t('navigation.editorial');
    if (path === '/app/link-trees') return t('navigation.link23');
    if (path === '/app/studio') return t('navigation.studio');
    if (path === '/app/academia') return t('navigation.academy');
    if (path === '/app/team') return t('navigation.team');
    if (path === '/app/settings') return t('navigation.settings');
    if (path === '/app/subscription') return t('navigation.subscription');
    if (path === '/app/notifications') return t('navigation.notifications');
    if (path === '/app/support') return t('navigation.support');
    
    return 'Qualify'; // Fallback
  }, [location.pathname, t]);

  return (
    <>
      <header className="sticky top-0 left-0 right-0 z-[100] bg-background/95 backdrop-blur-sm border-b border-border h-16 flex items-center justify-between px-4 md:hidden">
        <div className="flex items-center gap-3 overflow-hidden">
          <Link to="/app" className="shrink-0">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">Q</span>
            </div>
          </Link>
          <h1 className="font-bold text-lg truncate animate-in fade-in slide-in-from-left-2 duration-300">
            {activePageTitle}
          </h1>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[85%] sm:w-[350px] p-0 flex flex-col h-full bg-background border-l">
            <SheetHeader className="p-4 border-b shrink-0 text-left bg-muted/30">
              <SheetTitle className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-lg">Q</span>
                </div>
                Qualify
              </SheetTitle>
            </SheetHeader>

            <ScrollArea className="flex-1 px-2 pt-4">
              <div className="space-y-6 pb-20">
                {/* Main Menu */}
                <div className="space-y-1">
                  {menuItems.mainItems.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                      <button
                        key={item.name}
                        onClick={() => handleNavigate(item.href)}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-3 rounded-xl transition-all active:scale-[0.98]",
                          isActive ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-muted-foreground")} />
                          <span className="font-semibold">{item.name}</span>
                        </div>
                        <ChevronRight className="h-4 w-4 opacity-50" />
                      </button>
                    );
                  })}
                </div>

                <Separator className="mx-2 opacity-50" />

                {/* More Items */}
                <div className="space-y-1">
                  {menuItems.moreItems.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                      <button
                        key={item.name}
                        onClick={() => handleNavigate(item.href)}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all active:scale-[0.98]",
                          isActive ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"
                        )}
                      >
                        <div className="flex items-center gap-3 text-sm">
                          <item.icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
                          <span className="font-medium">{item.name}</span>
                        </div>
                        <ChevronRight className="h-3 w-3 opacity-30" />
                      </button>
                    );
                  })}
                </div>

                {menuItems.adminItems.length > 0 && (
                  <>
                    <Separator className="mx-2 opacity-50" />
                    <div className="space-y-1">
                      {menuItems.adminItems.map((item) => {
                        const isActive = location.pathname === item.href;
                        return (
                          <button
                            key={item.name}
                            onClick={() => handleNavigate(item.href)}
                            className={cn(
                              "w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all active:scale-[0.98]",
                              isActive ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"
                            )}
                          >
                            <div className="flex items-center gap-3 text-sm">
                              <item.icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
                              <span className="font-medium">{item.name}</span>
                            </div>
                            <ChevronRight className="h-3 w-3 opacity-30" />
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>

            {/* Footer Actions */}
            <div className="p-4 border-t bg-muted/10 shrink-0 space-y-3">
              <Button
                variant="outline"
                className="w-full h-12 justify-center gap-3 rounded-xl border-border bg-background"
                onClick={handleToggleTheme}
              >
                {theme === 'dark' ? <Sun className="h-5 w-5 text-yellow-500" /> : <Moon className="h-5 w-5 text-blue-500" />}
                <span className="font-bold tracking-tight uppercase">
                  {theme === 'dark' ? t('theme.light') : t('theme.dark')}
                </span>
              </Button>

              <Button
                variant="ghost"
                className="w-full h-12 justify-start gap-4 px-4 text-destructive hover:bg-destructive/10 hover:text-destructive rounded-xl transition-all"
                onClick={handleOpenLogoutDialog}
              >
                <div className="p-1.5 rounded-lg bg-destructive/10 group-hover:bg-destructive/20 transition-colors">
                  <LogOut className="h-5 w-5" />
                </div>
                <span className="font-bold">{t('navigation.logout')}</span>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
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
