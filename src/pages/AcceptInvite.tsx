import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle, XCircle, Building2, UserCheck, LogIn, UserPlus, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { PublicBackground } from '@/components/layout/PublicBackground';

interface InviteData {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  expires_at: string;
  organization_id: string;
  organizations: {
    name: string;
  };
  privileges?: string[] | null;
}

export default function AcceptInvite() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [accountExists, setAccountExists] = useState<boolean | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [signingUp, setSigningUp] = useState(false);

  useEffect(() => {
    checkAuthAndFetchInvite();
  }, [token]);

  const checkAuthAndFetchInvite = async () => {
    if (!token) {
      setError('Token de convite não fornecido');
      setLoading(false);
      return;
    }

    try {
      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
      setUserEmail(user?.email || null);

      // Fetch invite details (public query - RLS allows viewing invites for own email)
      const { data: inviteData, error: inviteError } = await supabase
        .from('organization_invites')
        .select('*, organizations(name)')
        .eq('invite_token', token)
        .single();

      if (inviteError || !inviteData) {
        console.error('Error fetching invite:', inviteError);
        setError('Convite não encontrado ou inválido');
        setLoading(false);
        return;
      }

      // Check if expired
      if (new Date(inviteData.expires_at) < new Date()) {
        setError('Este convite expirou. Solicite um novo convite ao administrador.');
        setLoading(false);
        return;
      }

      // Check if already processed
      if (inviteData.status !== 'pending') {
        if (inviteData.status === 'accepted') {
          setError('Este convite já foi aceito. Faça login para acessar a organização.');
        } else if (inviteData.status === 'cancelled') {
          setError('Este convite foi cancelado pelo administrador.');
        } else {
          setError('Este convite não está mais disponível.');
        }
        setLoading(false);
        return;
      }

      // Check securely if the user already has an account
      const { data: emailExists } = await supabase.rpc('check_invite_email_exists', { token });
      setAccountExists(!!emailExists);

      setInvite(inviteData as InviteData);
    } catch (err) {
      console.error('Error checking invite:', err);
      setError('Erro ao verificar convite');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvite = async () => {
    if (!token || !invite) return;

    setAccepting(true);
    try {
      const { data, error } = await supabase.functions.invoke('accept-invite', {
        body: { inviteToken: token }
      });

      if (error) {
        throw new Error(error.message || 'Erro ao aceitar convite');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setSuccess(true);
      toast({
        title: 'Convite aceito!',
        description: `Você agora faz parte de ${invite.organizations?.name || 'a organização'}`,
      });

      // Redirect after a short delay - go directly to app (accept-invite already set current_organization_id)
      setTimeout(() => {
        navigate('/app');
      }, 2000);

    } catch (err) {
      console.error('Error accepting invite:', err);
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Não foi possível aceitar o convite',
        variant: 'destructive',
      });
    } finally {
      setAccepting(false);
    }
  };

  const handleLogin = () => {
    // Store the current URL to redirect back after login
    sessionStorage.setItem('redirectAfterAuth', window.location.href);
    navigate('/auth?mode=login');
  };

  const handleInPlaceSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invite?.email || !token) return;

    if (password !== confirmPassword) {
      toast({
        title: 'Senhas não conferem',
        description: 'As senhas digitadas não são iguais. Tente novamente.',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: 'Senha muito curta',
        description: 'A senha deve ter pelo menos 6 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    setSigningUp(true);
    try {
      // Use Edge Function to create and auto-confirm user to bypass the email verification requirement
      const { data: invokeData, error: invokeError } = await supabase.functions.invoke('signup-invited-user', {
        body: { inviteToken: token, password }
      });

      if (invokeError) {
        throw new Error(invokeError.message || 'Erro ao criar a conta através do convite.');
      }

      if (invokeData?.error) {
        throw new Error(invokeData.error);
      }

      // At this point, the account is created, confirmed, and the invite is accepted
      // Log the user in automatically
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: invokeData.email,
        password: password,
      });

      if (signInError) {
        throw new Error('A conta foi criada, mas houve um erro ao fazer login automaticamente. Por favor, faça login manualmente.');
      }

      setSuccess(true);
      toast({
        title: 'Bem-vindo!',
        description: 'Conta criada e convite aceito com sucesso.',
      });

      setTimeout(() => {
        navigate('/app');
      }, 2000);

    } catch (err: any) {
      console.error('Signup/Accept error:', err);
      toast({
        title: 'Erro',
        description: err.message || 'Não foi possível completar o cadastro.',
        variant: 'destructive',
      });
    } finally {
      setSigningUp(false);
    }
  };

  if (loading) {
    return (
      <PublicBackground>
        <div className="flex items-center justify-center min-h-screen">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </CardContent>
          </Card>
        </div>
      </PublicBackground>
    );
  }

  if (error) {
    return (
      <PublicBackground>
        <div className="flex items-center justify-center min-h-screen p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle>Convite Inválido</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button onClick={() => navigate('/auth')}>
                Ir para Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </PublicBackground>
    );
  }

  if (success) {
    return (
      <PublicBackground>
        <div className="flex items-center justify-center min-h-screen p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle>Convite Aceito!</CardTitle>
              <CardDescription>
                Você agora faz parte de {invite?.organizations?.name}. Redirecionando...
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </CardContent>
          </Card>
        </div>
      </PublicBackground>
    );
  }

  const emailMismatch = isLoggedIn && userEmail && invite && userEmail.toLowerCase() !== invite.email.toLowerCase();

  return (
    <PublicBackground>
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>Convite para Equipe</CardTitle>
            <CardDescription>
              Você foi convidado para fazer parte de uma organização
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Organization Info */}
            <div className="bg-muted/50 rounded-lg p-4 text-center space-y-2">
              <p className="text-sm text-muted-foreground">Organização</p>
              <p className="text-xl font-semibold">{invite?.organizations?.name}</p>
            </div>

            {/* Invite Details */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Convidado como:</span>
                <span className="font-medium">{invite?.full_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">E-mail:</span>
                <span className="font-medium">{invite?.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Privilégio Principal:</span>
                <Badge variant="secondary" className={invite?.privileges?.includes('admin') ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-800'}>
                  {invite?.privileges?.includes('admin') ? 'Administrador' : 'Usuário Simples'}
                </Badge>
              </div>
            </div>

            {/* Email mismatch warning */}
            {emailMismatch && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800">E-mail diferente</p>
                  <p className="text-amber-700">
                    Este convite é para <strong>{invite?.email}</strong>, mas você está logado como <strong>{userEmail}</strong>.
                  </p>
                  <p className="text-amber-700 mt-1">
                    Faça logout e entre com o e-mail correto para aceitar o convite.
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {isLoggedIn ? (
              emailMismatch ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => supabase.auth.signOut().then(() => window.location.reload())}
                >
                  Fazer Logout
                </Button>
              ) : (
                <Button
                  className="w-full gap-2"
                  onClick={handleAcceptInvite}
                  disabled={accepting}
                >
                  {accepting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Aceitando...
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-4 w-4" />
                      Aceitar Convite
                    </>
                  )}
                </Button>
              )
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-center text-muted-foreground">
                  {accountExists
                    ? 'Faça login com sua conta existente para aceitar o convite.'
                    : 'Crie uma conta para aceitar o convite.'}
                </p>
                <div className="flex flex-col gap-3">
                  {accountExists ? (
                    <Button onClick={handleLogin} className="w-full gap-2">
                      <LogIn className="h-4 w-4" />
                      Entrar
                    </Button>
                  ) : (
                    <form onSubmit={handleInPlaceSignUp} className="space-y-4 text-left mt-4 w-full">
                      <div className="space-y-2">
                        <Label htmlFor="password">Crie uma senha</Label>
                        <Input
                          id="password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Mínimo de 6 caracteres"
                          required
                          minLength={6}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirme a senha</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Repita a senha"
                          required
                          minLength={6}
                        />
                      </div>
                      <Button type="submit" className="w-full gap-2" disabled={signingUp}>
                        {signingUp ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Criando conta...
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4" />
                            Criar Conta e Aceitar
                          </>
                        )}
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PublicBackground>
  );
}
