import { useState, useEffect, useCallback } from 'react';

export function useDraftPersistence<T extends object>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with initial to handle new fields added after draft was saved
        return { ...initialValue, ...parsed };
      }
    } catch {
      // Corrupted data, ignore
    }
    return initialValue;
  });

  // Auto-save to localStorage on change (debounced)
  useEffect(() => {
    const timeout = setTimeout(() => {
      localStorage.setItem(key, JSON.stringify(value));
    }, 300);
    return () => clearTimeout(timeout);
  }, [key, value]);

  const updateField = useCallback(<K extends keyof T>(field: K, fieldValue: T[K]) => {
    setValue(prev => ({ ...prev, [field]: fieldValue }));
  }, []);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(key);
    setValue(initialValue);
  }, [key, initialValue]);

  const hasDraft = Object.entries(value).some(([k, v]) => {
    const initial = initialValue[k];
    if (typeof v === 'string') return v !== initial;
    return v !== initial;
  });

  return { value, setValue, updateField, clearDraft, hasDraft };
}
