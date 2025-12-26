import { useState, useEffect, useCallback, useRef } from 'react';

interface DraftOptions<T> {
  key: string;
  initialValue: T;
  debounceMs?: number;
  storage?: 'local' | 'session';
  lazy?: boolean; // Only activates after first setValue call
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

type SetDraftValue<T> = T | ((prev: T) => T);

export function useDraft<T>({ key, initialValue, debounceMs = 300, storage = 'local', lazy = false }: DraftOptions<T>) {
  const storageKey = `draft_${key}`;
  const storageApi = storage === 'local' ? localStorage : sessionStorage;
  
  const [value, setValue] = useState<T>(initialValue);
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);
  const [draftRestoredAt, setDraftRestoredAt] = useState<Date | null>(null);
  const [isActivated, setIsActivated] = useState(!lazy);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);
  const valueRef = useRef<T>(initialValue);

  // Keep valueRef in sync
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  // Check if draft exists without loading it
  const hasDraftStored = useCallback(() => {
    try {
      return storageApi.getItem(storageKey) !== null;
    } catch {
      return false;
    }
  }, [storageKey, storageApi]);

  // Save immediately (for visibility change / page hide)
  const saveImmediately = useCallback(() => {
    if (!isActivated) return; // Don't save if not activated
    
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
  }, [storageKey, storageApi, isActivated]);

  // Load draft on mount (only if not lazy or if draft exists)
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    // In lazy mode, only restore if draft exists
    if (lazy && !hasDraftStored()) return;

    try {
      const stored = storageApi.getItem(storageKey);
      if (stored) {
        const parsed: StoredDraft<T> = JSON.parse(stored);
        if (parsed.meta.version === DRAFT_VERSION && parsed.data) {
          setValue(parsed.data);
          valueRef.current = parsed.data;
          setHasRestoredDraft(true);
          setDraftRestoredAt(new Date(parsed.meta.updatedAt));
          if (lazy) setIsActivated(true); // Activate if restoring in lazy mode
        }
      }
    } catch (error) {
      console.warn('Failed to restore draft:', error);
      storageApi.removeItem(storageKey);
    }
  }, [storageKey, storageApi, lazy, hasDraftStored]);

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
  const saveDraft = useCallback((nextValue: SetDraftValue<T>) => {
    const resolvedValue =
      typeof nextValue === 'function'
        ? (nextValue as (prev: T) => T)(valueRef.current)
        : nextValue;

    setValue(resolvedValue);
    valueRef.current = resolvedValue;

    // Activate on first interaction in lazy mode
    if (lazy && !isActivated) {
      setIsActivated(true);
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Only save if activated (or will be after this call)
    timeoutRef.current = setTimeout(() => {
      try {
        const draft: StoredDraft<T> = {
          data: resolvedValue,
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
  }, [storageKey, debounceMs, storageApi, lazy, isActivated]);

  // Clear draft
  const clearDraft = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    storageApi.removeItem(storageKey);
    setHasRestoredDraft(false);
    setDraftRestoredAt(null);
    if (lazy) setIsActivated(false); // Deactivate in lazy mode
  }, [storageKey, storageApi, lazy]);

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
