import { useState, useEffect, useCallback, useRef } from 'react';

interface DraftOptions<T> {
  key: string;
  initialValue: T;
  debounceMs?: number;
  storage?: 'local' | 'session';
}

interface DraftMeta {
  updatedAt: string;
  version: number;
}

interface StoredDraft<T> {
  data: T;
  meta: DraftMeta;
}

const DRAFT_VERSION = 1;

export function useDraft<T>({ key, initialValue, debounceMs = 300, storage = 'local' }: DraftOptions<T>) {
  const storageKey = `draft_${key}`;
  const storageApi = storage === 'local' ? localStorage : sessionStorage;
  
  const [value, setValue] = useState<T>(initialValue);
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);
  const [draftRestoredAt, setDraftRestoredAt] = useState<Date | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);
  const valueRef = useRef<T>(initialValue);

  // Keep valueRef in sync
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  // Save immediately (for visibility change / page hide)
  const saveImmediately = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    try {
      const draft: StoredDraft<T> = {
        data: valueRef.current,
        meta: {
          updatedAt: new Date().toISOString(),
          version: DRAFT_VERSION,
        },
      };
      storageApi.setItem(storageKey, JSON.stringify(draft));
    } catch (error) {
      console.warn('Failed to save draft:', error);
    }
  }, [storageKey, storageApi]);

  // Load draft on mount
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    try {
      const stored = storageApi.getItem(storageKey);
      if (stored) {
        const parsed: StoredDraft<T> = JSON.parse(stored);
        if (parsed.meta.version === DRAFT_VERSION && parsed.data) {
          setValue(parsed.data);
          valueRef.current = parsed.data;
          setHasRestoredDraft(true);
          setDraftRestoredAt(new Date(parsed.meta.updatedAt));
        }
      }
    } catch (error) {
      console.warn('Failed to restore draft:', error);
      storageApi.removeItem(storageKey);
    }
  }, [storageKey, storageApi]);

  // Add visibility change and pagehide listeners for mobile
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveImmediately();
      }
    };

    const handlePageHide = () => {
      saveImmediately();
    };

    const handleBeforeUnload = () => {
      saveImmediately();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [saveImmediately]);

  // Save draft with debounce
  const saveDraft = useCallback((newValue: T) => {
    setValue(newValue);
    valueRef.current = newValue;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      try {
        const draft: StoredDraft<T> = {
          data: newValue,
          meta: {
            updatedAt: new Date().toISOString(),
            version: DRAFT_VERSION,
          },
        };
        storageApi.setItem(storageKey, JSON.stringify(draft));
      } catch (error) {
        console.warn('Failed to save draft:', error);
      }
    }, debounceMs);
  }, [storageKey, debounceMs, storageApi]);

  // Clear draft
  const clearDraft = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    storageApi.removeItem(storageKey);
    setHasRestoredDraft(false);
    setDraftRestoredAt(null);
  }, [storageKey, storageApi]);

  // Discard draft and reset to initial value
  const discardDraft = useCallback(() => {
    clearDraft();
    setValue(initialValue);
    valueRef.current = initialValue;
  }, [clearDraft, initialValue]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    value,
    setValue: saveDraft,
    hasRestoredDraft,
    draftRestoredAt,
    clearDraft,
    discardDraft,
  };
}
