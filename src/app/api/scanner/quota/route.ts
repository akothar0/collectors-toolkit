import { auth } from '@clerk/nextjs/server';
import { isConfigurationError, scannerErrorResponse } from '@/lib/scanner-api';
import { NextResponse } from 'next/server';
import { getRateLimitStatus } from '@/lib/rate-limit';
import { SCAN_LIMIT } from '@/lib/scanner-limit';
import { createServiceClient } from '@/lib/supabase';

async function getOrCreateUserId(clerkId: string, email: string | null) {
  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_id', clerkId)
    .maybeSingle();

  if (existing?.id) {
    return existing.id as string;
  }

  const { data: inserted, error } = await supabase
    .from('users')
    .insert({
      clerk_id: clerkId,
      email,
    })
    .select('id')
    .single();

  if (error || !inserted?.id) {
    throw new Error(`Unable to create user record: ${error?.message ?? 'unknown error'}`);
  }

  return inserted.id as string;
}

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUserId = await getOrCreateUserId(userId, null);
    const status = await getRateLimitStatus(supabaseUserId, 'scan', SCAN_LIMIT);

    return NextResponse.json({
      remainingScans: status.remaining,
      usedScans: status.used,
      dailyLimit: SCAN_LIMIT,
    });
  } catch (error) {
    if (isConfigurationError(error)) {
      return scannerErrorResponse('Scanner quota is unavailable until Supabase is configured.', 503);
    }

    return scannerErrorResponse(
      error instanceof Error ? error.message : 'Unable to load scan quota.'
    );
  }
}
