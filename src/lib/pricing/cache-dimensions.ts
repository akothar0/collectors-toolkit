import type { PricingResponse } from '@/lib/cardsight/types';

export type CacheFilterOptions = {
  gradingCompanies: string[];
  gradesByCompany: Record<string, number[]>;
  parallels: { id: string; name: string }[];
};

function normalizeCompany(value: string | null | undefined) {
  return value?.trim() ?? '';
}

export function extractCacheFilterOptions(pricingResponse: PricingResponse): CacheFilterOptions {
  const companies = new Set<string>();
  const gradesByCompany: Record<string, Set<number>> = {};
  const parallels = new Map<string, string>();

  for (const record of pricingResponse.raw?.records ?? []) {
    if (record.parallel_id && record.parallel_name) {
      parallels.set(record.parallel_id, record.parallel_name);
    }
  }

  for (const company of pricingResponse.graded ?? []) {
    const companyName = normalizeCompany(company.company_name);
    if (!companyName) continue;
    companies.add(companyName);
    if (!gradesByCompany[companyName]) {
      gradesByCompany[companyName] = new Set();
    }
    for (const gradeGroup of company.grades ?? []) {
      const gradeValue = Number(gradeGroup.grade_value);
      if (Number.isFinite(gradeValue)) {
        gradesByCompany[companyName].add(gradeValue);
      }
      for (const record of gradeGroup.records ?? []) {
        if (record.parallel_id && record.parallel_name) {
          parallels.set(record.parallel_id, record.parallel_name);
        }
      }
    }
  }

  const sortedCompanies = [...companies].sort((a, b) => a.localeCompare(b));
  const grades: Record<string, number[]> = {};
  for (const company of sortedCompanies) {
    grades[company] = [...(gradesByCompany[company] ?? [])].sort((a, b) => b - a);
  }

  return {
    gradingCompanies: sortedCompanies,
    gradesByCompany: grades,
    parallels: [...parallels.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}
