import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { z } from 'zod';
import { CheckCircle, Loader2 } from 'lucide-react';
import { PublicBackground } from '@/components/layout/PublicBackground';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

const passwordSchema = z.object({
  password: z.string().min(8, { message: 'Senha deve ter no mínimo 8 caracteres' }),
  confirmPassword: z.string().min(8, { message: 'Confirmação de senha deve ter no mínimo 8 caracteres' }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

export default function ResetPassword() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      // Check for recovery session from URL
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type');
      
      // This page requires recovery tokens - if not present, redirect to 404
      if (type !== 'recovery' || !accessToken || !refreshToken) {
        // No valid recovery context - redirect to 404
        navigate('/not-found', { replace: true });
        return;
      }
      
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) {
        console.error('Session error:', error);
        toast({ title: 'Erro', description: 'Link de recuperação inválido ou expirado', variant: 'destructive' });
        navigate('/auth');
        return;
      }
      setVerifying(false);
    };
    
    checkSession();
  }, [navigate]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      passwordSchema.parse({ password, confirmPassword });
      setErrors({});
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
      return;
    }
    
    setLoading(true);
    
    const { error } = await supabase.auth.updateUser({ password });
    
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      setSuccess(true);
      toast({ title: 'Senha alterada!', description: 'Sua senha foi redefinida com sucesso' });
      // Sign out and redirect to login
      await supabase.auth.signOut();
      setTimeout(() => {
        navigate('/auth');
      }, 2000);
    }
    setLoading(false);
  };

  if (verifying) {
    return (
      <PublicBackground>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Verificando link...</p>
          </div>
        </div>
      </PublicBackground>
    );
  }

  if (success) {
    return (
      <PublicBackground>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">Senha alterada com sucesso!</h3>
                <p className="text-muted-foreground">
                  Você será redirecionado para a página de login...
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </PublicBackground>
    );
  }

  return (
    <PublicBackground>
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="h-12 w-12 bg-primary text-primary-foreground rounded-xl flex items-center justify-center font-black text-2xl shadow-xl border-2 border-primary/20">
                Q
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Redefinir Senha</CardTitle>
            <CardDescription>Digite sua nova senha</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nova Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar Senha</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Digite a senha novamente"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar Nova Senha'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </PublicBackground>
  );
}
