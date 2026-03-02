import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PlatformIcon } from '@/components/social-media/PlatformIcon';
import { PLATFORM_CONFIG, CONTENT_TYPE_CONFIG, type ContentType, type SocialPlatform } from '@/lib/social-media-mock';
import { useApprovalPost } from '@/hooks/useSocialPosts';
import { CheckCircle2, XCircle, Loader2, AlertTriangle, Clock, FileText } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function SocialApproval() {
  const { token } = useParams<{ token: string }>();
  const { post, isLoading, error, approvePost, rejectPost, refetch } = useApprovalPost(token);

  const [approverName, setApproverName] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<'approved' | 'rejected' | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h1 className="text-xl font-bold mb-2">Link inválido</h1>
            <p className="text-sm text-muted-foreground">
              Este link de aprovação não é válido ou já expirou.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const alreadyResponded = ['approved', 'rejected'].includes(post.status);

  if (result || alreadyResponded) {
    const isApproved = result === 'approved' || post.status === 'approved';
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            {isApproved ? (
              <>
                <CheckCircle2 className="h-16 w-16 mx-auto text-[hsl(var(--success))] mb-4" />
                <h1 className="text-xl font-bold mb-2">Post Aprovado! ✅</h1>
                <p className="text-sm text-muted-foreground">
                  Obrigado pela aprovação. A equipa será notificada.
                </p>
              </>
            ) : (
              <>
                <XCircle className="h-16 w-16 mx-auto text-destructive mb-4" />
                <h1 className="text-xl font-bold mb-2">Alterações Solicitadas</h1>
                <p className="text-sm text-muted-foreground">
                  A equipa receberá o seu feedback e fará as alterações necessárias.
                </p>
                {post.rejection_reason && (
                  <div className="mt-4 p-3 bg-muted rounded-lg text-sm text-left">
                    <p className="font-medium mb-1">Motivo:</p>
                    <p className="text-muted-foreground">{post.rejection_reason}</p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleApprove = async () => {
    if (!approverName.trim()) return;
    setSubmitting(true);
    try {
      await approvePost(approverName);
      setResult('approved');
      refetch();
    } catch {
      // error handled
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!approverName.trim() || !rejectionReason.trim()) return;
    setSubmitting(true);
    try {
      await rejectPost({ reason: rejectionReason, approverName });
      setResult('rejected');
      refetch();
    } catch {
      // error handled
    } finally {
      setSubmitting(false);
    }
  };

  const mediaUrls = post.media_urls || [];

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <Badge variant="outline" className="mb-2">
            <Clock className="h-3 w-3 mr-1" />
            Aguardando aprovação
          </Badge>
          <h1 className="text-2xl font-bold">Aprovação de Post</h1>
          {post.client_name && (
            <p className="text-sm text-muted-foreground">Cliente: {post.client_name}</p>
          )}
        </div>

        {/* Post preview */}
        <Card>
          <CardContent className="p-6 space-y-4">
            {/* Platforms */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground font-medium">Plataformas:</span>
              {post.platforms.map((p: SocialPlatform) => (
                <Badge key={p} variant="outline" className="gap-1">
                  <PlatformIcon platform={p} size="xs" />
                  {PLATFORM_CONFIG[p]?.label || p}
                </Badge>
              ))}
            </div>

            {/* Content type and schedule */}
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" />
                {CONTENT_TYPE_CONFIG[post.content_type as ContentType]?.label || post.content_type}
              </span>
              {post.scheduled_at && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {format(parseISO(post.scheduled_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                </span>
              )}
            </div>

            <Separator />

            {/* Content */}
            <div className="whitespace-pre-wrap text-sm leading-relaxed">{post.content}</div>

            {/* Hashtags */}
            {post.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {post.hashtags.map((tag: string) => (
                  <span key={tag} className="text-xs text-primary">#{tag}</span>
                ))}
              </div>
            )}

            {/* Media */}
            {mediaUrls.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {mediaUrls.map((url: string, i: number) => (
                  <img key={i} src={url} alt="" className="rounded-lg w-full object-cover max-h-64" />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Approval form */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div>
              <label className="text-sm font-medium">Seu nome</label>
              <Input
                value={approverName}
                onChange={e => setApproverName(e.target.value)}
                placeholder="Digite seu nome..."
                className="mt-1"
              />
            </div>

            {showRejectForm && (
              <div>
                <label className="text-sm font-medium">Motivo das alterações</label>
                <Textarea
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  placeholder="Descreva as alterações necessárias..."
                  className="mt-1 min-h-[100px]"
                />
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={handleApprove}
                disabled={!approverName.trim() || submitting}
                className="flex-1 gap-2 bg-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/90 text-white"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Aprovar
              </Button>
              {showRejectForm ? (
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={!approverName.trim() || !rejectionReason.trim() || submitting}
                  className="flex-1 gap-2"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                  Solicitar Alterações
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setShowRejectForm(true)}
                  className="flex-1 gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  Solicitar Alterações
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
