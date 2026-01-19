import { useState, useCallback, useEffect } from 'react';

interface UseUndoRedoOptions<T> {
  maxHistory?: number;
}

export function useUndoRedo<T>(
  initialState: T,
  options: UseUndoRedoOptions<T> = {}
) {
  const { maxHistory = 50 } = options;
  
  const [history, setHistory] = useState<T[]>([initialState]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;
  const currentState = history[currentIndex];

  const pushState = useCallback((newState: T) => {
    setHistory(prev => {
      // Remove any redo history
      const newHistory = prev.slice(0, currentIndex + 1);
      newHistory.push(newState);
      
      // Keep history within max limit
      if (newHistory.length > maxHistory) {
        newHistory.shift();
        return newHistory;
      }
      
      return newHistory;
    });
    setCurrentIndex(prev => Math.min(prev + 1, maxHistory - 1));
  }, [currentIndex, maxHistory]);

  const undo = useCallback(() => {
    if (canUndo) {
      setCurrentIndex(prev => prev - 1);
      return history[currentIndex - 1];
    }
    return currentState;
  }, [canUndo, currentIndex, history, currentState]);

  const redo = useCallback(() => {
    if (canRedo) {
      setCurrentIndex(prev => prev + 1);
      return history[currentIndex + 1];
    }
    return currentState;
  }, [canRedo, currentIndex, history, currentState]);

  const reset = useCallback((state: T) => {
    setHistory([state]);
    setCurrentIndex(0);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          redo();
        } else {
          e.preventDefault();
          undo();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return {
    currentState,
    pushState,
    undo,
    redo,
    canUndo,
    canRedo,
    reset,
  };
}
