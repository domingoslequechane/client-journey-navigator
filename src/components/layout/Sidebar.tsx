import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  Kanban,
  Sparkles,
  Workflow,
  UsersRound,
  LogOut,
  GraduationCap,
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const navigation = [
  { name: 'Dashboard', href: '/app', icon: LayoutDashboard },
  { name: 'Funil de Vendas', href: '/app/sales-funnel', icon: Kanban },
  { name: 'Fluxo Operacional', href: '/app/operational-flow', icon: Workflow },
  { name: 'Clientes', href: '/app/clients', icon: Users },
  { name: 'Academia', href: '/app/academia', icon: GraduationCap },
  { name: 'Equipe', href: '/app/team', icon: UsersRound },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    setLogoutDialogOpen(false);
    navigate('/auth');
  };

  const NavItem = ({ item, isActive }: { item: typeof navigation[0]; isActive: boolean }) => {
    const content = (
      <Link
        to={item.href}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
          isActive
            ? 'bg-primary text-primary-foreground'
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
        
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return <NavItem key={item.name} item={item} isActive={isActive} />;
          })}
        </nav>

        <div className="p-2 border-t border-border space-y-1">
          {/* AI Assistant */}
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  to="/app/ai-assistant"
                  className={cn(
                    'flex items-center justify-center px-2 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    location.pathname === '/app/ai-assistant'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <Sparkles className="h-5 w-5" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Assistente IA</TooltipContent>
            </Tooltip>
          ) : (
            <Link
              to="/app/ai-assistant"
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                location.pathname === '/app/ai-assistant'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Sparkles className="h-5 w-5" />
              Assistente IA
            </Link>
          )}

          {/* Settings */}
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  to="/app/settings"
                  className={cn(
                    'flex items-center justify-center px-2 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    location.pathname === '/app/settings'
                      ? 'bg-primary text-primary-foreground'
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
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                location.pathname === '/app/settings'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Settings className="h-5 w-5" />
              Configurações
            </Link>
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
                <DialogTitle>Confirmar Saída</DialogTitle>
                <DialogDescription>
                  Tem certeza que deseja sair da sua conta?
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setLogoutDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button variant="destructive" onClick={handleSignOut}>
                  Sair
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
