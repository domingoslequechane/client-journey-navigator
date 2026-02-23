import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameMonth, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, ListTodo, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { type SocialPost, PLATFORM_CONFIG, STATUS_CONFIG } from '@/lib/social-media-mock';
import { cn } from '@/lib/utils';

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

interface SocialCalendarProps {
  posts: SocialPost[];
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  onCreatePost: (date?: string) => void;
  onEditPost: (post: SocialPost) => void;
}

export function SocialCalendar({ posts, currentMonth, onMonthChange, onCreatePost, onEditPost }: SocialCalendarProps) {
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const postsByDate = useMemo(() => {
    const map: Record<string, SocialPost[]> = {};
    posts.forEach(post => {
      const key = format(parseISO(post.scheduledAt), 'yyyy-MM-dd');
      if (!map[key]) map[key] = [];
      map[key].push(post);
    });
    return map;
  }, [posts]);

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

  return (
    <>
      {/* Month navigation */}
      <div className="flex items-center gap-2 mb-4">
        <Button variant="outline" size="icon" onClick={() => onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-semibold capitalize min-w-[160px] text-center">
          {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
        </span>
        <Button variant="outline" size="icon" onClick={() => onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onMonthChange(new Date())} className="text-muted-foreground text-xs">
          Hoje
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-7 mb-2">
            {WEEK_DAYS.map(day => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
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
                    "min-h-[72px] rounded-lg p-2 text-left transition-all border hover:border-primary/50 hover:bg-accent/50",
                    isCurrentMonth ? "bg-card" : "bg-muted/30 opacity-50",
                    todayFlag && "border-primary bg-primary/5",
                    !todayFlag && "border-border/50",
                  )}
                >
                  <div className={cn("text-xs font-semibold mb-1.5", todayFlag && "text-primary", !isCurrentMonth && "text-muted-foreground")}>
                    {format(day, 'd')}
                    {todayFlag && <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-primary" />}
                  </div>
                  {dayPosts.length > 0 && (
                    <div className="space-y-0.5">
                      {dayPosts.slice(0, 2).map(post => (
                        <div key={post.id} className="flex gap-0.5">
                          {post.platforms.slice(0, 3).map(p => (
                            <span key={p} className={cn("w-1.5 h-1.5 rounded-full shrink-0", PLATFORM_CONFIG[p].color)} />
                          ))}
                          <span className="text-[10px] leading-tight truncate text-muted-foreground ml-0.5">
                            {post.content.substring(0, 20)}
                          </span>
                        </div>
                      ))}
                      {dayPosts.length > 2 && (
                        <div className="text-[10px] text-muted-foreground">+{dayPosts.length - 2} mais</div>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Day Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="capitalize">{selectedDateLabel}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            <Button size="sm" className="w-full gap-2" onClick={() => { setSheetOpen(false); onCreatePost(selectedDate || undefined); }}>
              <Plus className="h-4 w-4" /> Novo post neste dia
            </Button>
            {selectedDayPosts.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <ListTodo className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">Nenhum post para este dia</p>
              </div>
            ) : (
              selectedDayPosts.map(post => {
                const statusCfg = STATUS_CONFIG[post.status];
                return (
                  <button key={post.id} onClick={() => { setSheetOpen(false); onEditPost(post); }} className="w-full text-left">
                    <Card className="hover:border-primary/50 transition-colors">
                      <CardContent className="p-3 space-y-2">
                        <p className="text-sm line-clamp-2">{post.content}</p>
                        <div className="flex flex-wrap gap-1">
                          {post.platforms.map(p => (
                            <span key={p} className={cn("text-[10px] px-1.5 py-0.5 rounded-full text-primary-foreground", PLATFORM_CONFIG[p].color)}>
                              {PLATFORM_CONFIG[p].label}
                            </span>
                          ))}
                          <Badge variant={statusCfg.variant} className="text-[10px]">{statusCfg.label}</Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {format(parseISO(post.scheduledAt), 'HH:mm')}
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
