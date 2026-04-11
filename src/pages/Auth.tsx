import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { z } from 'zod';
import { ArrowLeft } from 'lucide-react';
import { PublicBackground } from '@/components/layout/PublicBackground';
import { ThemeToggle } from '@/components/theme/ThemeToggle';


// Modular Components
import { LoginForm } from '@/components/auth/LoginForm';
import { SignupForm } from '@/components/auth/SignupForm';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { SocialAuth } from '@/components/auth/SocialAuth';
import { SuspendedDialog } from '@/components/auth/SuspendedDialog';
import { AnimatedContainer } from '@/components/ui/animated-container';

const createAuthSchema = (t: (key: string) => string) => z.object({
  email: z.string().email({ message: t('validation.invalidEmail') }),
  password: z.string().min(1, { message: t('validation.required') }), // Relaxed for login
  confirmPassword: z.string().optional(),
  fullName: z.string().min(2, { message: t('validation.minName') }).optional(),
}).refine((data) => {
  if (data.fullName && data.confirmPassword) {
    return data.password === data.confirmPassword;
  }
  return true;
}, {
  message: t('validation.passwordMismatch'),
  path: ['confirmPassword'],
});

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useAuth();
  const { t } = useTranslation('auth');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirmPassword?: string; fullName?: string }>({});
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [suspendedDialogOpen, setSuspendedDialogOpen] = useState(false);
  const [persistSession, setPersistSession] = useState(true);
  
  const authSchema = createAuthSchema(t);

  useEffect(() => {
    const checkSessionAndRedirect = async () => {
      if (session) {
        const { data: adminRole } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .eq('role', 'proprietor')
          .maybeSingle();

        if (adminRole) {
          navigate('/admin');
        } else {
          const from = (location.state as any)?.from?.pathname || '/app';
          navigate(from);
        }
      }
    };
    
    checkSessionAndRedirect();
  }, [session, navigate, location.state]);

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
      
      // For signup, we still want min 6 chars
      if (isSignUp && password.length < 8) {
        setErrors({ password: t('validation.minPassword') });
        return false;
      }

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
    try {
      // Storage is configured at client initialization

      // Normalize email
      const cleanEmail = email.trim().toLowerCase();
      
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email: cleanEmail, 
        password 
      });
      
      if (error) {
        console.error('Login error details:', error);
        
        let errorMessage = error.message;
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = t('messages.invalidCredentials');
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = t('messages.emailNotVerified');
        }
        
        toast({ title: 'Erro no login', description: errorMessage, variant: 'destructive' });
        setLoading(false);
        return;
      }

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

        const { data: adminRole } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user.id)
          .eq('role', 'proprietor')
          .maybeSingle();

        await supabase.from('login_history').insert({
          user_id: data.user.id,
          provider: 'email',
          user_agent: navigator.userAgent,
        });

        toast({ title: t('messages.welcomeBack'), description: t('messages.loginSuccess') });
        
        if (adminRole) {
          navigate('/admin');
        } else {
          const from = (location.state as any)?.from?.pathname || '/app';
          navigate(from);
        }
      }
    } catch (err: any) {
      console.error('Unexpected login error:', err);
      toast({ title: 'Erro inesperado', description: 'Ocorreu uma falha ao tentar entrar. Tente novamente.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm(true)) return;
    
    setLoading(true);
    
    try {
      const response = await fetch(
        `https://hrarkpjuchrbffnrhzcy.supabase.co/functions/v1/send-otp`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, fullName }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        toast({ 
          title: 'Erro', 
          description: data.error || t('messages.errorSendingCode'), 
          variant: 'destructive' 
        });
        setLoading(false);
        return;
      }

      navigate('/verify-email', { 
        state: { email, password, fullName } 
      });
      
      toast({
        title: t('verifyEmail.codeSent'),
        description: t('verifyEmail.codeSentDescription'),
      });
    } catch (error: any) {
      console.error('Signup error:', error);
      toast({ 
        title: 'Erro', 
        description: t('messages.errorProcessingSignup'), 
        variant: 'destructive' 
      });
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrors({ email: t('validation.enterEmail') });
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
      toast({ title: t('messages.emailSent'), description: t('messages.checkInbox') });
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/app`,
      },
    });
    
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  if (showForgotPassword) {
    return (
      <PublicBackground>
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
          <ThemeToggle />
        </div>
        <div className="min-h-screen flex items-center justify-center p-4">
          <ForgotPasswordForm
            onSubmit={handleForgotPassword}
            email={email}
            setEmail={setEmail}
            loading={loading}
            resetEmailSent={resetEmailSent}
            onBack={() => { setShowForgotPassword(false); setResetEmailSent(false); }}
            errors={errors}
          />
        </div>
      </PublicBackground>
    );
  }

  return (
    <PublicBackground>
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
        <ThemeToggle />
      </div>
      <div className="min-h-screen flex items-center justify-center p-4">
        <AnimatedContainer className="w-full max-w-md">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            {t('backToSite')}
          </Link>
          
          <Card>
            <CardHeader className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-xl">Q</span>
                </div>
              </div>
              <CardTitle className="text-2xl font-bold">Qualify</CardTitle>
              <CardDescription>{t('subtitle')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="signin" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">{t('tabs.login')}</TabsTrigger>
                  <TabsTrigger value="signup">{t('tabs.register')}</TabsTrigger>
                </TabsList>
                
                <TabsContent value="signin">
                  <LoginForm
                    onSubmit={handleSignIn}
                    email={email}
                    setEmail={setEmail}
                    password={password}
                    setPassword={setPassword}
                    loading={loading}
                    errors={errors}
                    onForgotPassword={() => setShowForgotPassword(true)}
                    persistSession={persistSession}
                    setPersistSession={setPersistSession}
                  />
                  <SocialAuth onGoogleLogin={handleGoogleLogin} loading={loading} />
                </TabsContent>
                
                <TabsContent value="signup">
                  <SignupForm
                    onSubmit={handleSignUp}
                    fullName={fullName}
                    setFullName={setFullName}
                    email={email}
                    setEmail={setEmail}
                    password={password}
                    setPassword={setPassword}
                    confirmPassword={confirmPassword}
                    setConfirmPassword={setConfirmPassword}
                    loading={loading}
                    errors={errors}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </AnimatedContainer>
      </div>
      <SuspendedDialog open={suspendedDialogOpen} onOpenChange={setSuspendedDialogOpen} />
    </PublicBackground>
  );
}