import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { z } from 'zod';
import { ArrowLeft, Mail, ShieldAlert } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { PublicBackground } from '@/components/layout/PublicBackground';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

const authSchema = z.object({
  email: z.string().email({ message: 'E-mail inválido' }),
  password: z.string().min(6, { message: 'Senha deve ter no mínimo 6 caracteres' }),
  confirmPassword: z.string().optional(),
  fullName: z.string().min(2, { message: 'Nome deve ter no mínimo 2 caracteres' }).optional(),
}).refine((data) => {
  if (data.fullName && data.confirmPassword) {
    return data.password === data.confirmPassword;
  }
  return true;
}, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirmPassword?: string; fullName?: string }>({});
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [suspendedDialogOpen, setSuspendedDialogOpen] = useState(false);

  useEffect(() => {
    const checkSessionAndRedirect = async () => {
      if (session) {
        // Check if user is system proprietor
        const { data: adminRole } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .eq('role', 'proprietor')
          .maybeSingle();

        if (adminRole) {
          navigate('/admin');
        } else {
          // Preserve the original route if coming from a protected page
          const from = (location.state as any)?.from?.pathname || '/app';
          navigate(from);
        }
      }
    };
    
    checkSessionAndRedirect();
  }, [session, navigate, location.state]);

  // Check if user is suspended after social login
  useEffect(() => {
    const checkSuspendedUser = async () => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('suspended')
          .eq('id', session.user.id)
          .single();
        
        if (profile?.suspended === true) {
          await supabase.auth.signOut();
          setSuspendedDialogOpen(true);
        }
      }
    };
    
    checkSuspendedUser();
  }, [session]);

  const validateForm = (isSignUp: boolean) => {
    try {
      const data = isSignUp 
        ? { email, password, confirmPassword, fullName } 
        : { email, password };
      authSchema.parse(data);
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: typeof errors = {};
        err.errors.forEach((e) => {
          if (e.path[0]) {
            newErrors[e.path[0] as keyof typeof errors] = e.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm(false)) return;
    
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast({ title: 'Erro', description: 'E-mail ou senha incorretos', variant: 'destructive' });
      } else {
        toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      }
      setLoading(false);
      return;
    }

    // Check if user is suspended
    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('suspended')
        .eq('id', data.user.id)
        .single();
      
      if (profile?.suspended === true) {
        await supabase.auth.signOut();
        setSuspendedDialogOpen(true);
        setLoading(false);
        return;
      }

      // Check if user is system proprietor
      const { data: adminRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user.id)
        .eq('role', 'proprietor')
        .maybeSingle();

      // Record login history
      await supabase.from('login_history').insert({
        user_id: data.user.id,
        provider: 'email',
        user_agent: navigator.userAgent,
      });

      toast({ title: 'Bem-vindo!', description: 'Login realizado com sucesso' });
      
      // Redirect system admins to admin panel, preserve route for regular users
      if (adminRole) {
        navigate('/admin');
      } else {
        const from = (location.state as any)?.from?.pathname || '/app';
        navigate(from);
      }
    }
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm(true)) return;
    
    setLoading(true);
    
    try {
      // Send OTP email via edge function
      const response = await fetch(
        `https://hrarkpjuchrbffnrhzcy.supabase.co/functions/v1/send-otp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, fullName }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        toast({ 
          title: 'Erro', 
          description: data.error || 'Erro ao enviar código de verificação', 
          variant: 'destructive' 
        });
        setLoading(false);
        return;
      }

      // Navigate to verification page with credentials
      navigate('/verify-email', { 
        state: { email, password, fullName } 
      });
      
      toast({
        title: 'Código enviado!',
        description: 'Verifique seu e-mail para o código de verificação',
      });
    } catch (error: any) {
      console.error('Signup error:', error);
      toast({ 
        title: 'Erro', 
        description: 'Erro ao processar cadastro. Tente novamente.', 
        variant: 'destructive' 
      });
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrors({ email: 'Digite seu e-mail' });
      return;
    }
    
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      setResetEmailSent(true);
      toast({ title: 'E-mail enviado!', description: 'Verifique sua caixa de entrada' });
    }
    setLoading(false);
  };

  // Suspended user dialog
  if (suspendedDialogOpen) {
    return (
      <PublicBackground>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Dialog open={suspendedDialogOpen} onOpenChange={setSuspendedDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                    <ShieldAlert className="h-6 w-6 text-destructive" />
                  </div>
                </div>
                <DialogTitle>Conta Suspensa</DialogTitle>
                <DialogDescription>
                  A sua conta foi suspensa pelo administrador. Não é possível aceder ao sistema até que a sua conta seja reativada.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button onClick={() => setSuspendedDialogOpen(false)} className="w-full">
                  Entendi
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </PublicBackground>
    );
  }

  if (showForgotPassword) {
    return (
      <PublicBackground>
        <div className="absolute top-4 right-4 z-50">
          <ThemeToggle />
        </div>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold">Recuperar Senha</CardTitle>
              <CardDescription>Digite seu e-mail para receber o link de recuperação</CardDescription>
            </CardHeader>
            <CardContent>
              {resetEmailSent ? (
                <div className="text-center space-y-4">
                  <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                    <Mail className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-semibold">E-mail enviado!</h3>
                  <p className="text-sm text-muted-foreground">
                    Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
                  </p>
                  <Button variant="outline" onClick={() => { setShowForgotPassword(false); setResetEmailSent(false); }} className="w-full">
                    Voltar ao Login
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">E-mail</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                    {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Enviando...' : 'Enviar Link de Recuperação'}
                  </Button>
                  <Button variant="ghost" onClick={() => setShowForgotPassword(false)} className="w-full gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Voltar ao Login
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </PublicBackground>
    );
  }

  // Social login removed per request

  return (
    <PublicBackground>
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Back to Landing */}
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Voltar ao site
          </Link>
          
          <Card>
            <CardHeader className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-xl">Q</span>
                </div>
              </div>
              <CardTitle className="text-2xl font-bold">Qualify</CardTitle>
              <CardDescription>Sistema de gestão de clientes</CardDescription>
            </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Cadastrar</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">E-mail</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                    {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="signin-password">Senha</Label>
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-xs text-primary hover:underline"
                      >
                        Esqueceu a senha?
                      </button>
                    </div>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Entrando...' : 'Entrar'}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nome Completo</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Seu nome"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                    {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">E-mail</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                    {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm-password">Confirmar Senha</Label>
                    <Input
                      id="signup-confirm-password"
                      type="password"
                      placeholder="Digite a senha novamente"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                    {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Criando conta...' : 'Criar conta'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        </div>
      </div>
    </PublicBackground>
  );
}