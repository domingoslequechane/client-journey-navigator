"use client";

import React from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ClientWithConversation } from './types';

interface ChatHeaderProps {
  client: ClientWithConversation | undefined;
  isMobile: boolean;
  onBack: () => void;
  getStageLabel: (stage: string) => string;
}

export const ChatHeader = ({ client, isMobile, onBack, getStageLabel }: ChatHeaderProps) => {
  return (
    <div className="h-14 md:h-16 px-3 md:px-4 border-b border-border bg-background flex items-center gap-2 shrink-0 sticky top-0 z-10">
      {isMobile && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      )}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="h-9 w-9 md:h-10 md:w-10 rounded-xl bg-gradient-to-r from-primary to-chart-5 flex items-center justify-center shrink-0">
          <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-primary-foreground" />
        </div>
        <div className="min-w-0">
          <h1 className="font-semibold text-sm md:text-base truncate">{client?.company_name}</h1>
          <p className="text-xs md:text-sm text-muted-foreground truncate">
            {client?.contact_name} • {getStageLabel(client?.current_stage || '')}
          </p>
        </div>
      </div>
    </div>
  );
};