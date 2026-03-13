"use client";

import { useState, useMemo, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from 'next-themes';
import { useKeyboardVisible } from '@/hooks/useKeyboardVisible';
import { supabase } from '@/integrations/supabase/client';
import {
  LayoutDashboard,
  Kanban,
  Sparkles,
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
  X,
  RefreshCw,
  Link2,
  CalendarDays,
  Wallet,
  Building2,
  Share2,
  PenTool,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from '@/components/ui/drawer';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LanguageSelector } from '@/components/ui/language-selector';

export function MobileNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  const { canSeeSalesFunnel, canSeeOperationalFlow, canSeeClients, canSeeTeam, isAdmin, canManageFinance } = useUserRole();
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const isKeyboardVisible = useKeyboardVisible();
  const [moreOpen, setMoreOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [hasMultipleOrgs, setHasMultipleOrgs] = useState(false);

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

  // Build main navigation based on role permissions
  const navigation = useMemo(() => {
    const items = [
      { name: t('navigation.home'), href: '/app', icon: LayoutDashboard, show: true },
    ];

     // Add Pipeline if user has access to either funnel
     if (canSeeSalesFunnel || canSeeOperationalFlow) {
       items.push({ name: t('navigation.pipeline'), href: '/app/pipeline', icon: Kanban, show: true });
    }

    // Add Finance if user has access
    if (canManageFinance) {
      items.push({ name: t('navigation.finance', 'Finanças'), href: '/app/finance', icon: Wallet, show: true });
    }

    // AI Assistant for everyone
    items.push({ name: t('navigation.qia'), href: '/app/ai-assistant', icon: Bot, show: true });

    return items;
  }, [canSeeSalesFunnel, canSeeOperationalFlow, canManageFinance, t]);

  // Build "More" menu items
  const moreItems = useMemo(() => {
    const items: { name: string; href: string; icon: typeof GraduationCap; show: boolean; badge?: string }[] = [];

    // Add Clients to more menu on mobile
    if (canSeeClients) {
      items.push({ name: t('navigation.clients'), href: '/app/clients', icon: Building2, show: true });
    }

    // Add Link23 to more menu
    items.push({ name: t('navigation.link23'), href: '/app/link-trees', icon: Link2, show: true });

    // Add Editorial Calendar to more menu
    items.push({ name: t('navigation.editorial'), href: '/app/editorial', icon: CalendarDays, show: true });

    // Add Social Media to more menu
    items.push({ name: t('navigation.socialMedia'), href: '/app/social-media', icon: Share2, show: true });

    // Add Studio Criativo to more menu
    items.push({ name: t('navigation.studio'), href: '/app/studio', icon: PenTool, show: true });

    items.push(
      { name: t('navigation.academy'), href: '/app/academia', icon: GraduationCap, show: true },
      { name: t('navigation.notifications'), href: '/app/notifications', icon: Bell, show: true },
      { name: t('navigation.support'), href: '/app/support', icon: MessageSquare, show: true },
    );

    if (canSeeTeam) {
      items.push({ name: t('navigation.team'), href: '/app/team', icon: Users, show: true });
    }

    if (isAdmin) {
      items.push({ name: t('navigation.settings'), href: '/app/settings', icon: Settings, show: true });
      items.push({ name: t('navigation.subscription'), href: '/app/subscription', icon: CreditCard, show: true });
    }

    return items;
  }, [canSeeTeam, isAdmin, canSeeClients, t]);

  const handleNavigate = (href: string) => {
    setMoreOpen(false);
    navigate(href);
  };

  const handleToggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleOpenLogoutDialog = () => {
    setMoreOpen(false);
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

  return (
    <>
      <nav 
        className={cn(
          "fixed bottom-0 left-0 right-0 z-[999] bg-background/95 backdrop-blur-sm border-t border-border shadow-lg md:hidden safe-area-bottom",
          "transition-transform duration-200",
          isKeyboardVisible && "translate-y-full"
        )}
        style={{ 
          position: 'fixed', 
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'hsl(var(--background) / 0.95)',
          zIndex: 1000 // Ensure it's above drawer overlay
        }}
      >
        <div className="flex items-center justify-around py-2">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href || 
              (item.href !== '/app' && location.pathname.startsWith(item.href));
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[64px]',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground'
                )}
              >
                <item.icon className={cn('h-5 w-5', isActive && 'text-primary')} />
                <span className="text-[10px] font-medium">{item.name}</span>
              </Link>
            );
          })}
          
          {/* More button */}
          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[64px] text-muted-foreground"
          >
            {moreOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
            <span className="text-[10px] font-medium">{t('navigation.more')}</span>
          </button>
        </div>
      </nav>

      {/* More Menu Panel (Above bottom bar) */}
      <div 
        className={cn(
          "fixed left-0 right-0 z-[998] bg-background/98 backdrop-blur-md border-t border-border shadow-2xl md:hidden transition-all duration-300 ease-in-out",
          moreOpen 
            ? "bottom-[calc(60px+env(safe-area-inset-bottom))] opacity-100 translate-y-0" 
            : "bottom-[-100%] opacity-0 translate-y-20 pointer-events-none"
        )}
        style={{ 
          maxHeight: 'calc(80vh - 60px)',
          borderRadius: '20px 20px 0 0'
        }}
      >
        <div className="flex flex-col h-full overflow-hidden">
          <div className="flex items-center justify-between border-b px-4 py-3 shrink-0">
            <h2 className="font-semibold">{t('navigation.menu')}</h2>
            <button 
              onClick={() => setMoreOpen(false)}
              className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto px-4 pb-8 pt-2 space-y-2 custom-scrollbar">
            {/* Navigation items */}
            {moreItems.filter(item => item.show).map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <button
                  key={item.name}
                  onClick={() => handleNavigate(item.href)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all active:scale-[0.98] text-left',
                    isActive
                      ? 'bg-primary/10 text-primary border border-primary/10'
                      : 'hover:bg-muted text-foreground border border-transparent'
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-lg",
                    isActive ? "bg-primary/20" : "bg-muted"
                  )}>
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                  </div>
                  <span className="font-medium flex-1">{item.name}</span>
                  {item.badge && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase font-bold tracking-wider">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Divider */}
            <div className="h-px bg-border my-4 mx-2" />

            {/* Settings & System */}
            <div className="grid grid-cols-1 gap-2 pb-4">
              <button
                onClick={handleToggleTheme}
                className="p-4 rounded-xl bg-muted/50 border border-border flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
              >
                {theme === 'dark' ? <Sun className="h-5 w-5 text-yellow-500" /> : <Moon className="h-5 w-5 text-blue-500" />}
                <span className="text-sm font-medium text-foreground uppercase tracking-wider">
                  {theme === 'dark' ? t('theme.light') : t('theme.dark')}
                </span>
              </button>
            </div>

            {/* Logout */}
            <button
              onClick={handleOpenLogoutDialog}
              className="w-full flex items-center gap-3 px-4 py-4 rounded-xl transition-all hover:bg-destructive/10 text-destructive text-left group"
            >
              <div className="p-2 rounded-lg bg-destructive/10 group-hover:bg-destructive/20 transition-colors">
                <LogOut className="h-5 w-5" />
              </div>
              <span className="font-semibold">{t('navigation.logout')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Non-blocking Backdrop for the More menu */}
      {moreOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[997] md:hidden transition-opacity duration-300"
          onClick={() => setMoreOpen(false)}
        />
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
    </>
  );
}