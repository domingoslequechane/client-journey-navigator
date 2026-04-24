import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/hooks/useOrganization';

export interface BroadcastNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  broadcast_type: string;
  target_role: string;
  target_plan: string;
  target_country: string;
  show_as_modal: boolean;
  is_broadcast: boolean;
  emoji: string | null;
  cta_label: string | null;
  cta_url: string | null;
  created_at: string;
  isRead: boolean;
}

export function useBroadcastNotifications() {
  const { user } = useAuth();
  const { organizationId } = useOrganization();
  const [pendingModalNotification, setPendingModalNotification] = useState<BroadcastNotification | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && organizationId) {
      fetchBroadcasts();
    }
  }, [user, organizationId]);

  const fetchBroadcasts = async () => {
    if (!user || !organizationId) return;

    try {
      // Get user's role and org info
      const { data: membership } = await supabase
        .from('organization_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .single();

      const { data: org } = await supabase
        .from('organizations')
        .select('country, plan_type')
        .eq('id', organizationId)
        .single();

      const userRole = membership?.role || 'user';
      const orgCountry = org?.country || null;
      const orgPlan = org?.plan_type || null;

      // Fetch broadcast notifications
      const { data: broadcasts } = await (supabase as any)
        .from('notifications')
        .select('*')
        .eq('is_broadcast', true)
        .eq('show_as_modal', true)
        .order('created_at', { ascending: false });

      if (!broadcasts) return;

      // Get read status
      const { data: reads } = await supabase
        .from('notification_reads')
        .select('notification_id')
        .eq('user_id', user.id);

      const readIds = new Set(reads?.map(r => r.notification_id) || []);

      // Filter broadcasts relevant to this user
      const relevant = broadcasts.filter((n: any) => {
        if (readIds.has(n.id)) return false;

        // Role filter
        if (n.target_role !== 'all') {
          if (n.target_role === 'owner' && userRole !== 'owner') return false;
          if (n.target_role === 'user' && userRole === 'owner') return false;
        }

        // Country filter
        if (n.target_country && n.target_country !== 'all' && orgCountry) {
          if (n.target_country !== orgCountry) return false;
        }

        // Plan filter
        if (n.target_plan && n.target_plan !== 'all' && orgPlan) {
          if (n.target_plan !== orgPlan) return false;
        }

        return true;
      });

      if (relevant.length > 0) {
        setPendingModalNotification({ ...relevant[0], isRead: false });
      }
    } catch (error) {
      console.error('Error fetching broadcast notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const dismissModal = async (markAsRead = false) => {
    if (!pendingModalNotification || !user) return;
    
    if (markAsRead) {
      try {
        await supabase.from('notification_reads').upsert({
          notification_id: pendingModalNotification.id,
          user_id: user.id,
        });
      } catch (_) {}
    }
    
    setPendingModalNotification(null);
  };

  return { pendingModalNotification, loading, dismissModal };
}
