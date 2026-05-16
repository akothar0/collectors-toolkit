import { auth } from '@clerk/nextjs/server';
import { GRADE_LIMIT } from '@/lib/grader';
import { isConfigurationError, scannerErrorResponse } from '@/lib/scanner-api';
import { NextResponse } from 'next/server';
import { getRateLimitStatus } from '@/lib/rate-limit';
import { getOrCreateUserId } from '@/lib/users';

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUserId = await getOrCreateUserId(userId, null);
    const status = await getRateLimitStatus(supabaseUserId, 'grade', GRADE_LIMIT);

    return NextResponse.json({
      remainingGrades: status.remaining,
      usedGrades: status.used,
      dailyLimit: GRADE_LIMIT,
    });
  } catch (error) {
    if (isConfigurationError(error)) {
      return scannerErrorResponse('Grader quota is unavailable until Supabase is configured.', 503);
    }

    return scannerErrorResponse(
      error instanceof Error ? error.message : 'Unable to load grader quota.'
    );
  }
}
