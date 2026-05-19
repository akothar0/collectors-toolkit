import type { CatalogCard } from '@/lib/cardsight/types';
import { normalizeSetNameForSearch } from '@/lib/pricing/set-normalize';

export type ResolveCardQuery = {
  player: string;
  year?: number | null;
  setName?: string | null;
  cardNumber?: string | null;
  parallel?: string | null;
  manufacturer?: string | null;
};

function normalizeText(value?: string | null) {
  return (value ?? '').trim().toLowerCase();
}

function normalizeCardNumber(value?: string | null) {
  return normalizeText(value).replace(/^#/, '').replace(/\s+/g, '');
}

export function scoreCatalogMatch(candidate: CatalogCard, query: ResolveCardQuery) {
  let score = 0;

  const queryPlayer = normalizeText(query.player);
  const candidateName = normalizeText(candidate.name);
  if (queryPlayer && candidateName) {
    if (candidateName === queryPlayer) score += 30;
    else if (candidateName.includes(queryPlayer) || queryPlayer.includes(candidateName)) {
      score += 18;
    }
  }

  if (query.year != null && candidate.year === query.year) {
    score += 15;
  }

  const querySet = normalizeText(normalizeSetNameForSearch(query.setName));
  const candidateSet = normalizeText(normalizeSetNameForSearch(candidate.set?.name));
  if (querySet && candidateSet) {
    if (candidateSet === querySet) score += 25;
    else if (candidateSet.includes(querySet) || querySet.includes(candidateSet)) {
      score += 12;
    }
  }

  const queryNumber = normalizeCardNumber(query.cardNumber);
  const candidateNumber = normalizeCardNumber(candidate.number);
  if (queryNumber && candidateNumber) {
    if (candidateNumber === queryNumber) score += 35;
    else if (candidateNumber.includes(queryNumber) || queryNumber.includes(candidateNumber)) {
      score += 10;
    }
  }

  const queryParallel = normalizeText(query.parallel);
  if (queryParallel) {
    const parallelNames = (candidate.parallels ?? []).map((parallel) => normalizeText(parallel.name));
    if (parallelNames.some((name) => name === queryParallel || name.includes(queryParallel))) {
      score += 10;
    }
  }

  return score;
}

export function defaultCatalogMatchMinScore(query: ResolveCardQuery) {
  return query.cardNumber?.trim() ? 45 : 35;
}

export function pickBestCatalogMatches(
  candidates: CatalogCard[],
  query: ResolveCardQuery,
  options?: { minScore?: number; ambiguityGap?: number }
) {
  const minScore = options?.minScore ?? defaultCatalogMatchMinScore(query);
  const ambiguityGap = options?.ambiguityGap ?? 8;

  const ranked = candidates
    .map((candidate) => ({
      candidate,
      score: scoreCatalogMatch(candidate, query),
    }))
    .filter((entry) => entry.score >= minScore)
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 0) {
    return { status: 'not_found' as const, matches: [] };
  }

  const top = ranked[0];
  const runnerUp = ranked[1];

  if (runnerUp && top.score - runnerUp.score < ambiguityGap) {
    const queryNumber = normalizeCardNumber(query.cardNumber);
    const tied = ranked.filter((entry) => top.score - entry.score < ambiguityGap);
    const allSameNumber =
      queryNumber.length > 0 &&
      tied.every((entry) => normalizeCardNumber(entry.candidate.number) === queryNumber);

    if (allSameNumber) {
      return {
        status: 'matched' as const,
        match: top.candidate,
        score: top.score,
      };
    }

    return {
      status: 'ambiguous' as const,
      matches: ranked.slice(0, 3).map((entry) => entry.candidate),
    };
  }

  return {
    status: 'matched' as const,
    match: top.candidate,
    score: top.score,
  };
}
