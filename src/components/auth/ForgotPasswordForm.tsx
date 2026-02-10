import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Mail, ArrowLeft } from 'lucide-react';

interface ForgotPasswordFormProps {
  onSubmit: (e: React.FormEvent) => Promise<void>;
  email: string;
  setEmail: (value: string) => void;
  loading: boolean;
  resetEmailSent: boolean;
  onBack: () => void;
  errors: { email?: string };
}

export function ForgotPasswordForm({
  onSubmit,
  email,
  setEmail,
  loading,
  resetEmailSent,
  onBack,
  errors,
}: ForgotPasswordFormProps) {
  const { t } = useTranslation('auth');

  return (
    <div className="w-full max-w-md">
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
            <Button variant="outline" onClick={onBack} className="w-full">
              {t('forgotPassword.backToLogin')}
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
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
            <Button variant="ghost" onClick={onBack} className="w-full gap-2">
              <ArrowLeft className="h-4 w-4" />
              {t('forgotPassword.backToLogin')}
            </Button>
          </form>
        )}
      </CardContent>
    </div>
  );
}