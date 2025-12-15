import { Client } from '@/types';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Building2 } from 'lucide-react';
import { ClientDetailContent } from './ClientDetailContent'; // Import the new content component

interface ClientDetailSheetProps {
  client: Client | null;
  onClose: () => void;
  onUpdate: (client: Client) => void;
}

export function ClientDetailSheet({ client, onClose, onUpdate }: ClientDetailSheetProps) {
  if (!client) return null;

  return (
    <Sheet open={!!client} onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Building2 className="h-7 w-7 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-xl">{client.companyName}</SheetTitle>
              <p className="text-muted-foreground text-sm mt-1">{client.contactName}</p>
            </div>
          </div>
        </SheetHeader>
        
        <div className="mt-6">
          <ClientDetailContent client={client} onUpdate={onUpdate} />
        </div>
      </SheetContent>
    </Sheet>
  );
}