import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
import { Separator } from '@/components/ui/separator';

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
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'facebook' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirmPassword?: string; fullName?: string }>({});
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [suspendedDialogOpen, setSuspendedDialogOpen] = useState(false);

  useEffect(() => {
    if (session) {
      navigate('/app');
    }
  }, [session, navigate]);

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
    }

    toast({ title: 'Bem-vindo!', description: 'Login realizado com sucesso' });
    navigate('/app');
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

  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    setSocialLoading(provider);
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/app`,
      },
    });
    
    if (error) {
      toast({ 
        title: 'Erro', 
        description: `Erro ao entrar com ${provider === 'google' ? 'Google' : 'Facebook'}`, 
        variant: 'destructive' 
      });
      setSocialLoading(null);
    }
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
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
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
    );
  }

  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
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
    );
  }

  const SocialLoginButtons = () => (
    <div className="space-y-3">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <Separator className="w-full" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">ou continue com</span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => handleSocialLogin('google')}
          disabled={socialLoading !== null}
          className="w-full"
        >
          {socialLoading === 'google' ? (
            <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
          ) : (
            <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          )}
          Google
        </Button>
        
        <Button
          type="button"
          variant="outline"
          onClick={() => handleSocialLogin('facebook')}
          disabled={socialLoading !== null}
          className="w-full"
        >
          {socialLoading === 'facebook' ? (
            <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
          ) : (
            <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          )}
          Facebook
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
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
                
                <SocialLoginButtons />
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
                
                <SocialLoginButtons />
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}