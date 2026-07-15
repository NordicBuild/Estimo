import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../supabase';
import { suggestTags } from './searchIndex';

export function useDocumentSearch(projectId: string | null) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<any>({});
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timeoutRef = useRef<number | null>(null);

  const fetchResults = useCallback(async (searchQuery: string, currentFilters: any) => {
    if (!projectId) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke('search-documents', {
        body: { projectId, query: searchQuery, filters: currentFilters }
      });
      
      if (error) throw error;
      setResults(data.results || []);
    } catch (err: any) {
      console.error('Search error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      fetchResults(query, filters);
    }, 300) as unknown as number;

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [query, filters, fetchResults]);

  return { query, setQuery, filters, setFilters, results, isLoading, error };
}

export function useSuggestedTags(filename: string) {
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    if (filename) {
      setTags(suggestTags(filename));
    } else {
      setTags([]);
    }
  }, [filename]);

  return tags;
}

export function useSavedSearches() {
  const [savedSearches, setSavedSearches] = useState<{id: string, name: string, query: string, filters: any}[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('ffu_saved_searches');
    if (stored) {
      try {
        setSavedSearches(JSON.parse(stored));
      } catch (e) {}
    }
  }, []);

  const saveSearch = (name: string, query: string, filters: any) => {
    const newSearch = { id: crypto.randomUUID(), name, query, filters };
    const updated = [...savedSearches, newSearch];
    setSavedSearches(updated);
    localStorage.setItem('ffu_saved_searches', JSON.stringify(updated));
  };

  const deleteSearch = (id: string) => {
    const updated = savedSearches.filter(s => s.id !== id);
    setSavedSearches(updated);
    localStorage.setItem('ffu_saved_searches', JSON.stringify(updated));
  };

  return { savedSearches, saveSearch, deleteSearch };
}
