import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SocialCalendar } from './SocialCalendar';
import { type SocialPostRow } from '@/hooks/useSocialPosts';
import { CalendarDays } from 'lucide-react';

interface CalendarModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    posts: SocialPostRow[];
    selectedClient?: string;
    onEditPost?: (post: SocialPostRow) => void;
    onCreatePost?: (date?: string) => void;
}

export function CalendarModal({
    open,
    onOpenChange,
    posts,
    selectedClient,
    onEditPost = () => { },
    onCreatePost = () => { }
}: CalendarModalProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CalendarDays className="h-5 w-5 text-primary" />
                        Calendário de Publicações
                    </DialogTitle>
                </DialogHeader>

                <div className="mt-4">
                    <SocialCalendar
                        posts={posts}
                        currentMonth={currentMonth}
                        onMonthChange={setCurrentMonth}
                        onCreatePost={(date) => {
                            onCreatePost(date);
                            onOpenChange(false);
                        }}
                        onEditPost={(post) => {
                            onEditPost(post);
                            onOpenChange(false);
                        }}
                        selectedClient={selectedClient}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
