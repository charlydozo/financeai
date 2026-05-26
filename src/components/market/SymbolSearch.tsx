'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Loader2 } from 'lucide-react';

interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}

interface SymbolSearchProps {
  value: string;
  onChange: (symbol: string) => void;
}

export function SymbolSearch({ value, onChange }: SymbolSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function close() {
    setOpen(false);
    setQuery('');
    setResults([]);
    setActiveIndex(-1);
  }

  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();

    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      setOpen(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch(`/api/market/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        setResults(data.results ?? []);
        setOpen(true);
        setActiveIndex(-1);
      } catch (e: any) {
        if (e?.name !== 'AbortError') setResults([]);
      } finally {
        setLoading(false);
      }
    }, 280);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value.toUpperCase();
    setQuery(q);
    search(q);
  };

  const select = useCallback((symbol: string) => {
    onChange(symbol.toUpperCase());
    close();
    inputRef.current?.blur();
  }, [onChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'Escape':
        close();
        inputRef.current?.blur();
        break;
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && results[activeIndex]) {
          select(results[activeIndex].symbol);
        } else if (query.trim()) {
          select(query.trim());
        }
        break;
    }
  };

  const isEditing = query.length > 0;

  return (
    <div className="relative" ref={containerRef}>
      {/* Input */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-xl focus-within:border-brand-500 transition-colors">
        {loading
          ? <Loader2 className="w-3.5 h-3.5 text-gray-500 animate-spin shrink-0" />
          : <Search className="w-3.5 h-3.5 text-gray-500 shrink-0" />
        }
        <input
          ref={inputRef}
          value={isEditing ? query : value}
          onChange={handleChange}
          onFocus={() => { if (query.length >= 2) setOpen(true); }}
          onKeyDown={handleKeyDown}
          placeholder={value}
          className="bg-transparent text-white text-sm font-semibold outline-none w-24 placeholder-gray-400"
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="characters"
        />
        {isEditing && (
          <button
            tabIndex={-1}
            onMouseDown={(e) => { e.preventDefault(); close(); }}
            className="text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div className="absolute top-full mt-1.5 left-0 w-80 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl shadow-black/50 z-50 overflow-hidden py-1">
          {results.map((r, i) => (
            <button
              key={r.symbol}
              tabIndex={-1}
              onMouseDown={(e) => { e.preventDefault(); select(r.symbol); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                i === activeIndex ? 'bg-gray-800' : 'hover:bg-gray-800/60'
              }`}
            >
              <span className="text-sm font-bold text-white w-20 shrink-0 font-mono tracking-wide">
                {r.symbol}
              </span>
              <span className="text-xs text-gray-400 truncate flex-1 min-w-0">{r.name}</span>
              <span className="text-[10px] text-gray-600 shrink-0 uppercase tracking-wide">
                {r.exchange}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* No results hint */}
      {open && !loading && query.length >= 2 && results.length === 0 && (
        <div className="absolute top-full mt-1.5 left-0 w-64 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl shadow-black/50 z-50 px-4 py-3">
          <p className="text-xs text-gray-500">
            Aucun résultat. Appuyez sur <kbd className="px-1 py-0.5 bg-gray-800 rounded text-gray-400 text-[10px]">Entrée</kbd> pour essayer {query} directement.
          </p>
        </div>
      )}
    </div>
  );
}
