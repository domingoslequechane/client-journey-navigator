import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BroadcastNotification } from '@/hooks/useBroadcastNotifications';
import { Link } from 'react-router-dom';
import { ExternalLink, X, Megaphone, Star, Zap, Bell, Gift, AlertTriangle, ArrowRight } from 'lucide-react';

interface BroadcastModalProps {
  notification: BroadcastNotification | null;
  onDismiss: (markAsRead?: boolean) => void;
}

const BROADCAST_CONFIG: Record<string, {
  gradient: string;
  icon: React.ReactNode;
  badgeLabel: string;
  badgeBg: string;
}> = {
  celebration: {
    gradient: 'from-amber-400 via-orange-500 to-orange-600',
    icon: <Star className="h-8 w-8 text-white" />,
    badgeLabel: '🎉 Celebração',
    badgeBg: 'bg-amber-500/20 text-amber-200 border-amber-400/30',
  },
  new_feature: {
    gradient: 'from-violet-500 via-purple-600 to-indigo-700',
    icon: <Zap className="h-8 w-8 text-white" />,
    badgeLabel: '✨ Nova Funcionalidade',
    badgeBg: 'bg-violet-500/20 text-violet-200 border-violet-400/30',
  },
  call_to_action: {
    gradient: 'from-orange-500 via-primary to-orange-600',
    icon: <Megaphone className="h-8 w-8 text-white" />,
    badgeLabel: '📣 Pedido de Ajuda',
    badgeBg: 'bg-orange-500/20 text-orange-200 border-orange-400/30',
  },
  alert: {
    gradient: 'from-red-500 via-rose-600 to-red-700',
    icon: <AlertTriangle className="h-8 w-8 text-white" />,
    badgeLabel: '⚠️ Aviso Importante',
    badgeBg: 'bg-red-500/20 text-red-200 border-red-400/30',
  },
  update: {
    gradient: 'from-sky-500 via-blue-600 to-blue-700',
    icon: <Bell className="h-8 w-8 text-white" />,
    badgeLabel: '🔔 Actualização',
    badgeBg: 'bg-sky-500/20 text-sky-200 border-sky-400/30',
  },
  general: {
    gradient: 'from-orange-500 via-primary to-orange-600',
    icon: <Gift className="h-8 w-8 text-white" />,
    badgeLabel: '📨 Comunicado',
    badgeBg: 'bg-orange-500/20 text-orange-200 border-orange-400/30',
  },
};

export function BroadcastModal({ notification, onDismiss }: BroadcastModalProps) {
  if (!notification) return null;

  const config = BROADCAST_CONFIG[notification.broadcast_type] || BROADCAST_CONFIG.general;

  return (
    <Dialog open={!!notification} onOpenChange={(open) => !open && onDismiss(false)}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 bg-[#1c1c1e] text-white gap-0">
        {/* Header gradient */}
        <div className={`bg-gradient-to-br ${config.gradient} p-8 text-center relative overflow-hidden`}>
          {/* Decorative blurs */}
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-36 h-36 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-28 h-28 rounded-full bg-black/15 blur-2xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={() => onDismiss(false)}
            className="absolute top-4 right-4 z-10 text-white/70 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="relative z-10 flex flex-col items-center">
            {/* Icon */}
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4 shadow-lg border border-white/20">
              {notification.emoji
                ? <span className="text-3xl leading-none">{notification.emoji}</span>
                : config.icon
              }
            </div>

            {/* Badge */}
            <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${config.badgeBg} mb-3`}>
              {config.badgeLabel}
            </span>

            {/* Title */}
            <h2 className="text-2xl font-black text-white leading-snug mb-2">
              {notification.title}
            </h2>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Message */}
          <p className="text-sm text-zinc-300 leading-relaxed text-center whitespace-pre-line">
            {notification.message}
          </p>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            {notification.cta_url && notification.cta_label && (
              notification.cta_url.startsWith('/') ? (
                <Link to={notification.cta_url} onClick={() => onDismiss(true)} className="w-full">
                  <Button className={`w-full bg-gradient-to-r ${config.gradient} hover:opacity-90 text-white border-0 py-6 text-base font-semibold shadow-lg gap-2`}>
                    {notification.cta_label}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <a href={notification.cta_url} target="_blank" rel="noopener noreferrer" onClick={() => onDismiss(true)} className="w-full">
                  <Button className={`w-full bg-gradient-to-r ${config.gradient} hover:opacity-90 text-white border-0 py-6 text-base font-semibold shadow-lg gap-2`}>
                    {notification.cta_label}
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </a>
              )
            )}
            <Button
              variant="ghost"
              className="text-zinc-400 hover:text-white hover:bg-white/5 h-12"
              onClick={() => onDismiss(!notification.cta_url)}
            >
              {notification.cta_url ? 'Talvez depois' : 'Entendido, obrigado!'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
