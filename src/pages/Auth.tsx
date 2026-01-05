import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { z } from 'zod';
import { ArrowLeft, Mail, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { PublicBackground } from '@/components/layout/PublicBackground';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { LanguageSelector } from '@/components/ui/language-selector';


const createAuthSchema = (t: (key: string) => string) => z.object({
  email: z.string().email({ message: t('validation.invalidEmail') }),
  password: z.string().min(6, { message: t('validation.minPassword') }),
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const authSchema = createAuthSchema(t);

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
        toast({ title: t('toast.error'), description: t('toast.invalidCredentials'), variant: 'destructive' });
      } else {
        toast({ title: t('toast.error'), description: error.message, variant: 'destructive' });
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

      toast({ title: t('toast.welcome'), description: t('toast.loginSuccess') });
      
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
          title: t('toast.error'), 
          description: data.error || t('toast.verificationError'), 
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
        title: t('toast.codeSent'),
        description: t('toast.checkEmail'),
      });
    } catch (error: any) {
      console.error('Signup error:', error);
      toast({ 
        title: t('toast.error'), 
        description: t('toast.signupError'), 
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
      toast({ title: t('toast.error'), description: error.message, variant: 'destructive' });
    } else {
      setResetEmailSent(true);
      toast({ title: t('toast.emailSent'), description: t('toast.checkInbox') });
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
                <DialogTitle>{t('suspended.title')}</DialogTitle>
                <DialogDescription>
                  {t('suspended.description')}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button onClick={() => setSuspendedDialogOpen(false)} className="w-full">
                  {t('suspended.understood')}
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
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
          <LanguageSelector />
          <ThemeToggle />
        </div>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold">{t('forgotPassword.title')}</CardTitle>
              <CardDescription>{t('forgotPassword.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              {resetEmailSent ? (
                <div className="text-center space-y-4">
                  <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                    <Mail className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-semibold">{t('forgotPassword.emailSentTitle')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('forgotPassword.emailSentDescription')}
                  </p>
                  <Button variant="outline" onClick={() => { setShowForgotPassword(false); setResetEmailSent(false); }} className="w-full">
                    {t('forgotPassword.backToLogin')}
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">{t('labels.email')}</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder={t('placeholders.email')}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                    {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? t('buttons.sending') : t('forgotPassword.sendLink')}
                  </Button>
                  <Button variant="ghost" onClick={() => setShowForgotPassword(false)} className="w-full gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    {t('forgotPassword.backToLogin')}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </PublicBackground>
    );
  }

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Google login redirects to select-plan for new users
        // Existing users with org will be redirected by ProtectedRoute
        redirectTo: `${window.location.origin}/select-plan`,
      },
    });
    
    if (error) {
      toast({ title: t('toast.error'), description: error.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  return (
    <PublicBackground>
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
        <LanguageSelector />
        <ThemeToggle />
      </div>
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Back to Landing */}
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
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">{t('labels.email')}</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder={t('placeholders.email')}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                    {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="signin-password">{t('labels.password')}</Label>
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-xs text-primary hover:underline"
                      >
                        {t('forgotPassword.link')}
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        id="signin-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? t('buttons.loggingIn') : t('buttons.login')}
                  </Button>

                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">{t('orContinueWith')}</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full gap-2"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    {t('buttons.continueWithGoogle')}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">{t('labels.fullName')}</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder={t('placeholders.name')}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                    {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">{t('labels.email')}</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder={t('placeholders.email')}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                    {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">{t('labels.password')}</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder={t('placeholders.minChars')}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm-password">{t('labels.confirmPassword')}</Label>
                    <div className="relative">
                      <Input
                        id="signup-confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder={t('placeholders.confirmPassword')}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? t('buttons.creatingAccount') : t('buttons.createAccount')}
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