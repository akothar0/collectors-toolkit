'use client';

import { useEffect, useRef, useState } from 'react';
import type { CardSearchResult } from '@/lib/collection';

type PlayerAutocompleteProps = {
  value: string;
  onChange: (value: string) => void;
  onSelectCard?: (card: CardSearchResult) => void;
  placeholder?: string;
  required?: boolean;
};

export function PlayerAutocomplete({
  value,
  onChange,
  onSelectCard,
  placeholder = 'Player name',
  required = false,
}: PlayerAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<CardSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/cards/search?q=${encodeURIComponent(value.trim())}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          return;
        }
        const data = (await response.json()) as { results?: CardSearchResult[] };
        setSuggestions(data.results ?? []);
        setOpen((data.results ?? []).length > 0);
      } catch {
        // Ignore aborted or network errors.
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-medium text-slate-700">
        Player name {required ? <span className="text-rose-500">*</span> : null}
      </label>
      <input
        type="text"
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => {
          if (suggestions.length > 0) {
            setOpen(true);
          }
        }}
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-brand-500 transition focus:border-brand-400 focus:ring-2"
        autoComplete="off"
      />
      {loading ? (
        <p className="mt-1 text-xs text-slate-400">Searching catalog...</p>
      ) : null}
      {open && suggestions.length > 0 ? (
        <ul className="absolute z-20 mt-2 max-h-56 w-full overflow-auto rounded-2xl border border-slate-200 bg-white py-2 shadow-soft">
          {suggestions.map((card) => (
            <li key={card.id}>
              <button
                type="button"
                className="flex w-full flex-col px-4 py-2 text-left text-sm hover:bg-slate-50"
                onClick={() => {
                  onChange(card.player);
                  onSelectCard?.(card);
                  setOpen(false);
                }}
              >
                <span className="font-medium text-slate-900">{card.player}</span>
                <span className="text-xs text-slate-500">
                  {[card.year, card.set_name].filter(Boolean).join(' · ') || 'Catalog match'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
