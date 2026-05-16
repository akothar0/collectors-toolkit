import { createServiceClient } from '@/lib/supabase';

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

export async function getRateLimitStatus(
  userId: string,
  action: string,
  dailyMax: number
) {
  const supabase = createServiceClient();
  const date = todayUtc();

  const { data: existing, error } = await supabase
    .from('usage_logs')
    .select('count')
    .eq('user_id', userId)
    .eq('action', action)
    .eq('date', date)
    .maybeSingle();

  if (error) {
    return {
      allowed: false,
      used: 0,
      remaining: 0,
      error,
    };
  }

  const used = existing?.count ?? 0;
  const remaining = Math.max(dailyMax - used, 0);

  return {
    allowed: used < dailyMax,
    used,
    remaining,
  };
}

export async function checkRateLimit(
  userId: string,
  action: string,
  dailyMax: number
) {
  const supabase = createServiceClient();
  const date = todayUtc();
  const status = await getRateLimitStatus(userId, action, dailyMax);

  if (!status.allowed) {
    return false;
  }

  const nextCount = status.used + 1;

  if (status.used === 0) {
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
