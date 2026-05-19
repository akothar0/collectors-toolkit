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
  const [fieldActive, setFieldActive] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!fieldActive || value.trim().length < 2) {
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
        if (!response.ok) return;
        const data = (await response.json()) as { results?: CardSearchResult[] };
        const results = data.results ?? [];
        setSuggestions(results);
        if (inputRef.current === document.activeElement) {
          setOpen(results.length > 0);
        }
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
  }, [value, fieldActive]);

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
      <label className="block text-xs font-medium uppercase tracking-[0.18em] text-ink-3">
        Player name {required ? <span className="text-rose-400">*</span> : null}
      </label>
      <input
        ref={inputRef}
        type="text"
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => {
          setFieldActive(true);
          if (suggestions.length > 0) {
            setOpen(true);
          }
        }}
        onBlur={() => {
          setFieldActive(false);
        }}
        className="mt-2 h-11 w-full rounded border border-rule bg-surface-2 px-4 text-sm text-ink placeholder:text-ink-3 outline-none focus:border-ink"
        autoComplete="off"
      />
      {loading ? (
        <p className="mt-1 text-xs text-ink-3">Searching…</p>
      ) : null}
      {open && suggestions.length > 0 ? (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded border border-rule bg-surface py-1">
          {suggestions.map((card) => (
            <li key={card.id}>
              <button
                type="button"
                className="flex w-full flex-col px-4 py-2.5 text-left hover:bg-surface-2"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(card.player);
                  onSelectCard?.(card);
                  setOpen(false);
                }}
              >
                <span className="text-sm font-medium text-ink">{card.player}</span>
                <span className="text-xs text-ink-3">
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
