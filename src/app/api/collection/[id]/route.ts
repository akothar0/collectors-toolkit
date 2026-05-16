import { findOrCreateCard } from '@/lib/card-catalog';
import {
  firstText,
  toBoolean,
  toInteger,
  toNumber,
  toSubGrades,
  toText,
} from '@/lib/collection-body';
import type { CollectionCardDetail } from '@/lib/collection-detail';
import { getAuthenticatedSupabaseUserId } from '@/lib/collection-auth';
import { createServiceClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

type RouteContext = {
  params: Promise<{ id: string }>;
};

const DETAIL_SELECT = `
  id, card_id, front_image_url, back_image_url,
  override_player, override_year, override_set_name, override_parallel, override_card_number,
  sport, condition_type, grade, grade_description, qualifier_code, grading_company, cert_number,
  autograph_grade, sub_grades, notes,
  purchase_price, purchase_date, purchase_source, purchase_url,
  current_value, value_updated_at, value_source,
  status, scan_id, grade_session_id, import_item_id, created_at, updated_at,
  cards ( id, player, year, set_name, card_number, parallel, sport, is_rookie, is_autograph ),
  graded_scans ( id, created_at, cert_number, grading_company ),
  raw_grade_sessions ( id, created_at, predicted_grade, confidence ),
  import_items ( id, created_at, raw_source )
`;

function normalizeJoin<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

type CardRow = {
  id: string;
  player: string;
  year: number | null;
  set_name: string | null;
  card_number: string | null;
  parallel: string | null;
  sport: string | null;
  is_rookie: boolean;
  is_autograph: boolean;
};

function mapDetailRow(row: Record<string, unknown>): CollectionCardDetail {
  const card = normalizeJoin(row.cards as CardRow | CardRow[] | null);
  const scan = normalizeJoin(
    row.graded_scans as
      | { id: string; created_at: string; cert_number: string | null; grading_company: string | null }
      | { id: string; created_at: string; cert_number: string | null; grading_company: string | null }[]
      | null
  );
  const gradeSession = normalizeJoin(
    row.raw_grade_sessions as
      | { id: string; created_at: string; predicted_grade: number | null; confidence: string | null }
      | { id: string; created_at: string; predicted_grade: number | null; confidence: string | null }[]
      | null
  );
  const importItem = normalizeJoin(
    row.import_items as
      | { id: string; created_at: string; raw_source: string | null }
      | { id: string; created_at: string; raw_source: string | null }[]
      | null
  );

  const subGradesRaw = row.sub_grades as Record<string, unknown> | null;

  return {
    id: row.id as string,
    cardId: (row.card_id as string | null) ?? null,
    frontImageUrl: (row.front_image_url as string | null) ?? null,
    backImageUrl: (row.back_image_url as string | null) ?? null,
    player: (row.override_player as string | null) ?? card?.player ?? null,
    year: (row.override_year as number | null) ?? card?.year ?? null,
    setName: (row.override_set_name as string | null) ?? card?.set_name ?? null,
    parallel: (row.override_parallel as string | null) ?? card?.parallel ?? null,
    cardNumber: (row.override_card_number as string | null) ?? card?.card_number ?? null,
    sport: (row.sport as string | null) ?? card?.sport ?? null,
    conditionType: row.condition_type as string,
    grade: row.grade != null ? Number(row.grade) : null,
    gradeDescription: (row.grade_description as string | null) ?? null,
    qualifierCode: (row.qualifier_code as string | null) ?? null,
    gradingCompany: (row.grading_company as string | null) ?? null,
    certNumber: (row.cert_number as string | null) ?? null,
    autographGrade: row.autograph_grade != null ? Number(row.autograph_grade) : null,
    subGrades: subGradesRaw
      ? {
          centering: subGradesRaw.centering != null ? Number(subGradesRaw.centering) : undefined,
          corners: subGradesRaw.corners != null ? Number(subGradesRaw.corners) : undefined,
          edges: subGradesRaw.edges != null ? Number(subGradesRaw.edges) : undefined,
          surface: subGradesRaw.surface != null ? Number(subGradesRaw.surface) : undefined,
        }
      : null,
    notes: (row.notes as string | null) ?? null,
    purchasePrice: row.purchase_price != null ? Number(row.purchase_price) : null,
    purchaseDate: (row.purchase_date as string | null) ?? null,
    purchaseSource: (row.purchase_source as string | null) ?? null,
    purchaseUrl: (row.purchase_url as string | null) ?? null,
    currentValue: row.current_value != null ? Number(row.current_value) : null,
    valueUpdatedAt: (row.value_updated_at as string | null) ?? null,
    valueSource: (row.value_source as string | null) ?? null,
    status: row.status as string,
    scanId: (row.scan_id as string | null) ?? null,
    gradeSessionId: (row.grade_session_id as string | null) ?? null,
    importItemId: (row.import_item_id as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    catalog: card
      ? {
          id: card.id,
          player: card.player,
          year: card.year,
          setName: card.set_name,
          cardNumber: card.card_number,
          parallel: card.parallel,
          sport: card.sport,
          isRookie: card.is_rookie,
          isAutograph: card.is_autograph,
        }
      : null,
    scanSession: scan
      ? {
          id: scan.id,
          createdAt: scan.created_at,
          certNumber: scan.cert_number,
          gradingCompany: scan.grading_company,
        }
      : null,
    gradeSession: gradeSession
      ? {
          id: gradeSession.id,
          createdAt: gradeSession.created_at,
          predictedGrade:
            gradeSession.predicted_grade != null ? Number(gradeSession.predicted_grade) : null,
          confidence: gradeSession.confidence,
        }
      : null,
    importItem: importItem
      ? {
          id: importItem.id,
          createdAt: importItem.created_at,
          rawSource: importItem.raw_source,
        }
      : null,
  };
}

async function getOwnedCard(id: string, supabaseUserId: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('collection_cards')
    .select(DETAIL_SELECT)
    .eq('id', id)
    .eq('user_id', supabaseUserId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function GET(_req: Request, context: RouteContext) {
  const supabaseUserId = await getAuthenticatedSupabaseUserId();
  if (!supabaseUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const row = await getOwnedCard(id, supabaseUserId);
    if (!row) {
      return NextResponse.json({ error: 'Card not found.' }, { status: 404 });
    }
    return NextResponse.json(mapDetailRow(row as Record<string, unknown>));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to load card.' },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request, context: RouteContext) {
  const supabaseUserId = await getAuthenticatedSupabaseUserId();
  if (!supabaseUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const existing = await getOwnedCard(id, supabaseUserId);
    if (!existing) {
      return NextResponse.json({ error: 'Card not found.' }, { status: 404 });
    }

    const body = (await req.json()) as Record<string, unknown>;
    const supabase = createServiceClient();
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (
      'player' in body ||
      'cardPlayer' in body ||
      'year' in body ||
      'cardYear' in body ||
      'setName' in body ||
      'cardSet' in body
    ) {
      const player = firstText(body.player, body.cardPlayer);
      const year = toInteger(body.year ?? body.cardYear);

      if (player) {
        const card = await findOrCreateCard({
          player,
          year: year ?? undefined,
          sport: firstText(body.sport) ?? undefined,
          set_name: firstText(body.setName, body.cardSet) ?? undefined,
          card_number: firstText(body.cardNumber, body.cardCardNumber) ?? undefined,
          parallel: firstText(body.parallel, body.cardParallel),
          is_rookie: 'isRookie' in body ? toBoolean(body.isRookie) : undefined,
          is_autograph: 'isAutograph' in body ? toBoolean(body.isAutograph) : undefined,
          source: 'manual_collection',
        });
        updates.card_id = card.id;
      }

      if ('player' in body || 'cardPlayer' in body) {
        updates.override_player = firstText(body.player, body.cardPlayer);
      }
      if ('year' in body || 'cardYear' in body) {
        updates.override_year = toInteger(body.year ?? body.cardYear);
      }
      if ('setName' in body || 'cardSet' in body) {
        updates.override_set_name = firstText(body.setName, body.cardSet);
      }
      if ('parallel' in body || 'cardParallel' in body) {
        updates.override_parallel = firstText(body.parallel, body.cardParallel);
      }
      if ('cardNumber' in body || 'cardCardNumber' in body) {
        updates.override_card_number = firstText(body.cardNumber, body.cardCardNumber);
      }
    }

    if ('sport' in body) updates.sport = toText(body.sport);
    if ('frontImageUrl' in body || 'imageUrl' in body) {
      updates.front_image_url = firstText(body.frontImageUrl, body.imageUrl);
    }
    if ('backImageUrl' in body) updates.back_image_url = toText(body.backImageUrl);
    if ('notes' in body) updates.notes = toText(body.notes);
    if ('purchasePrice' in body) updates.purchase_price = toNumber(body.purchasePrice);
    if ('purchaseDate' in body) updates.purchase_date = toText(body.purchaseDate);
    if ('purchaseSource' in body) updates.purchase_source = toText(body.purchaseSource);
    if ('purchaseUrl' in body) updates.purchase_url = toText(body.purchaseUrl);
    if ('certNumber' in body) updates.cert_number = toText(body.certNumber);
    if ('gradeDescription' in body) updates.grade_description = toText(body.gradeDescription);
    if ('qualifierCode' in body) updates.qualifier_code = toText(body.qualifierCode);
    if ('autographGrade' in body) updates.autograph_grade = toNumber(body.autographGrade);
    if ('subGrades' in body) updates.sub_grades = toSubGrades(body.subGrades);

    if ('currentValue' in body) {
      updates.current_value = toNumber(body.currentValue);
      updates.value_updated_at = new Date().toISOString();
      updates.value_source = 'manual';
    }

    if ('conditionType' in body) {
      const conditionType = toText(body.conditionType) ?? 'raw';
      updates.condition_type = conditionType;
      if (conditionType === 'raw') {
        updates.grade = null;
        updates.grading_company = null;
      }
    }

    if ('gradingCompany' in body) updates.grading_company = toText(body.gradingCompany);
    if ('grade' in body) updates.grade = toNumber(body.grade);

    const { data, error } = await supabase
      .from('collection_cards')
      .update(updates)
      .eq('id', id)
      .eq('user_id', supabaseUserId)
      .select(DETAIL_SELECT)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? 'Unable to update card.' },
        { status: 500 }
      );
    }

    return NextResponse.json(mapDetailRow(data as Record<string, unknown>));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to update card.' },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  const supabaseUserId = await getAuthenticatedSupabaseUserId();
  if (!supabaseUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const supabase = createServiceClient();

  const { error } = await supabase
    .from('collection_cards')
    .delete()
    .eq('id', id)
    .eq('user_id', supabaseUserId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
