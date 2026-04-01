import { useState, useEffect } from 'react';
import { AnimatedContainer } from '@/components/ui/animated-container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Bell, Volume2, User, Lock, Save, Moon, Sun } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';

export default function AdminSettings() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Local settings (stored in localStorage)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
      fetchProfile();
    }
    
    // Load local settings
    const savedNotifications = localStorage.getItem('admin-notifications-enabled');
    const savedSound = localStorage.getItem('admin-sound-enabled');
    
    if (savedNotifications !== null) setNotificationsEnabled(savedNotifications === 'true');
    if (savedSound !== null) setSoundEnabled(savedSound === 'true');
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      setFullName(data?.full_name || '');
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleUpdateProfile = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('id', user?.id);

      if (error) throw error;
      toast.success('Perfil atualizado com sucesso');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Erro ao atualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Senha atualizada com sucesso');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error('Erro ao atualizar senha');
    } finally {
      setLoading(false);
    }
  };

  const toggleNotifications = (checked: boolean) => {
    setNotificationsEnabled(checked);
    localStorage.setItem('admin-notifications-enabled', String(checked));
    toast.success(checked ? 'Notificações ativadas' : 'Notificações desativadas');
  };

  const toggleSound = (checked: boolean) => {
    setSoundEnabled(checked);
    localStorage.setItem('admin-sound-enabled', String(checked));
    toast.success(checked ? 'Efeitos sonoros ativados' : 'Efeitos sonoros desativados');
    
    if (checked) {
      // Play a test sound
      const audio = new Audio('/universfield-notification.mp3');
      audio.play().catch(e => console.log('Audio play failed:', e));
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <AnimatedContainer animation="fade-up">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
            <p className="text-muted-foreground">Gerencie sua conta e preferências do painel admin.</p>
          </div>
        </div>
      </AnimatedContainer>

      <div className="grid gap-8">
        {/* Profile Section */}
        <AnimatedContainer animation="fade-up" delay={0.1}>
          <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <CardTitle>Perfil</CardTitle>
              </div>
              <CardDescription>Atualize suas informações básicas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email (Não editável)</Label>
                <Input id="email" value={email} disabled className="bg-muted" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input 
                  id="name" 
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)} 
                  placeholder="Seu nome"
                />
              </div>
              <Button onClick={handleUpdateProfile} disabled={loading} className="w-fit">
                <Save className="h-4 w-4 mr-2" />
                Salvar Alterações
              </Button>
            </CardContent>
          </Card>
        </AnimatedContainer>

        {/* Preferences Section */}
        <AnimatedContainer animation="fade-up" delay={0.2}>
          <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                <CardTitle>Preferências</CardTitle>
              </div>
              <CardDescription>Configure como você interage com o sistema.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4 text-orange-500" />
                    <Label className="text-base">Tema Escuro / Claro</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">Alterne entre o modo claro e escuro.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Sun className="h-4 w-4 text-muted-foreground" />
                  <Switch 
                    checked={theme === 'dark'} 
                    onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')} 
                  />
                  <Moon className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-blue-500" />
                    <Label className="text-base">Notificações em Tempo Real</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">Receba alertas visuais para novas mensagens de suporte.</p>
                </div>
                <Switch 
                  checked={notificationsEnabled} 
                  onCheckedChange={toggleNotifications} 
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-4 w-4 text-green-500" />
                    <Label className="text-base">Efeitos Sonoros</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">Toque um som quando uma nova mensagem chegar.</p>
                </div>
                <Switch 
                  checked={soundEnabled} 
                  onCheckedChange={toggleSound} 
                />
              </div>
            </CardContent>
          </Card>
        </AnimatedContainer>

        {/* Security Section */}
        <AnimatedContainer animation="fade-up" delay={0.3}>
          <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm text-card-foreground">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                <CardTitle>Segurança</CardTitle>
              </div>
              <CardDescription>Mude sua senha de acesso.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="new-password">Nova Senha</Label>
                <Input 
                  id="new-password" 
                  type="password" 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                <Input 
                  id="confirm-password" 
                  type="password" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                />
              </div>
              <Button onClick={handleUpdatePassword} disabled={loading} variant="secondary">
                <Lock className="h-4 w-4 mr-2" />
                Atualizar Senha
              </Button>
            </CardContent>
          </Card>
        </AnimatedContainer>
      </div>
    </div>
  );
}
