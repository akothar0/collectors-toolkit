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
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-ink-3">Grade</p>
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
          ? 'border-ink bg-ink text-paper'
          : 'border-rule bg-surface-2 text-ink-2 hover:border-ink hover:text-ink'
      }`}
    >
      {label}
    </button>
  );
}
