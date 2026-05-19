import { auth, currentUser } from '@clerk/nextjs/server';
import { fetchPortfolioSummary } from '@/lib/portfolio-server';
import { getOrCreateUserId } from '@/lib/users';
import { NextResponse } from 'next/server';

export const revalidate = 60;

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses[0]?.emailAddress ?? null;

  try {
    const supabaseUserId = await getOrCreateUserId(userId, email);
    const summary = await fetchPortfolioSummary(supabaseUserId);
    return NextResponse.json(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load portfolio.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
