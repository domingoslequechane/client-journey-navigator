"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { format, addMinutes, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PostPreview } from '@/components/social-media/PostPreview';
import { PlatformIcon } from '@/components/social-media/PlatformIcon';
import { AICaptionModal } from '@/components/social-media/AICaptionModal';
import { ConfirmActionModal } from '@/components/social-media/ConfirmActionModal';
import { CalendarModal } from '@/components/social-media/CalendarModal';
import { type SocialPlatform, type ContentType } from '@/lib/social-media-mock';
import { useSocialAccounts } from '@/hooks/useSocialAccounts';
import { useSocialPosts } from '@/hooks/useSocialPosts';
import { useOrganization } from '@/hooks/useOrganization';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { translateSocialError } from '@/lib/social-error-helper';
import {
  Upload, Calendar, Clock, Loader2, X,
  Image as ImageIcon, Zap, Sparkles,
  Plus, Smartphone, MapPin,
  ArrowLeft, FileText, Trash2,
  CircleDashed, Film, Layers, Image,
  LayoutGrid, RefreshCw, Wifi, Signal, Battery,
  Eye, MoreVertical, Save, CalendarDays
} from 'lucide-react';
import { toast } from 'sonner';
import { AnimatedContainer } from '@/components/ui/animated-container';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const getDefaultTime = () => format(addMinutes(new Date(), 15), 'HH:mm');

const PLATFORM_NAMES: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  youtube: 'YouTube'
};

const serializeMetadata = (data: any) => {
  return `BATCH_META:${JSON.stringify(data)}`;
};

const serializeCompactBatch = (items: PostItem[]) => {
  // We strip File objects as they can't be stringified (they are already uploaded anyway)
  const serializableItems = items.map(item => ({
    ...item,
    files: []
  }));
  return `COMPACT_BATCH:${JSON.stringify(serializableItems)}`;
};

const deserializeMetadata = (notes: string | null) => {
  if (!notes) return null;
  if (notes.startsWith('BATCH_META:')) {
    try {
      return JSON.parse(notes.substring(11));
    } catch {
      return null;
    }
  }
  if (notes.startsWith('COMPACT_BATCH:')) {
    try {
      return { isCompact: true, data: JSON.parse(notes.substring(14)) };
    } catch {
      return null;
    }
  }
  return null;
};

interface PostSchedule {
  id: string;
  platforms: SocialPlatform[];
  contentType: ContentType | ContentType[];
  date: string;
  time: string;
}

interface PostItem {
  id: string;
  content: string;
  files: (File | undefined)[];
  mediaUrls: string[];
  location: string;
  selectedAccountIds: string[];
  schedules: Array<{
    id: string;
    platforms: SocialPlatform[];
    contentType: ContentType | ContentType[];
    date: string;
    time: string;
  }>;
  latePostId?: string;
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

const ALL_CONTENT_TYPES: { value: ContentType; label: string; icon: any }[] = [
  { value: 'feed', label: 'Feed', icon: Image },
  { value: 'stories', label: 'Story', icon: CircleDashed },
  { value: 'reels', label: 'Reel', icon: Film },
  { value: 'carousel', label: 'Carrossel', icon: Layers },
];

// Per-platform allowed content types (based on Late API docs)
const PLATFORM_CONTENT_TYPES: Record<string, ContentType[]> = {
  instagram: ['feed', 'stories', 'reels', 'carousel'],
  facebook: ['feed', 'stories', 'reels'],          // FB has no carousel
  linkedin: ['feed', 'carousel'],
  twitter: ['feed'],
  tiktok: ['feed'],                               // video-only, treated as feed
  youtube: ['feed'],                               // video-only
  pinterest: ['feed'],
  googlebusiness: ['feed'],
  bluesky: ['feed'],
  threads: ['feed'],
  reddit: ['feed'],
  telegram: ['feed'],
  snapchat: ['feed', 'stories'],
};

const getAllowedContentTypes = (platforms: string[], files: File[] = []): ContentType[] => {
  const hasVideo = files.some(f => f != null && f.type.startsWith('video/'));
  let baseTypes = ALL_CONTENT_TYPES.map(c => c.value);

  // Rule: Reels only for videos
  if (!hasVideo && files.length > 0) {
    baseTypes = baseTypes.filter(t => t !== 'reels');
  }

  if (platforms.length === 0) return baseTypes;

  // Intersection: only types supported by ALL selected platforms
  const sets = platforms.map(p => new Set(PLATFORM_CONTENT_TYPES[p] || ['feed']));
  return baseTypes.filter(ct => sets.every(s => s.has(ct)));
};

const MediaThumbnail = ({ url, className, isVideo: isVideoProp }: { url: string; className?: string; isVideo?: boolean }) => {
  const isVideo = isVideoProp ?? (url.includes('video') || url.endsWith('.mp4') || url.endsWith('.mov') || url.endsWith('.webm') || (url.startsWith('blob:') && url.includes('video')));

  if (isVideo) {
    return (
      <div className={cn("relative w-full h-full bg-black flex items-center justify-center", className)}>
        <video src={url} className="w-full h-full object-cover" autoPlay loop muted playsInline preload="metadata" />
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <div className="w-0 h-0 border-t-[4px] border-t-transparent border-l-[7px] border-l-white border-b-[4px] border-b-transparent ml-0.5" />
          </div>
        </div>
      </div>
    );
  }

  return <img src={url} className={cn("w-full h-full object-cover", className)} alt="" />;
};

export default function SocialPostEditor() {
  const { postId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const clientId = searchParams.get('clientId');
  const { organizationId } = useOrganization();
  const isMobile = useIsMobile();

  const { createPost, updatePost, publishPost, deletePost, posts } = useSocialPosts(clientId ? { clientId } : undefined);
  const { accounts = [] } = useSocialAccounts(clientId);

  const [postItems, setPostItems] = useState<PostItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [previewPlatform, setPreviewPlatform] = useState<SocialPlatform>('instagram');
  const [showAICaptionModal, setShowAICaptionModal] = useState(false);
  const [showUploadChoice, setShowUploadChoice] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [savingStatus, setSavingStatus] = useState('');
  const [savingTitle, setSavingTitle] = useState('A publicar...');
  const [isEditingCompactDraft, setIsEditingCompactDraft] = useState(false);
  const [resultModal, setResultModal] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null);
  const [timeViolationModal, setTimeViolationModal] = useState(false);
  const [violatingPostIndices, setViolatingPostIndices] = useState<number[]>([]);
  const [isLoadingPost, setIsLoadingPost] = useState(!!postId);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [currentBatchId, setCurrentBatchId] = useState<string | null>(null);
  const [initialStatus, setInitialStatus] = useState<'draft' | 'scheduled' | 'published' | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Refs to prevent the DB load from firing more than once
  const postInitializedRef = useRef(false);
  const postLoadedPlatformsRef = useRef<string[]>([]);
  const initialPostAddedRef = useRef(false);
  const connectedAccounts = (accounts || []).filter(a => a.is_connected);
  const currentPostItem = useMemo(() => postItems[activeIndex] || null, [postItems, activeIndex]);

  // Memoize local posts in SocialPostRow format for the calendar
  const localPostsForCalendar = useMemo(() => {
    const rows: any[] = [];
    postItems.forEach((item, itemIdx) => {
      item.schedules.forEach((schedule, scheduleIdx) => {
        // Show if it has at least a date and time, even if no accounts selected yet
        if (schedule.date && schedule.time) {
          const dateStr = `${schedule.date}T${schedule.time}`;
          const dateObj = new Date(dateStr);

          if (isNaN(dateObj.getTime())) return;

          const scheduledAt = dateObj.toISOString();

          // Determine platforms to show
          let targetPlatforms = Array.from(new Set(
            connectedAccounts
              .filter(a => item.selectedAccountIds.includes(a.id))
              .map(a => a.platform)
          ));

          // If no specific accounts selected, use the platforms defined in the schedule
          if (targetPlatforms.length === 0 && schedule.platforms && schedule.platforms.length > 0) {
            targetPlatforms = schedule.platforms;
          }

          rows.push({
            id: `local_edit_${item.id}_${schedule.id}`,
            content: item.content || `(Lote #${itemIdx + 1}) ${item.files.length > 0 ? 'Post com mídia' : 'Post de texto'}`,
            media_urls: item.mediaUrls,
            platforms: targetPlatforms,
            content_type: Array.isArray(schedule.contentType) ? schedule.contentType[0] : (schedule.contentType || 'feed'),
            scheduled_at: scheduledAt,
            status: 'local_editing',
            organization_id: organizationId || '',
            client_id: clientId,
            client_name: 'Editando agora...',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      });
    });
    return rows;
  }, [postItems, connectedAccounts, organizationId, clientId]);

  const allPostsForCalendar = useMemo(() => {
    // Current post being edited might already exist in 'posts' from DB if it's an edit
    // Filter out the DB version if we have a local version with the same ID
    const dbPostsFiltered = posts.filter(p => !postItems.some(item => item.id === p.id));
    return [...dbPostsFiltered, ...localPostsForCalendar];
  }, [posts, localPostsForCalendar, postItems]);

  // ─── Effect: Load existing post OR initialise blank post ───────────────────
  // IMPORTANT: postItems.length is intentionally NOT in the dependency array for
  // the edit-mode branch.  Adding it caused the DB to re-fetch whenever the user
  // added a new batch page, overwriting their work.
  useEffect(() => {
    if (postId && organizationId) {
      if (postInitializedRef.current) {
        // Post already loaded from DB — only update selectedAccountIds if
        // accounts just became available and none are selected yet.
        if (connectedAccounts.length > 0 && postLoadedPlatformsRef.current.length > 0) {
          setPostItems(prev => {
            const first = prev[0];
            if (!first || first.selectedAccountIds.length > 0) return prev;
            const accountIds = connectedAccounts
              .filter(a => postLoadedPlatformsRef.current.includes(a.platform))
              .map(a => a.id);
            return [{ ...first, selectedAccountIds: accountIds }, ...prev.slice(1)];
          });
        }
        return;
      }

      postInitializedRef.current = true;
      const loadPost = async () => {
        const { data: primaryPost } = await supabase
          .from('social_posts')
          .select('*')
          .eq('id', postId)
          .eq('organization_id', organizationId)
          .single();

        if (primaryPost) {
          setInitialStatus(primaryPost.status as any);
          const meta = deserializeMetadata(primaryPost.notes);
          let allPosts: any[] = [primaryPost];

          if (meta?.isCompact) {
            // New logic: all data is in this single record
            setIsEditingCompactDraft(true);
            const items = (meta.data as any[]).map(d => ({
              ...d,
              // Restore files array structure (empty since uploaded)
              files: new Array(d.mediaUrls?.length || 0).fill(undefined)
            }));
            setPostItems(items);
            setIsLoadingPost(false);
            return;
          }

          if (meta?.batchId) {
            setCurrentBatchId(meta.batchId);
            const { data: siblingPosts } = await supabase
              .from('social_posts')
              .select('*')
              .eq('organization_id', organizationId)
              .filter('notes', 'ilike', `%${meta.batchId}%`)
              .neq('id', primaryPost.id);

            if (siblingPosts) {
              allPosts = [...allPosts, ...siblingPosts].sort((a, b) => {
                const metaA = deserializeMetadata(a.notes);
                const metaB = deserializeMetadata(b.notes);
                return (metaA?.index || 0) - (metaB?.index || 0);
              });
            }
          }

          const items: PostItem[] = allPosts.map(data => {
            const platforms = (data.platforms as string[]) || [];
            const ids = connectedAccounts
              .filter(a => platforms.includes(a.platform))
              .map(a => a.id);

            return {
              id: data.id,
              content: data.content || '',
              files: new Array((data.media_urls as string[])?.length || 0).fill(undefined),
              mediaUrls: (data.media_urls as string[]) || [],
              location: (data as any).location || '',
              latePostId: data.late_post_id || undefined,
              selectedAccountIds: ids,
              schedules: [{
                id: crypto.randomUUID(),
                platforms: (data.platforms as SocialPlatform[]) || [],
                contentType: (data.content_type as ContentType) || 'feed',
                date: data.scheduled_at ? format(new Date(data.scheduled_at), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
                time: data.scheduled_at ? format(new Date(data.scheduled_at), 'HH:mm') : getDefaultTime(),
              }]
            };
          });

          setPostItems(items);
        }
        setIsLoadingPost(false);
      };
      loadPost();
    } else if (!postId) {
      setIsLoadingPost(false);
      // Only add the initial empty post once — avoids duplicates on re-renders
      if (!initialPostAddedRef.current) {
        initialPostAddedRef.current = true;
        handleAddEmptyPost();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId, organizationId, connectedAccounts.length]);
  // ────────────────────────────────────────────────────────────────────────────

  const handleAddEmptyPost = () => {
    const newItem: PostItem = {
      id: `new-${crypto.randomUUID()}`,
      content: '',
      files: [],
      mediaUrls: [],
      location: '',
      selectedAccountIds: [],
      schedules: [{
        id: crypto.randomUUID(),
        platforms: connectedAccounts.map(a => a.platform as SocialPlatform),
        contentType: ['feed'],
        date: format(new Date(), 'yyyy-MM-dd'),
        time: getDefaultTime(),
      }]
    };
    setPostItems(prev => [...prev, newItem]);
    setActiveIndex(postItems.length);
  };

  const handleAddSchedule = (postId: string) => {
    setPostItems(prev => prev.map(p => {
      if (p.id === postId) {
        const lastSchedule = p.schedules[p.schedules.length - 1];
        return {
          ...p,
          schedules: [...p.schedules, {
            id: crypto.randomUUID(),
            platforms: connectedAccounts.map(a => a.platform as SocialPlatform),
            contentType: lastSchedule ? lastSchedule.contentType : ['feed'],
            date: lastSchedule ? lastSchedule.date : format(new Date(), 'yyyy-MM-dd'),
            time: lastSchedule ? lastSchedule.time : getDefaultTime(),
          }]
        };
      }
      return p;
    }));
  };

  const handleRemoveSchedule = (postId: string, scheduleId: string) => {
    setPostItems(prev => prev.map(p => {
      if (p.id === postId && p.schedules.length > 1) {
        return {
          ...p,
          schedules: p.schedules.filter(s => s.id !== scheduleId)
        };
      }
      return p;
    }));
  };

  const updateSchedule = (postId: string, scheduleId: string, updates: Partial<PostSchedule>) => {
    setPostItems(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          schedules: p.schedules.map(s => s.id === scheduleId ? { ...s, ...updates } : s)
        };
      }
      return p;
    }));
  };

  const handleFileSelection = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const selectedFiles = Array.from(files);

    // Validation
    for (const file of selectedFiles) {
      const isVideo = file.type.startsWith('video/');
      const limit = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
      if (file.size > limit) {
        toast.error(`O ficheiro ${file.name} excede o limite de ${isVideo ? '100MB para vídeo' : '5MB para imagem'}.`);
        return;
      }
    }

    if (selectedFiles.length > 1) {
      setPendingFiles(selectedFiles);
      setShowUploadChoice(true);
    } else {
      const file = selectedFiles[0];
      const localUrl = URL.createObjectURL(file);

      if (currentPostItem) {
        updatePostItem(currentPostItem.id, {
          files: [...currentPostItem.files, file],
          mediaUrls: [...currentPostItem.mediaUrls, localUrl],
        });
        // Auto-detect video
        if (file.type.startsWith('video/')) {
          updateSchedule(currentPostItem.id, currentPostItem.schedules[0].id, { contentType: 'reels' as any });
        }
      }
    }
  };

  const handleUploadChoice = (choice: 'carousel' | 'separate') => {
    setShowUploadChoice(false);
    if (choice === 'carousel') {
      const localUrls = pendingFiles.map(f => URL.createObjectURL(f));
      if (currentPostItem) {
        updatePostItem(currentPostItem.id, {
          files: [...currentPostItem.files, ...pendingFiles],
          mediaUrls: [...currentPostItem.mediaUrls, ...localUrls],
        });
        updateSchedule(currentPostItem.id, currentPostItem.schedules[0].id, { contentType: 'carousel' });
      }
    } else {
      const newItems: PostItem[] = pendingFiles.map(file => ({
        id: crypto.randomUUID(),
        content: '',
        files: [file],
        mediaUrls: [URL.createObjectURL(file)],
        location: '',
        selectedAccountIds: currentPostItem?.selectedAccountIds || [],
        schedules: [{
          id: crypto.randomUUID(),
          platforms: [],
          contentType: file.type.startsWith('video/') ? ['video'] : ['feed'],
          date: format(new Date(), 'yyyy-MM-dd'),
          time: getDefaultTime(),
        }]
      }));
      setPostItems(prev => [...prev, ...newItems]);
      setActiveIndex(postItems.length);
    }
    setPendingFiles([]);
  };

  const uploadFilesToLate = async (files: File[], onProgressChange?: (percent: number) => void): Promise<string[]> => {
    if (files.length === 0) return [];

    // Track loaded bytes for each file to calculate total progress
    const loadedBytes = new Array(files.length).fill(0);
    const totalBytes = files.reduce((acc, file) => acc + file.size, 0);

    const updateGlobalProgress = () => {
      if (onProgressChange) {
        const currentLoaded = loadedBytes.reduce((acc, val) => acc + val, 0);
        const percent = Math.round((currentLoaded / totalBytes) * 100);
        onProgressChange(percent);
      }
    };

    const uploadPromises = files.map(async (file, index) => {
      const { data: presignData, error: presignError } = await supabase.functions.invoke('social-media-presign', {
        body: { fileName: file.name, fileType: file.type }
      });
      if (presignError) throw presignError;
      if (presignData.error) throw new Error(presignData.error);
      if (!presignData.uploadUrl) throw new Error("Não foi possível obter URL de upload.");

      return new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', presignData.uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            loadedBytes[index] = event.loaded;
            updateGlobalProgress();
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            loadedBytes[index] = file.size; // Ensure it's marked as complete
            updateGlobalProgress();
            resolve(presignData.publicUrl);
          } else {
            reject(new Error(`Falha no upload do arquivo: ${xhr.statusText}`));
          }
        };

        xhr.onerror = () => reject(new Error('Erro de rede durante o upload.'));
        xhr.send(file);
      });
    });

    return await Promise.all(uploadPromises);
  };

  const PLATFORM_NAMES: Record<string, string> = {
    facebook: 'Facebook', instagram: 'Instagram', linkedin: 'LinkedIn',
    twitter: 'X (Twitter)', tiktok: 'TikTok', youtube: 'YouTube',
    pinterest: 'Pinterest', googlebusiness: 'Google Business', bluesky: 'Bluesky',
    threads: 'Threads', reddit: 'Reddit', telegram: 'Telegram', snapchat: 'Snapchat',
  };

  const handleSaveAction = async (status: 'draft' | 'scheduled' | 'published') => {
    const invalidPosts = postItems.filter(item => item.selectedAccountIds.length === 0);
    if (status !== 'draft' && invalidPosts.length > 0) {
      toast.error('Seleciona pelo menos 1 canal antes de publicar ou agendar.');
      return;
    }

    setIsSaving(true);
    const isUpdating = postId && !postId.startsWith('new-') && postId.length > 20;
    setSavingTitle(isUpdating ? 'A atualizar...' : status === 'published' ? 'A publicar...' : status === 'scheduled' ? 'A agendar...' : 'A guardar...');
    setSavingStatus(isUpdating ? 'A preparar atualização...' : 'A preparar publicação...');
    // Validate: all schedules must be >= 10 min in the future (only for scheduled posts)
    if (status === 'scheduled') {
      const now = new Date();
      const minTime = new Date(now.getTime() + 10 * 60 * 1000);
      const violations: number[] = [];

      postItems.forEach((item, index) => {
        const hasViolation = item.schedules.some(schedule => {
          const scheduledAt = new Date(`${schedule.date}T${schedule.time}`);
          return scheduledAt < minTime;
        });
        if (hasViolation) violations.push(index + 1);
      });

      if (violations.length > 0) {
        setIsSaving(false);
        setSavingStatus('');
        setViolatingPostIndices(violations);
        setTimeViolationModal(true);
        return;
      }
    }
    try {
      const publishTasks: Array<() => Promise<void>> = [];
      const allTargetPlatforms = new Set<string>();
      let totalMediaFiles = 0;
      let batchIdToUse = currentBatchId;
      let originalPostIdWasUpdated = false;

      if (status === 'draft' && !batchIdToUse && postItems.length > 1) {
        batchIdToUse = crypto.randomUUID();
        setCurrentBatchId(batchIdToUse);
      }

      for (let i = 0; i < postItems.length; i++) {
        const item = postItems[i];
        totalMediaFiles += item.files.length;

        // Filter out local blob URLs that haven't been uploaded yet
        let originalRemoteUrls = item.mediaUrls.filter(url => !url.startsWith('blob:'));

        // Upload original files (no story processing) — used for Feed, Reels, etc.
        let originalFilesToUpload = [...item.files].filter((f): f is File => f != null);
        let finalOriginalUrls = [...originalRemoteUrls];

        if (originalFilesToUpload.length > 0) {
          const itemAccounts = connectedAccounts
            .filter(a => item.selectedAccountIds.includes(a.id))
            .map(a => a.account_name || a.username || PLATFORM_NAMES[a.platform] || a.platform)
            .join(', ');
          setSavingStatus(`A enviar mídias para: ${itemAccounts || 'seus canais'}...`);
          setUploadProgress(0);
          const uploadedUrls = await uploadFilesToLate(originalFilesToUpload, (p) => setUploadProgress(p));
          finalOriginalUrls = [...finalOriginalUrls, ...uploadedUrls];
          setUploadProgress(0);
        }

        // Story-processed URLs — computed lazily only when a story schedule is found
        let storyProcessedUrls: string[] | null = null;

        const getStoryUrls = async (): Promise<string[]> => {
          // Return cached result if already processed
          if (storyProcessedUrls !== null) return storyProcessedUrls;

          const storyFilesToProcess = [...item.files].filter((f): f is File => f != null);
          const storyRemoteUrls = item.mediaUrls.filter(url => !url.startsWith('blob:'));

          if (storyFilesToProcess.length > 0) {
            const itemPlatforms = Array.from(new Set(
              connectedAccounts.filter(a => item.selectedAccountIds.includes(a.id)).map(a => PLATFORM_NAMES[a.platform] || a.platform)
            )).join(', ');
            setSavingStatus(`A otimizar mídias para Story no ${itemPlatforms || 'canais'}...`);
            try {
              const processedFiles = await Promise.all(
                storyFilesToProcess.map(async (file) => {
                  if (file != null && file.type.startsWith('image/')) {
                    const url = URL.createObjectURL(file);
                    const resultFile = await __processImageForStoryHelper(url, file);
                    URL.revokeObjectURL(url);
                    return resultFile;
                  }
                  return file;
                })
              );
              setUploadProgress(0);
              const uploadedStoryUrls = await uploadFilesToLate(processedFiles, (p) => setUploadProgress(p));
              setUploadProgress(0);
              storyProcessedUrls = [...storyRemoteUrls, ...uploadedStoryUrls];
            } catch (e) {
              console.error("Auto processing story failed", e);
              storyProcessedUrls = finalOriginalUrls; // fallback to original
            }
          } else {
            // No local files to process — stories use original remote URLs as-is
            storyProcessedUrls = finalOriginalUrls;
          }
          return storyProcessedUrls;
        };

        // Track if we've already used the existing ID for this item's schedules
        let hasUsedOriginalId = false;

        for (const schedule of item.schedules) {
          if (status === 'draft') continue; // We handle drafts compactly below the loops

          if (!schedule.date || !schedule.time) continue;
          const scheduledAt = new Date(`${schedule.date}T${schedule.time}`).toISOString();
          const globalPlatforms = Array.from(new Set(
            connectedAccounts.filter(a => item.selectedAccountIds.includes(a.id)).map(a => a.platform)
          ));
          const targetPlatforms = globalPlatforms.filter(p => (schedule.platforms || []).includes(p));

          if (targetPlatforms.length === 0) continue;
          targetPlatforms.forEach(p => allTargetPlatforms.add(p));

          const contentTypes = Array.isArray(schedule.contentType) ? schedule.contentType : [schedule.contentType];

          for (const type of contentTypes) {
            // Determine which media URLs to use for this specific content type
            // Stories: use story-formatted images (9:16 with blur bg)
            // Feed/Reels/etc: ALWAYS use original unmodified images
            const isStoriesType = type === 'stories';

            const mediaUrlsForType = isStoriesType
              ? await getStoryUrls()
              : finalOriginalUrls;

            // Special handling for Stories with multiple media: split into individual posts
            if (isStoriesType && mediaUrlsForType.length > 1) {
              mediaUrlsForType.forEach((url, urlIdx) => {
                const postData = {
                  content: item.content,
                  media_urls: [url],
                  platforms: targetPlatforms,
                  content_type: type,
                  location: item.location,
                  scheduled_at: scheduledAt,
                  status,
                  client_id: clientId,
                  notes: null
                };
                const capturedPostData = postData;
                const innerHasUsedId = hasUsedOriginalId;

                const isRealDbId = item.id && !item.id.startsWith('new-') && (
                  item.id === postId || posts.some(p => p.id === item.id)
                );

                const shouldTryUpdate = urlIdx === 0 && !innerHasUsedId && isRealDbId;
                if (shouldTryUpdate) {
                  hasUsedOriginalId = true;
                  if (item.id === postId) originalPostIdWasUpdated = true;
                }

                publishTasks.push(async () => {
                  let result;
                  if (shouldTryUpdate) {
                    result = await updatePost.mutateAsync({
                      post: { ...capturedPostData, id: item.id } as any,
                      silent: true
                    });

                    // Fallback: If update returned nothing, it means the ID didn't exist in DB
                    if (!result.data) {
                      console.warn("Update failed (non-existent ID), falling back to create", item.id);
                      result = await createPost.mutateAsync({
                        post: capturedPostData as any,
                        silent: true
                      });
                    }
                  } else {
                    result = await createPost.mutateAsync({
                      post: capturedPostData as any,
                      silent: true
                    });
                  }

                  if (status !== 'draft' && (result as any)?.data?.id) {
                    await publishPost.mutateAsync({
                      postId: (result as any).data.id,
                      publishNow: status === 'published',
                      replaceLatePostId: shouldTryUpdate ? item.latePostId : undefined,
                      silent: true
                    });
                  }
                });
              });
            } else {
              const postData = {
                content: item.content,
                media_urls: mediaUrlsForType,
                platforms: targetPlatforms,
                content_type: type,
                location: item.location,
                scheduled_at: scheduledAt,
                status,
                client_id: clientId,
                notes: null
              };
              const capturedPostData = postData;
              const innerHasUsedId = hasUsedOriginalId;

              const isRealDbId = item.id && !item.id.startsWith('new-') && (
                item.id === postId || posts.some(p => p.id === item.id)
              );

              const shouldTryUpdate = !innerHasUsedId && isRealDbId;
              if (shouldTryUpdate) {
                hasUsedOriginalId = true;
                if (item.id === postId) originalPostIdWasUpdated = true;
              }

              publishTasks.push(async () => {
                let result;
                if (shouldTryUpdate) {
                  result = await updatePost.mutateAsync({
                    post: { ...capturedPostData, id: item.id } as any,
                    silent: true
                  });

                  if (!result.data) {
                    console.warn("Update failed (non-existent ID), falling back to create", item.id);
                    result = await createPost.mutateAsync({
                      post: capturedPostData as any,
                      silent: true
                    });
                  }
                } else {
                  result = await createPost.mutateAsync({
                    post: capturedPostData as any,
                    silent: true
                  });
                }

                if (status !== 'draft' && (result as any)?.data?.id) {
                  await publishPost.mutateAsync({
                    postId: (result as any).data.id,
                    publishNow: status === 'published',
                    replaceLatePostId: shouldTryUpdate ? item.latePostId : undefined,
                    silent: true
                  });
                }
              });
            }
          }
        }
      }

      // Handle the "Compact Draft" save if needed
      if (status === 'draft') {
        setSavingStatus('A guardar rascunho compacto...');

        const itemsToSave = await Promise.all(postItems.map(async (item) => {
          let finalMediaUrls = item.mediaUrls.filter(url => !url.startsWith('blob:'));
          let filesToUpload = [...item.files].filter((f): f is File => f != null);
          if (filesToUpload.length > 0) {
            const uploadedUrls = await uploadFilesToLate(filesToUpload);
            finalMediaUrls = [...finalMediaUrls, ...uploadedUrls];
          }
          return { ...item, mediaUrls: finalMediaUrls, files: [] as any[] };
        }));

        const compactNotes = serializeCompactBatch(itemsToSave as any);
        const draftData = {
          content: itemsToSave[0].content || 'Lote de rascunhos',
          media_urls: itemsToSave[0].mediaUrls || [],
          platforms: itemsToSave[0].selectedAccountIds || [],
          content_type: 'feed',
          scheduled_at: new Date().toISOString(),
          status: 'draft' as const,
          client_id: clientId,
          notes: compactNotes
        };

        if (postId && postId.length > 20 && !postId.startsWith('new-')) {
          await updatePost.mutateAsync({ post: { ...draftData, id: postId } as any });
        } else {
          await createPost.mutateAsync({ post: draftData as any });
        }
      }


      if (publishTasks.length > 0) {
        const targetAccountNames = Array.from(new Set(
          connectedAccounts
            .filter(a => postItems.some(item => item.selectedAccountIds.includes(a.id)))
            .map(a => a.account_name || a.username || PLATFORM_NAMES[a.platform] || a.platform)
        )).join(', ');

        const isUpdating = postItems.some(item => item.id && !item.id.startsWith('new-') && item.id.length > 20);

        if (isUpdating) {
          setSavingStatus(`A sincronizar alterações com: ${targetAccountNames || 'canais'}...`);
        } else if (status === 'published') {
          setSavingStatus(`A publicar agora em: ${targetAccountNames || 'canais'}...`);
        } else if (status === 'scheduled') {
          setSavingStatus(`A agendar para: ${targetAccountNames || 'canais'}...`);
        } else {
          setSavingStatus('A guardar rascunhos...');
        }
        await Promise.all(publishTasks.map(fn => fn()));

        // Cleanup: If we just scheduled/published a COMPACT DRAFT, the original container record 
        // (postId) should be deleted since its contents were individual records now.
        if (status !== 'draft' && postId && isEditingCompactDraft && !originalPostIdWasUpdated) {
          setSavingStatus('A limpar postagem original...');
          console.log("Cleaning up compact draft container:", postId);
          await deletePost.mutateAsync({ id: postId });
        }
      } else if (status !== 'draft') {
        // Validation: If no platforms were selected for any schedule, warn the user
        throw new Error("Nenhum canal selecionado para os horários agendados.");
      }

      const isUpdating = postItems.some(item => item.id && !item.id.startsWith('new-') && item.id.length > 20);

      const successMsg = isUpdating
        ? 'As tuas alterações foram guardadas com sucesso! ✨'
        : status === 'published'
          ? 'A tua publicação já está no ar! 🎉'
          : status === 'scheduled'
            ? 'Publicação agendada com sucesso!'
            : 'Rascunho guardado com sucesso.';

      const successTitle = isUpdating ? 'Atualizado!' : status === 'published' ? 'Publicado!' : status === 'scheduled' ? 'Agendado!' : 'Guardado!';
      setIsSaving(false);
      setSavingStatus('');
      setResultModal({ type: 'success', title: successTitle, message: successMsg });
      setTimeout(() => navigate(-1), 2500);
    } catch (err: any) {
      console.error("Save error:", err);
      setIsSaving(false);
      setSavingStatus('');
      const friendlyMessage = translateSocialError(err);
      setResultModal({ type: 'error', title: 'Ocorreu um erro', message: friendlyMessage });
    }
  };

  const updatePostItem = (id: string, updates: Partial<PostItem>) => {
    setPostItems(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const __processImageForStoryHelper = async (url: string, file: File): Promise<File> => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Canvas context not available");

    // Story Aspect Ratio 9:16 (1080x1920 standard)
    canvas.width = 1080;
    canvas.height = 1920;

    // 1. Draw blurred background
    ctx.filter = 'blur(50px) brightness(0.7)';
    const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
    const bgW = img.width * scale;
    const bgH = img.height * scale;
    const bgX = (canvas.width - bgW) / 2;
    const bgY = (canvas.height - bgH) / 2;
    ctx.drawImage(img, bgX - 100, bgY - 100, bgW + 200, bgH + 200);
    ctx.filter = 'none';

    // 2. Clear Glass Overlay
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, 'rgba(0,0,0,0.4)');
    gradient.addColorStop(0.2, 'rgba(0,0,0,0)');
    gradient.addColorStop(0.8, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 3. Draw main image (Contain fit)
    const mainScale = Math.min(canvas.width / img.width, canvas.height / img.height) * 0.9;
    const mainW = img.width * mainScale;
    const mainH = img.height * mainScale;
    const mainX = (canvas.width - mainW) / 2;
    const mainY = (canvas.height - mainH) / 2;

    // Background card for the main image
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 60;
    ctx.shadowOffsetY = 20;
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(mainX - 5, mainY - 5, mainW + 10, mainH + 10);

    ctx.drawImage(img, mainX, mainY, mainW, mainH);

    const processedBlob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
    if (!processedBlob) throw new Error("Could not generate blob");

    return new File([processedBlob], `story_${file.name || 'image'}.jpg`, { type: 'image/jpeg' });
  };

  const processImageForStory = async (url: string, file: File, itemId: string, idx: number) => {
    try {
      toast.loading('A processar imagem para Story...', { id: 'story-proc' });
      const processedFile = await __processImageForStoryHelper(url, file);
      const processedUrl = URL.createObjectURL(processedFile);

      setPostItems(prev => prev.map(p => {
        if (p.id === itemId) {
          const nextUrls = [...p.mediaUrls];
          const nextFiles = [...p.files];
          nextUrls[idx] = processedUrl;
          nextFiles[idx] = processedFile;
          return { ...p, mediaUrls: nextUrls, files: nextFiles };
        }
        return p;
      }));

      toast.success('Imagem otimizada para Story!', { id: 'story-proc' });
    } catch (error) {
      console.error("Story processing error:", error);
      toast.error('Erro ao ajustar imagem.', { id: 'story-proc' });
    }
  };

  const handleDeletePostItem = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (postItems.length === 1) {
      toast.error('Você deve ter pelo menos uma postagem.');
      return;
    }

    // If id is provided but no confirmation yet, trigger modal
    if (id && !postToDelete) {
      setPostToDelete(id);
      return;
    }

    const targetId = id || postToDelete;
    if (!targetId) return;

    const newItems = postItems.filter(p => p.id !== targetId);
    setPostItems(newItems);

    const currentIndex = postItems.findIndex(p => p.id === targetId);
    if (activeIndex >= newItems.length) {
      setActiveIndex(Math.max(0, newItems.length - 1));
    } else if (activeIndex === currentIndex) {
      // Stay on the same relative index if possible
    }

    setPostToDelete(null);
  };

  const currentPlatforms = useMemo(() => {
    if (!currentPostItem) return [];
    return Array.from(new Set(connectedAccounts
      .filter(a => currentPostItem.selectedAccountIds.includes(a.id))
      .map(a => a.platform as SocialPlatform)));
  }, [currentPostItem, connectedAccounts]);

  const hasAnyChannelSelected = postItems.some(item => item.selectedAccountIds.length > 0);

  if (isLoadingPost) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">

      {/* Full-screen publishing overlay */}
      {isSaving && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="flex flex-col items-center gap-6 rounded-2xl border border-primary/20 bg-card px-10 py-10 shadow-2xl max-w-sm w-full text-center animate-glow overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
            <div className="relative">
              <div className="h-20 w-20 rounded-full border-4 border-primary/10 border-t-primary animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center animate-float">
                <Zap className="h-8 w-8 text-primary shadow-lg" />
              </div>
            </div>
            <div className="space-y-4 w-full relative z-10">
              <div className="space-y-1.5">
                <p className="font-bold text-xl bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                  {savingTitle}
                </p>
                <p className="text-sm text-muted-foreground font-medium">{savingStatus || 'Garantindo que tudo esteja perfeito'}</p>
              </div>

              {uploadProgress > 0 && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-[10px] font-bold text-primary">{uploadProgress}% concluído</p>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground/60">Pode demorar alguns segundos. Por favor aguarde.</p>
          </div>
        </div>
      )}

      {/* Result modal */}
      {resultModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-5 rounded-2xl border border-border bg-card px-10 py-10 shadow-2xl max-w-sm w-full text-center animate-in zoom-in-95 fade-in duration-300">
            {resultModal.type === 'success' ? (
              <div className="relative flex items-center justify-center">
                <div className="h-20 w-20 rounded-full bg-green-500/10 flex items-center justify-center animate-pulse">
                  <div className="h-14 w-14 rounded-full bg-green-500/20 flex items-center justify-center">
                    <svg className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center">
                <div className="h-14 w-14 rounded-full bg-destructive/20 flex items-center justify-center">
                  <svg className="h-8 w-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <p className="font-bold text-xl">{resultModal.title}</p>
              <p className="text-sm text-muted-foreground">{resultModal.message}</p>
            </div>
            {resultModal.type === 'success' ? (
              <p className="text-xs text-muted-foreground/60">A redirecionar em instantes...</p>
            ) : (
              <div className="flex flex-col gap-2 w-full">
                <a
                  href={`https://wa.me/258868499221?text=${encodeURIComponent(`Olá, preciso de ajuda com o Qualify.\n\nErro: ${resultModal.message}\n\nPor favor, podem ajudar-me?`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 w-full rounded-lg bg-[#25D366] text-white text-sm font-semibold px-4 py-2.5 hover:bg-[#20bc5a] transition-colors"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                  Contactar Suporte
                </a>
                <Button variant="outline" size="sm" className="w-full" onClick={() => setResultModal(null)}>Fechar</Button>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Header Fixo */}
      <header className="h-14 lg:h-16 border-b bg-card px-3 lg:px-6 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-2 lg:gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="font-bold text-sm lg:text-lg">{postId ? 'Editar Publicação' : 'Nova Publicação'}</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold hidden sm:block">
              {postItems.length} {postItems.length === 1 ? 'Postagem' : 'Postagens em lote'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 lg:gap-3">
          <Button
            variant="outline"
            size="sm"
            className="hidden sm:flex items-center gap-2 border-primary/20 hover:bg-primary/5 text-primary h-9"
            onClick={() => setIsCalendarOpen(true)}
          >
            <CalendarDays className="h-4 w-4" />
            <span>Ver Calendário</span>
          </Button>
          {/* Desktop buttons */}
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            disabled={isSaving}
            className="text-muted-foreground hover:text-foreground hidden lg:inline-flex"
          >
            Cancelar
          </Button>
          <Button variant="outline" onClick={() => handleSaveAction('draft')} disabled={isSaving} className="hidden lg:inline-flex">
            {postId ? 'Atualizar Rascunho' : 'Guardar Rascunho'}
          </Button>
          <Button variant="secondary" onClick={() => handleSaveAction('scheduled')} disabled={isSaving || !hasAnyChannelSelected} className="gap-2 hidden lg:inline-flex">
            <Calendar className="h-4 w-4" /> {(postId && initialStatus === 'scheduled') ? 'Atualizar Agendamento' : 'Agendar Tudo'}
          </Button>

          {/* Mobile dropdown for secondary actions */}
          {isMobile && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleSaveAction('draft')} disabled={isSaving}>
                  <Save className="h-4 w-4 mr-2" />
                  {postId ? 'Atualizar Rascunho' : 'Guardar Rascunho'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSaveAction('scheduled')} disabled={isSaving || !hasAnyChannelSelected}>
                  <Calendar className="h-4 w-4 mr-2" />
                  {(postId && initialStatus === 'scheduled') ? 'Atualizar Agendamento' : 'Agendar Tudo'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(-1)}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Button onClick={() => handleSaveAction('published')} disabled={isSaving || !hasAnyChannelSelected} className="gap-2 shadow-lg shadow-primary/20 px-4 lg:px-6">
            <Zap className="h-4 w-4" /> <span className="hidden sm:inline">{postId ? 'Atualizar e Publicar' : 'Publicar Agora'}</span><span className="sm:hidden">Publicar</span>
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col lg:flex-row">

        {/* Mobile horizontal page bar */}
        {isMobile && (
          <div className="border-b bg-muted/10 shrink-0 flex items-center gap-2 px-3 py-2 overflow-x-auto no-scrollbar">
            {postItems.map((item, index) => (
              <button
                key={item.id}
                onClick={() => setActiveIndex(index)}
                className={cn(
                  "relative shrink-0 h-12 w-12 rounded-lg border transition-all overflow-hidden",
                  activeIndex === index
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-border"
                )}
              >
                {item.mediaUrls[0] ? (
                  <MediaThumbnail url={item.mediaUrls[0]} isVideo={item.files[0] != null ? item.files[0].type.startsWith('video/') : undefined} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <span className="text-[10px] font-bold text-muted-foreground">#{index + 1}</span>
                  </div>
                )}
                {postItems.length > 1 && (
                  <button
                    onClick={(e) => handleDeletePostItem(item.id, e)}
                    className="absolute -top-0.5 -right-0.5 p-0.5 rounded-full bg-destructive text-white z-10"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                )}
              </button>
            ))}
            <button
              onClick={handleAddEmptyPost}
              className="shrink-0 h-12 w-12 rounded-lg border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:bg-muted/50"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Desktop sidebar */}
        <aside className="w-64 border-r bg-muted/10 flex-col shrink-0 hidden lg:flex">
          <div className="p-4 border-b border-border/50 bg-background flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Páginas</span>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-foreground hover:bg-muted" onClick={handleAddEmptyPost}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <ScrollArea className="flex-1 bg-background">
            <div className="p-2 space-y-2">
              {postItems.map((item, index) => (
                <div
                  key={item.id}
                  onClick={() => setActiveIndex(index)}
                  className={cn(
                    "group relative p-3 rounded-xl border transition-all cursor-pointer overflow-hidden mb-2",
                    activeIndex === index
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-transparent hover:bg-muted/30"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-lg bg-muted flex flex-col items-center justify-center shrink-0 overflow-hidden border">
                      {item.mediaUrls[0] ? (
                        <MediaThumbnail
                          url={item.mediaUrls[0]}
                          isVideo={item.files[0] != null ? item.files[0].type.startsWith('video/') : undefined}
                        />
                      ) : (
                        <FileText className="h-5 w-5 text-muted-foreground/30" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 py-0.5 pr-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold truncate">Post #{index + 1}</p>
                        <span className="text-[9px] uppercase font-bold text-primary/60 bg-primary/5 px-1.5 py-0.5 rounded-md border border-primary/10">
                          {item.schedules[0]?.contentType === 'carousel' ? 'Carrossel' : 'Individual'}
                        </span>
                      </div>
                      <div className="flex gap-1 mt-1">
                        {connectedAccounts.filter(a => item.selectedAccountIds.includes(a.id)).slice(0, 3).map(a => (
                          <PlatformIcon key={a.id} platform={a.platform as SocialPlatform} size="xs" />
                        ))}
                      </div>
                    </div>
                  </div>
                  {postItems.length > 1 && (
                    <button
                      onClick={(e) => handleDeletePostItem(item.id, e)}
                      className="absolute top-1 right-1 p-1 rounded-full bg-destructive/10 text-destructive transition-all hover:bg-destructive hover:text-white shadow-sm z-10"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </aside>

        {/* EDITOR CENTRAL */}
        <div className="flex-1 overflow-hidden flex flex-col bg-background">
          <ScrollArea className="flex-1">
            <div className="p-4 md:p-10 max-w-3xl mx-auto w-full space-y-10">

              {currentPostItem && (
                <AnimatedContainer animation="fade-in" key={currentPostItem.id} className="space-y-10">

                  {/* SEÇÃO 1: CANAIS */}
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 text-primary">
                      <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">1</div>
                      <h3 className="font-bold uppercase tracking-wider text-xs">Canais para este Post</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {connectedAccounts.map(acc => (
                        <div
                          key={acc.id}
                          className={cn(
                            "flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer bg-card",
                            currentPostItem.selectedAccountIds.includes(acc.id) ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                          )}
                          onClick={() => {
                            const ids = currentPostItem.selectedAccountIds.includes(acc.id)
                              ? currentPostItem.selectedAccountIds.filter(id => id !== acc.id)
                              : [...currentPostItem.selectedAccountIds, acc.id];
                            updatePostItem(currentPostItem.id, { selectedAccountIds: ids });
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <PlatformIcon platform={acc.platform as SocialPlatform} size="md" variant="circle" />
                            <div>
                              <p className="font-bold text-sm">{acc.account_name}</p>
                              <p className="text-[10px] text-muted-foreground">@{acc.username}</p>
                            </div>
                          </div>
                          <Checkbox
                            checked={currentPostItem.selectedAccountIds.includes(acc.id)}
                            onCheckedChange={() => { }}
                            className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* SEÇÃO 2: MÍDIA */}
                  <section className="space-y-4">
                    <Separator className="opacity-50 my-6" />
                    <div className="flex items-center gap-2 text-primary">
                      <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">2</div>
                      <h3 className="font-bold uppercase tracking-wider text-xs">Conteúdo Visual</h3>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {currentPostItem.mediaUrls.map((url, i) => {
                        const isStory = currentPostItem.schedules[0]?.contentType === 'stories';
                        const file = currentPostItem.files[i];
                        const isVideo = (file != null) ? file.type.startsWith('video/') : (url.includes('video') || url.endsWith('.mp4') || url.endsWith('.mov') || url.endsWith('.webm'));

                        return (
                          <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-border group shadow-sm bg-muted">
                            <MediaThumbnail url={url} isVideo={isVideo} />

                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                              {isStory && !isVideo && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-3 bg-black/60 text-white hover:bg-black/80 font-inter text-[11px] rounded-full backdrop-blur-md border border-white/20 shadow-md"
                                  onClick={() => processImageForStory(url, currentPostItem.files[i], currentPostItem.id, i)}
                                >
                                  Pré-visualizar Story
                                </Button>
                              )}

                              <button
                                onClick={() => {
                                  const newUrls = currentPostItem.mediaUrls.filter((_, idx) => idx !== i);
                                  const newFiles = currentPostItem.files.filter((_, idx) => idx !== i);
                                  updatePostItem(currentPostItem.id, { mediaUrls: newUrls, files: newFiles });
                                }}
                                className="bg-destructive text-white rounded-full p-1 hover:scale-110 transition-transform"
                                title="Remover"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="aspect-square rounded-xl border-2 border-dashed border-border/50 flex flex-col items-center justify-center gap-2 hover:bg-muted/50 transition-colors text-muted-foreground"
                      >
                        <Upload className="h-6 w-6" />
                        <span className="text-xs font-medium tracking-wide">Upload</span>
                      </button>
                    </div>
                    <input ref={fileInputRef} type="file" multiple className="hidden" onChange={e => handleFileSelection(e.target.files)} />
                  </section>

                  {/* SEÇÃO 3: LEGENDA */}
                  <section className="space-y-4">
                    <Separator className="opacity-50 my-6" />
                    <div className="flex items-center gap-2 text-primary">
                      <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">3</div>
                      <h3 className="font-bold uppercase tracking-wider text-xs">Legenda e Localização</h3>
                    </div>

                    <div className="space-y-5 bg-card p-6 rounded-xl border shadow-sm">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-bold">Legenda</Label>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/60 transition-all h-8 relative overflow-hidden group"
                            onClick={() => setShowAICaptionModal(true)}
                          >
                            <span className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-violet-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <Sparkles className="h-3.5 w-3.5 relative z-10 group-hover:animate-pulse" />
                            <span className="relative z-10 font-semibold text-xs">Gerar com IA</span>
                          </Button>
                        </div>
                        <Textarea
                          value={currentPostItem.content}
                          onChange={e => updatePostItem(currentPostItem.id, { content: e.target.value })}
                          placeholder="O que você quer dizer ao seu público? Ou clique em 'Gerar com IA' para criar automaticamente."
                          className="min-h-[150px] rounded-xl border bg-background text-base resize-none"
                        />
                      </div>

                    </div>
                  </section>

                  {/* SEÇÃO 4: AGENDAMENTOS */}
                  <section className="space-y-4">
                    <Separator className="opacity-50 my-6" />
                    <div className="flex items-center gap-2 text-primary">
                      <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">4</div>
                      <h3 className="font-bold uppercase tracking-wider text-xs">Horários e Formatos</h3>
                    </div>

                    <div className="space-y-4">
                      {currentPostItem.schedules.map((schedule, sIdx) => (
                        <div key={schedule.id} className="bg-card p-5 rounded-xl border shadow-sm relative group/schedule">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            {/* Platform Icons (Clickable Selection) */}
                            <div className="flex flex-1 gap-2 mx-1 md:mx-2">
                              {currentPlatforms.length > 0 ? currentPlatforms.map(p => {
                                let isSelected = false;
                                if (schedule.platforms) {
                                  isSelected = schedule.platforms.includes(p);
                                }

                                return (
                                  <button
                                    key={p}
                                    type="button"
                                    onClick={() => {
                                      let current = schedule.platforms || [];
                                      if (current.includes(p)) {
                                        current = current.filter((x: any) => x !== p);
                                      } else {
                                        current = [...current, p];
                                      }
                                      updateSchedule(currentPostItem.id, schedule.id, { platforms: current });
                                    }}
                                    className={cn(
                                      "p-0.5 rounded-full relative shadow-sm border transition-all cursor-pointer",
                                      isSelected ? "bg-background ring-2 ring-primary scale-110 z-20" : "bg-muted opacity-50 hover:opacity-100 grayscale hover:grayscale-0 z-10"
                                    )}
                                    title={p}
                                  >
                                    <PlatformIcon platform={p} size="sm" />
                                  </button>
                                )
                              }) : (
                                <div className="text-[10px] text-muted-foreground italic mr-2">Canais não selecionados</div>
                              )}
                            </div>

                            {/* Format Multi-Select — filtered per platform */}
                            <div className="flex bg-background/50 rounded-xl p-1 overflow-x-auto min-w-0 max-w-full no-scrollbar flex-[2] border">
                              {(() => {
                                const allowedTypes = getAllowedContentTypes(schedule.platforms || [], currentPostItem.files);
                                return ALL_CONTENT_TYPES.filter(opt => allowedTypes.includes(opt.value)).map(opt => {
                                  const isSel = Array.isArray(schedule.contentType)
                                    ? schedule.contentType.includes(opt.value)
                                    : schedule.contentType === opt.value;
                                  return (
                                    <button
                                      key={opt.value}
                                      type="button"
                                      onClick={() => {
                                        let current = Array.isArray(schedule.contentType) ? [...schedule.contentType] : [schedule.contentType];
                                        if (current.includes(opt.value)) {
                                          current = current.filter((c: any) => c !== opt.value);
                                          if (current.length === 0) current = [opt.value];
                                        } else {
                                          current.push(opt.value);
                                        }
                                        updateSchedule(currentPostItem.id, schedule.id, { contentType: current });
                                      }}
                                      className={cn(
                                        "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                                        isSel ? "bg-background text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                                      )}
                                    >
                                      <opt.icon className="h-3.5 w-3.5" />
                                      <span className="hidden xs:inline">{opt.label}</span>
                                    </button>
                                  );
                                });
                              })()}
                            </div>
                          </div>

                          {/* Date & Time Mini */}
                          <div className="flex items-center gap-2 flex-none ml-auto">
                            <div className="relative w-36 sm:w-40">
                              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                              <Input
                                type="date"
                                value={schedule.date}
                                onChange={e => updateSchedule(currentPostItem.id, schedule.id, { date: e.target.value })}
                                className="h-10 pl-8 pr-2 rounded-lg border-0 bg-transparent text-sm font-medium focus-visible:ring-0 focus-visible:ring-offset-0"
                              />
                            </div>
                            <div className="relative w-28 sm:w-32 bg-background border rounded-lg shadow-sm">
                              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                              <Input
                                type="time"
                                value={schedule.time}
                                onChange={e => updateSchedule(currentPostItem.id, schedule.id, { time: e.target.value })}
                                className="h-10 pl-8 pr-2 rounded-lg border-0 bg-transparent text-sm font-medium focus-visible:ring-0 focus-visible:ring-offset-0"
                              />
                            </div>

                            {currentPostItem.schedules.length > 1 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 text-destructive hover:bg-destructive/10 shrink-0 border border-transparent hover:border-destructive/20 rounded-xl bg-background"
                                onClick={() => handleRemoveSchedule(currentPostItem.id, schedule.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}

                      <Button
                        variant="outline"
                        className="w-full h-12 border-dashed border-2 border-border bg-transparent rounded-xl gap-2 hover:bg-primary/5 hover:border-primary/30 hover:text-primary transition-all text-muted-foreground font-medium"
                        onClick={() => handleAddSchedule(currentPostItem.id)}
                      >
                        <Plus className="h-4 w-4" />
                        Adicionar outro horário
                      </Button>
                    </div>
                  </section>
                </AnimatedContainer>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* PREVIEW LATERAL DIREITO - Desktop only */}
        <aside className="w-[450px] flex-col bg-[#0f172a] border-l border-border/10 overflow-hidden shrink-0 shadow-2xl hidden lg:flex">
          <div className="p-4 border-b border-border/5 bg-background/5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#94a3b8]">Visualização de Post</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground font-bold bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                {currentPlatforms.length} canais
              </span>
            </div>
          </div>

          <div
            ref={scrollRef}
            className="flex-1 overflow-x-auto flex snap-x snap-mandatory scrollbar-hide scroll-smooth"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {currentPlatforms.length > 0 ? (
              currentPlatforms.map((p) => {
                const brandGradients: Record<string, string> = {
                  instagram: "bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-[#f09433] via-[#dc2743] to-[#bc1888]",
                  facebook: "bg-gradient-to-br from-[#1877f2] to-[#0a4da0]",
                  linkedin: "bg-gradient-to-br from-[#0077b5] to-[#004182]",
                  twitter: "bg-gradient-to-br from-[#14171a] via-[#000000] to-[#14171a]",
                  tiktok: "bg-[conic-gradient(at_top_right,_var(--tw-gradient-stops))] from-[#69C9D0] via-[#EE1D52] to-[#000000]",
                  youtube: "bg-gradient-to-br from-[#ff0000] to-[#b91c1c]",
                  googlebusiness: "bg-gradient-to-br from-[#4285f4] via-[#34a853] to-[#fabc05]",
                  threads: "bg-black",
                  pinterest: "bg-gradient-to-br from-[#bd081c] to-[#820612]"
                };

                return (
                  <div key={p} className={cn(
                    "w-full h-full shrink-0 flex items-center justify-center snap-center px-6 relative transition-all duration-700",
                    brandGradients[p] || "bg-slate-900"
                  )}>
                    <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px]" />
                    <div className="relative w-full max-w-[420px] animate-in fade-in zoom-in-95 duration-500 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                      {(() => {
                        const account = connectedAccounts.find(a =>
                          a.platform === p &&
                          currentPostItem?.selectedAccountIds.includes(a.id)
                        );
                        return (
                          <PostPreview
                            content={currentPostItem?.content || ''}
                            mediaUrl={currentPostItem?.mediaUrls[0]}
                            platform={p}
                            contentType={currentPostItem?.schedules[0]?.contentType as ContentType}
                            accountName={account?.account_name}
                            accountUsername={account?.username}
                            accountAvatarUrl={account?.avatar_url || undefined}
                            isVideo={currentPostItem?.files[0] != null ? currentPostItem.files[0].type.startsWith('video/') : undefined}
                          />
                        );
                      })()}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-10 text-center space-y-4">
                <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                </div>
                <p className="text-sm text-muted-foreground font-medium">Selecione canais e configure o post para ver os previews</p>
              </div>
            )}
          </div>
        </aside>

        {/* Mobile floating preview button */}
        {isMobile && (
          <Button
            onClick={() => setShowMobilePreview(true)}
            className="fixed bottom-6 right-6 z-30 rounded-full h-14 w-14 shadow-xl shadow-primary/30 p-0"
          >
            <Eye className="h-6 w-6" />
          </Button>
        )}
      </main>

      {/* Mobile Preview Dialog */}
      <Dialog open={showMobilePreview} onOpenChange={setShowMobilePreview}>
        <DialogContent className="max-w-full w-full h-[90vh] p-0 overflow-hidden [&>button]:hidden">
          <div className="flex flex-col h-full">
            <div className="p-3 border-b flex items-center justify-between shrink-0 bg-card">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Preview</span>
              <Button variant="ghost" size="icon" onClick={() => setShowMobilePreview(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-x-auto flex snap-x snap-mandatory bg-[#0f172a]" style={{ scrollbarWidth: 'none' }}>
              {currentPlatforms.length > 0 ? (
                currentPlatforms.map((p) => {
                  const account = connectedAccounts.find(a =>
                    a.platform === p && currentPostItem?.selectedAccountIds.includes(a.id)
                  );
                  return (
                    <div key={p} className="w-full h-full shrink-0 flex items-center justify-center snap-center p-4">
                      <div className="w-full max-w-sm">
                        <PostPreview
                          content={currentPostItem?.content || ''}
                          mediaUrl={currentPostItem?.mediaUrls[0]}
                          platform={p}
                          contentType={currentPostItem?.schedules[0]?.contentType as ContentType}
                          accountName={account?.account_name}
                          accountUsername={account?.username}
                          accountAvatarUrl={account?.avatar_url || undefined}
                          isVideo={currentPostItem?.files[0] != null ? currentPostItem.files[0].type.startsWith('video/') : undefined}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">Selecione canais para ver os previews</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGOS AUXILIARES */}
      <Dialog open={showUploadChoice} onOpenChange={setShowUploadChoice}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Como deseja postar?</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <Button variant="outline" className="flex-col h-auto py-8 gap-4 rounded-2xl border-2 hover:border-primary/50" onClick={() => handleUploadChoice('carousel')}>
              <Layers className="h-10 w-10 text-primary" />
              <div className="text-center">
                <p className="font-bold">Carrossel</p>
                <p className="text-[10px] text-muted-foreground">Post único com várias mídias</p>
              </div>
            </Button>
            <Button variant="outline" className="flex-col h-auto py-8 gap-4 rounded-2xl border-2 hover:border-primary/50" onClick={() => handleUploadChoice('separate')}>
              <LayoutGrid className="h-10 w-10 text-primary" />
              <div className="text-center">
                <p className="font-bold">Posts Separados</p>
                <p className="text-[10px] text-muted-foreground">Um post para cada mídia</p>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AICaptionModal
        open={showAICaptionModal}
        onOpenChange={setShowAICaptionModal}
        platforms={currentPlatforms}
        contentType={Array.isArray(currentPostItem?.schedules[0]?.contentType) ? currentPostItem?.schedules[0]?.contentType[0] : (currentPostItem?.schedules[0]?.contentType || 'feed')}
        files={currentPostItem?.files.filter((f): f is File => f != null) || []}
        mediaUrls={currentPostItem?.mediaUrls || []}
        clientId={clientId}
        onCaptionGenerated={(c) => currentPostItem && updatePostItem(currentPostItem.id, { content: c })}
      />

      <Dialog open={timeViolationModal} onOpenChange={setTimeViolationModal}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Clock className="h-5 w-5" /> Regra de Agendamento
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Para garantir que as redes sociais processem corretamente a tua publicação, todos os agendamentos devem ser marcados com no mínimo <span className="font-bold text-foreground">10 minutos</span> de antecedência.
            </p>
            {violatingPostIndices.length > 0 && (
              <div className="bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                <p className="text-xs font-bold text-destructive mb-2 uppercase">Posts que precisam de ajuste:</p>
                <div className="flex flex-wrap gap-2">
                  {violatingPostIndices.map(idx => (
                    <span key={idx} className="bg-destructive text-white text-[10px] font-bold px-2 py-1 rounded-md">
                      Post #{idx}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <p className="text-sm font-medium">Por favor, ajusta o horário do teu post.</p>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setTimeViolationModal(false)}>Percebi</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmActionModal
        open={!!postToDelete}
        onOpenChange={(open) => !open && setPostToDelete(null)}
        title="Eliminar Página?"
        description="Tens a certeza que desejas eliminar esta página do teu lote? Esta ação não pode ser desfeita."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="destructive"
        onConfirm={() => postToDelete && handleDeletePostItem(postToDelete)}
      />
      <CalendarModal
        open={isCalendarOpen}
        onOpenChange={setIsCalendarOpen}
        posts={allPostsForCalendar}
        selectedClient={clientId}
        onEditPost={(post) => {
          if (post.status === 'local_editing' && post.id.startsWith('local_edit_')) {
            const parts = post.id.split('_');
            const itemId = parts[2]; // local_edit_{id}_{scheduleId}
            const idx = postItems.findIndex(p => p.id === itemId);
            if (idx !== -1) {
              setActiveIndex(idx);
              setIsCalendarOpen(false);
              return;
            }
          }
          if (post.id === postId) {
            setIsCalendarOpen(false);
            return;
          }
          navigate(`/app/social-media/edit/${post.id}`);
        }}
        onCreatePost={(date) => {
          // If we are already in creation mode, we could just updaate the date
          // For now, let's keep it simple
        }}
      />
    </div>
  );
}
