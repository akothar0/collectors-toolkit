import { createServiceClient } from '@/lib/supabase';

type CardInput = {
  player: string;
  year?: number;
  sport?: string;
  manufacturer?: string;
  set_name?: string;
  card_number?: string;
  parallel?: string | null;
  is_rookie?: boolean;
  is_autograph?: boolean;
  is_patch?: boolean;
  print_run?: number;
  source: string;
  source_id?: string;
  psa_spec_id?: string;
};

function normalizeText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

export async function findOrCreateCard(fields: CardInput) {
  const supabase = createServiceClient();
  const player = normalizeText(fields.player);

  if (!player) {
    throw new Error('player is required');
  }

  const payload = {
    player,
    year: fields.year ?? null,
    sport: normalizeText(fields.sport),
    manufacturer: normalizeText(fields.manufacturer),
    set_name: normalizeText(fields.set_name),
    card_number: normalizeText(fields.card_number),
    parallel: normalizeText(fields.parallel),
    is_rookie: fields.is_rookie ?? false,
    is_autograph: fields.is_autograph ?? false,
    is_patch: fields.is_patch ?? false,
    is_memorabilia: false,
    print_run: fields.print_run ?? null,
    source: fields.source,
    source_id: normalizeText(fields.source_id),
    psa_spec_id: normalizeText(fields.psa_spec_id),
  };

  const { data, error } = await supabase
    .from('cards')
    .upsert(payload, {
      onConflict: 'player,year,set_name,card_number,parallel',
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`Unable to create card catalog entry: ${error?.message ?? 'unknown error'}`);
  }

  return { id: data.id as string };
}
