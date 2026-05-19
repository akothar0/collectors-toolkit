'use client';

import { GRADE_OPTIONS, PROMINENT_GRADES } from '@/lib/collection';

type GradeChipsProps = {
  value: number | null;
  onChange: (grade: number) => void;
};

export function GradeChips({ value, onChange }: GradeChipsProps) {
  const prominent = PROMINENT_GRADES as readonly number[];
  const rest = GRADE_OPTIONS.filter((grade) => !prominent.includes(grade));

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-ash-500">Grade</p>
      <div className="flex flex-wrap gap-2">
        {prominent.map((grade) => (
          <GradeChip key={grade} grade={grade} active={value === grade} onChange={onChange} prominent />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {rest.map((grade) => (
          <GradeChip key={grade} grade={grade} active={value === grade} onChange={onChange} />
        ))}
      </div>
    </div>
  );
}

function GradeChip({
  grade,
  active,
  onChange,
  prominent = false,
}: {
  grade: number;
  active: boolean;
  onChange: (grade: number) => void;
  prominent?: boolean;
}) {
  const label = grade % 1 === 0 ? String(grade) : grade.toFixed(1);

  return (
    <button
      type="button"
      onClick={() => onChange(grade)}
      className={`tabular-nums rounded border font-semibold ${
        prominent ? 'px-4 py-2 text-base' : 'px-3 py-1.5 text-sm'
      } ${
        active
          ? 'border-brand-500/50 bg-brand-900/30 text-brand-400'
          : 'border-ink-600 bg-ink-800 text-ash-300 hover:border-ink-500 hover:text-ash-50'
      }`}
    >
      {label}
    </button>
  );
}
