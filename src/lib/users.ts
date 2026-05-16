import { createServiceClient } from '@/lib/supabase';

export async function getOrCreateUserId(clerkId: string, email: string | null) {
  const supabase = createServiceClient();

  const { data: existing, error: readError } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_id', clerkId)
    .maybeSingle();

  if (existing?.id) {
    return existing.id as string;
  }

  if (readError) {
    console.error('Unable to read user record', {
      clerkId,
      error: readError.message,
    });
  }

  const { data: inserted, error: insertError } = await supabase
    .from('users')
    .insert({
      clerk_id: clerkId,
      email,
    })
    .select('id')
    .single();

  if (insertError || !inserted?.id) {
    const { data: retry } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_id', clerkId)
      .maybeSingle();

    if (retry?.id) {
      return retry.id as string;
    }

    throw new Error(`Unable to create user record: ${insertError?.message ?? 'unknown error'}`);
  }

  return inserted.id as string;
}
