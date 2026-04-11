import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Mail, Loader2, CheckCircle } from 'lucide-react';
import { PublicBackground } from '@/components/layout/PublicBackground';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [verified, setVerified] = useState(false);
  
  // Get email and credentials from navigation state
  const { email, password, fullName } = location.state || {};

  useEffect(() => {
    // This page requires email and password from signup flow
    if (!email || !password) {
      navigate('/not-found', { replace: true });
    }
  }, [email, password, navigate]);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      toast({ title: 'Erro', description: 'Digite o código completo de 6 dígitos', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://hrarkpjuchrbffnrhzcy.supabase.co/functions/v1/verify-otp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, otp, password, fullName }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        toast({ title: 'Erro', description: data.error || 'Erro ao verificar código', variant: 'destructive' });
        setLoading(false);
        return;
      }

      setVerified(true);
      toast({ title: 'Conta criada!', description: 'Sua conta foi verificada com sucesso' });

      // Sign in the user
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error('Sign in error:', signInError);
        toast({ title: 'Conta criada', description: 'Faça login para continuar' });
        setTimeout(() => navigate('/auth'), 2000);
      } else {
        // Redirect to onboarding to setup agency and start trial
        setTimeout(() => navigate('/app/onboarding'), 1500);
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      toast({ title: 'Erro', description: 'Erro ao verificar código. Tente novamente.', variant: 'destructive' });
    }
    setLoading(false);
  };

  const handleResendOTP = async () => {
    setResending(true);
    try {
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
        toast({ title: 'Erro', description: data.error || 'Erro ao reenviar código', variant: 'destructive' });
      } else {
        toast({ title: 'Código reenviado!', description: 'Verifique sua caixa de entrada' });
        setOtp('');
      }
    } catch (error: any) {
      console.error('Resend error:', error);
      toast({ title: 'Erro', description: 'Erro ao reenviar código', variant: 'destructive' });
    }
    setResending(false);
  };

  if (verified) {
    return (
      <PublicBackground>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold text-xl">Conta verificada!</h3>
                <p className="text-sm text-muted-foreground">
                  Redirecionando para seleção de plano...
                </p>
                <Loader2 className="h-5 w-5 mx-auto animate-spin text-muted-foreground" />
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
        <div className="w-full max-w-md">
          <Link to="/auth" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Voltar ao login
          </Link>

          <Card>
            <CardHeader className="text-center">
              <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold">Verifique seu e-mail</CardTitle>
              <CardDescription>
                Enviamos um código de 6 dígitos para<br />
                <span className="font-medium text-foreground">{email}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={(value) => setOtp(value)}
                  disabled={loading}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button 
                onClick={handleVerify} 
                className="w-full" 
                disabled={loading || otp.length !== 6}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  'Verificar código'
                )}
              </Button>

              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  Não recebeu o código?
                </p>
                <Button 
                  variant="ghost" 
                  onClick={handleResendOTP} 
                  disabled={resending}
                  className="text-primary"
                >
                  {resending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Reenviando...
                    </>
                  ) : (
                    'Reenviar código'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PublicBackground>
  );
}
