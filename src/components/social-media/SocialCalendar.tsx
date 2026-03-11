import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameMonth, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, ListTodo, Plus, List, CalendarDays, Filter } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type SocialPlatform, type PostStatus, PLATFORM_CONFIG, STATUS_CONFIG } from '@/lib/social-media-mock';
import { PlatformIcon } from './PlatformIcon';
import type { SocialPostRow } from '@/hooks/useSocialPosts';
import { cn } from '@/lib/utils';

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

interface SocialCalendarProps {
  posts: SocialPostRow[];
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  onCreatePost: (date?: string) => void;
  onEditPost: (post: SocialPostRow) => void;
  selectedClient?: string;
}

export function SocialCalendar({ posts, currentMonth, onMonthChange, onCreatePost, onEditPost }: SocialCalendarProps) {
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');

  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      if (post.status === 'draft') return false; // Exclude drafts from calendar
      if (statusFilter !== 'all' && post.status !== statusFilter) return false;
      if (platformFilter !== 'all' && !post.platforms.includes(platformFilter as SocialPlatform)) return false;
      return true;
    });
  }, [posts, statusFilter, platformFilter]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const postsByDate = useMemo(() => {
    const map: Record<string, SocialPostRow[]> = {};
    filteredPosts.forEach(post => {
      if (!post.scheduled_at) return;
      const key = format(parseISO(post.scheduled_at), 'yyyy-MM-dd');
      if (!map[key]) map[key] = [];
      map[key].push(post);
    });
    return map;
  }, [filteredPosts]);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const openDay = (dateStr: string) => {
    setSelectedDate(dateStr);
    setSheetOpen(true);
  };

  const selectedDayPosts = selectedDate ? (postsByDate[selectedDate] || []) : [];
  const selectedDateLabel = selectedDate
    ? format(parseISO(selectedDate), "EEEE, dd 'de' MMMM", { locale: ptBR })
    : '';

  const monthPosts = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    return filteredPosts
      .filter(p => {
        if (!p.scheduled_at) return false;
        const d = parseISO(p.scheduled_at);
        return d >= monthStart && d <= monthEnd;
      })
      .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime());
  }, [filteredPosts, currentMonth]);

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold capitalize min-w-[160px] text-center">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </span>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onMonthChange(new Date())} className="text-muted-foreground text-xs">Hoje</Button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <Filter className="h-3 w-3 mr-1" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {(Object.keys(STATUS_CONFIG) as PostStatus[]).map(s => (
                <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <SelectValue placeholder="Canais" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os canais</SelectItem>
              {(Object.keys(PLATFORM_CONFIG) as SocialPlatform[]).map(p => (
                <SelectItem key={p} value={p}>{PLATFORM_CONFIG[p].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex border border-border rounded-md">
            <button onClick={() => setView('list')} className={cn("p-1.5 rounded-l-md transition-colors", view === 'list' ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
              <List className="h-4 w-4" />
            </button>
            <button onClick={() => setView('calendar')} className={cn("p-1.5 rounded-r-md transition-colors", view === 'calendar' ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
              <CalendarDays className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {view === 'calendar' ? (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-7 mb-2">
              {WEEK_DAYS.map(day => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px bg-border/50 rounded-lg overflow-hidden">
              {calendarDays.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const dayPosts = postsByDate[dateStr] || [];
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const todayFlag = isToday(day);

                return (
                  <button
                    key={dateStr}
                    onClick={() => openDay(dateStr)}
                    className={cn(
                      "min-h-[90px] p-2 text-left transition-all bg-card hover:bg-accent/30",
                      !isCurrentMonth && "bg-muted/20 opacity-50",
                      todayFlag && "bg-primary/5",
                    )}
                  >
                    <div className={cn("text-xs font-semibold mb-1.5", todayFlag && "text-primary", !isCurrentMonth && "text-muted-foreground")}>
                      {format(day, 'd')}
                      {todayFlag && <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-primary align-middle" />}
                    </div>
                    {dayPosts.length > 0 && (
                      <div className="space-y-1">
                        {dayPosts.slice(0, 3).map(post => (
                          <div key={post.id} className="flex items-center gap-1">
                            {post.platforms.slice(0, 2).map(p => (
                              <PlatformIcon key={p} platform={p} size="xs" />
                            ))}
                            <span className="text-[10px] leading-tight truncate text-muted-foreground flex-1">
                              {post.client_name || post.content.substring(0, 15)}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {post.scheduled_at ? format(parseISO(post.scheduled_at), 'HH:mm') : ''}
                            </span>
                            {post.status === 'published' && <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--success))]" />}
                            {post.status === 'scheduled' && <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--info))]" />}
                            {post.status === 'pending_approval' && <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--warning))]" />}
                          </div>
                        ))}
                        {dayPosts.length > 3 && (
                          <div className="text-[10px] text-primary font-medium">+{dayPosts.length - 3} mais</div>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4">
            {monthPosts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>Nenhum post encontrado neste mês</p>
              </div>
            ) : (
              <div className="space-y-2">
                {monthPosts.map(post => {
                  const statusCfg = STATUS_CONFIG[post.status as PostStatus] || STATUS_CONFIG.draft;
                  return (
                    <button key={post.id} onClick={() => onEditPost(post)} className="w-full text-left">
                      <div className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/30 transition-colors">
                        <div className="flex gap-0.5 shrink-0">
                          {post.platforms.slice(0, 3).map(p => (
                            <PlatformIcon key={p} platform={p} size="xs" variant="circle" />
                          ))}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{post.content}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {post.client_name} · {post.scheduled_at ? format(parseISO(post.scheduled_at), "dd/MM · HH:mm") : 'Sem data'}
                          </p>
                        </div>
                        <Badge variant={statusCfg.variant} className="text-[10px] shrink-0">{statusCfg.label}</Badge>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="capitalize">{selectedDateLabel}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <Button
              size="sm"
              className="w-full gap-2"
              onClick={() => { setSheetOpen(false); onCreatePost(selectedDate || undefined); }}
              disabled={selectedDate ? new Date(selectedDate + 'T23:59:59') < new Date(new Date().toDateString()) : false}
            >
              <Plus className="h-4 w-4" /> Novo post neste dia
            </Button>
            {selectedDayPosts.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <ListTodo className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">Nenhum post para este dia</p>
              </div>
            ) : (
              selectedDayPosts.map(post => {
                const statusCfg = STATUS_CONFIG[post.status as PostStatus] || STATUS_CONFIG.draft;
                return (
                  <button key={post.id} onClick={() => { setSheetOpen(false); onEditPost(post); }} className="w-full text-left">
                    <Card className="hover:border-primary/50 transition-colors">
                      <CardContent className="p-3 space-y-2">
                        <p className="text-sm line-clamp-2">{post.content}</p>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {post.platforms.map(p => (
                            <PlatformIcon key={p} platform={p} size="xs" variant="circle" />
                          ))}
                          <Badge variant={statusCfg.variant} className="text-[10px]">{statusCfg.label}</Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {post.scheduled_at ? format(parseISO(post.scheduled_at), 'HH:mm') : ''} · {post.client_name}
                        </p>
                      </CardContent>
                    </Card>
                  </button>
                );
              })
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
