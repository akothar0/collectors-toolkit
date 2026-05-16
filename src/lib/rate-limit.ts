import { createServiceClient } from '@/lib/supabase';

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

export async function checkRateLimit(
  userId: string,
  action: string,
  dailyMax: number
) {
  const supabase = createServiceClient();
  const date = todayUtc();

  const { data: existing, error: readError } = await supabase
    .from('usage_logs')
    .select('count')
    .eq('user_id', userId)
    .eq('action', action)
    .eq('date', date)
    .maybeSingle();

  if (readError) {
    return false;
  }

  const currentCount = existing?.count ?? 0;

  if (currentCount >= dailyMax) {
    return false;
  }

  const nextCount = currentCount + 1;

  if (currentCount === 0) {
    const { error: insertError } = await supabase.from('usage_logs').insert({
      user_id: userId,
      action,
      date,
      count: nextCount,
    });

    return !insertError;
  }

  const { error: updateError } = await supabase
    .from('usage_logs')
    .update({ count: nextCount })
    .eq('user_id', userId)
    .eq('action', action)
    .eq('date', date);

  return !updateError;
}

