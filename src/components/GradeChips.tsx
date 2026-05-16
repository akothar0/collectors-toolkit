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
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Grade</p>
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
      className={`rounded-full border px-3 py-1.5 font-medium transition-colors ${
        prominent ? 'text-base' : 'text-sm'
      } ${
        active
          ? 'border-brand-500 bg-brand-600 text-white'
          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      {label}
    </button>
  );
}
