import {
  listGradingCompanies,
  listGradingGrades,
  listGradingTypes,
} from '@/lib/cardsight/client';
import { createServiceClient } from '@/lib/supabase';

export type GradeLookupKey = {
  company: string;
  grade: number;
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const GRADE_API_DELAY_MS = 280;
let memoryExpiresAt = 0;
let gradeIdByKey = new Map<string, string>();
let gradeApiThrottle: Promise<void> = Promise.resolve();
let dbHydrated = false;

function throttleGradeApiCall<T>(run: () => Promise<T>): Promise<T> {
  const scheduled = gradeApiThrottle.then(async () => {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, GRADE_API_DELAY_MS);
    });
  });
  gradeApiThrottle = scheduled.catch(() => undefined);
  return scheduled.then(run);
}

function normalizeCompany(value: string) {
  return value.trim().toUpperCase();
}

function gradeKey(company: string, grade: number) {
  return `${normalizeCompany(company)}:${grade}`;
}

function parseGradeValue(value: string | number | undefined) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.replace(/[^0-9.]/g, ''));
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

async function hydrateFromDatabase() {
  const supabase = createServiceClient();
  const { data, error } = await supabase.from('cardsight_grade_map').select('company, grade, grade_id');

  if (error) {
    throw new Error(error.message);
  }

  const nextMap = new Map<string, string>();
  for (const row of data ?? []) {
    const company = String(row.company ?? '');
    const grade = Number(row.grade);
    const gradeId = String(row.grade_id ?? '');
    if (!company || !Number.isFinite(grade) || !gradeId) continue;
    nextMap.set(gradeKey(company, grade), gradeId);
  }

  if (nextMap.size > 0) {
    gradeIdByKey = nextMap;
    memoryExpiresAt = Date.now() + CACHE_TTL_MS;
    dbHydrated = true;
  }
}

async function persistGradeMap(entries: { company: string; grade: number; gradeId: string }[]) {
  if (entries.length === 0) return;

  const supabase = createServiceClient();
  const { error } = await supabase.from('cardsight_grade_map').upsert(
    entries.map((entry) => ({
      company: normalizeCompany(entry.company),
      grade: entry.grade,
      grade_id: entry.gradeId,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: 'company,grade' }
  );

  if (error) {
    throw new Error(error.message);
  }
}

async function rebuildGradeCacheFromApi() {
  const companies = await throttleGradeApiCall(() => listGradingCompanies());
  const entries: { company: string; grade: number; gradeId: string }[] = [];

  for (const company of companies) {
    const companyLabel = company.short_name ?? company.name;
    const types = await throttleGradeApiCall(() => listGradingTypes(company.id));

    for (const type of types) {
      const grades = type.grades?.length
        ? type.grades
        : await throttleGradeApiCall(() => listGradingGrades(company.id, type.id));

      for (const grade of grades) {
        const numeric =
          grade.numeric_value ?? parseGradeValue(grade.value) ?? parseGradeValue(grade.name);
        if (numeric == null) continue;
        entries.push({
          gradeId: grade.id,
          company: companyLabel,
          grade: numeric,
        });
      }
    }
  }

  const nextMap = new Map<string, string>();
  for (const entry of entries) {
    nextMap.set(gradeKey(entry.company, entry.grade), entry.gradeId);
  }

  gradeIdByKey = nextMap;
  memoryExpiresAt = Date.now() + CACHE_TTL_MS;
  dbHydrated = true;

  await persistGradeMap(entries);
}

export async function resolveGradeId(company: string | null, grade: number | null) {
  if (!company || grade == null || !Number.isFinite(grade)) {
    return null;
  }

  if (!dbHydrated || Date.now() >= memoryExpiresAt || gradeIdByKey.size === 0) {
    await hydrateFromDatabase();
  }

  if (gradeIdByKey.size === 0) {
    await rebuildGradeCacheFromApi();
  }

  const direct = gradeIdByKey.get(gradeKey(company, grade));
  if (direct) {
    return direct;
  }

  const normalized = normalizeCompany(company);
  for (const [key, gradeId] of gradeIdByKey.entries()) {
    const [keyCompany, keyGrade] = key.split(':');
    if (keyCompany === normalized && Number(keyGrade) === grade) {
      return gradeId;
    }
  }

  return null;
}

export function resetGradeCacheForTests() {
  memoryExpiresAt = 0;
  gradeIdByKey = new Map();
  dbHydrated = false;
}

export function seedGradeCacheForTests(entries: GradeLookupKey[], gradeId: string) {
  for (const entry of entries) {
    gradeIdByKey.set(gradeKey(entry.company, entry.grade), gradeId);
  }
  memoryExpiresAt = Date.now() + CACHE_TTL_MS;
  dbHydrated = true;
}
