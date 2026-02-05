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
  Building2,
  Kanban,
  Sparkles,
  Workflow,
  MoreHorizontal,
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
  Palette
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
  const { canSeeSalesFunnel, canSeeOperationalFlow, canSeeClients, canSeeTeam, isAdmin } = useUserRole();
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

    // AI Assistant for everyone
    items.push({ name: t('navigation.qia'), href: '/app/ai-assistant', icon: Sparkles, show: true });

    return items;
  }, [canSeeSalesFunnel, canSeeOperationalFlow, t]);

  // Build "More" menu items
  const moreItems = useMemo(() => {
    const items: { name: string; href: string; icon: typeof GraduationCap; show: boolean; badge?: string }[] = [];

    // Add Clients to more menu on mobile
    if (canSeeClients) {
      items.push({ name: t('navigation.clients'), href: '/app/clients', icon: Building2, show: true });
    }

    // Add Link23 to more menu
    items.push({ name: 'Link23', href: '/app/link-trees', icon: Link2, show: true });

    // Add Studio AI to more menu
    items.push({ name: 'Studio AI', href: '/app/studio', icon: Palette, show: true, badge: 'novo' });

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
          backgroundColor: 'hsl(var(--background) / 0.95)'
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
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px] font-medium">{t('navigation.more')}</span>
          </button>
        </div>
      </nav>

      {/* More Drawer */}
      <Drawer open={moreOpen} onOpenChange={setMoreOpen}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="flex items-center justify-between">
            <DrawerTitle>{t('navigation.menu')}</DrawerTitle>
            <DrawerClose asChild>
              <button className="p-2 rounded-lg hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </DrawerClose>
          </DrawerHeader>
          
          <div className="px-4 pb-8 space-y-2">
            {/* Navigation items */}
            {moreItems.filter(item => item.show).map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <button
                  key={item.name}
                  onClick={() => handleNavigate(item.href)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-muted text-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  <span className="font-medium flex-1">{item.name}</span>
                  {item.badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary uppercase font-semibold">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Divider */}
            <div className="h-px bg-border my-4" />

            {/* Language selector */}
            <div className="flex items-center gap-3 px-4 py-3">
              <LanguageSelector />
              <span className="font-medium text-foreground">{t('language.select')}</span>
            </div>

            {/* Theme toggle */}
            <button
              onClick={handleToggleTheme}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors hover:bg-muted text-foreground text-left"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              <span className="font-medium">{theme === 'dark' ? t('theme.light') : t('theme.dark')}</span>
            </button>

            {/* Logout */}
            <button
              onClick={handleOpenLogoutDialog}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors hover:bg-destructive/10 text-destructive text-left"
            >
              <LogOut className="h-5 w-5" />
              <span className="font-medium">{t('navigation.logout')}</span>
            </button>
          </div>
        </DrawerContent>
      </Drawer>

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