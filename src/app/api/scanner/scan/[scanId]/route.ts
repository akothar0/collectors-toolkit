import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { ScanPrefill } from '@/lib/collection';
import { getGradedScanForUser } from '@/lib/scanner-db';
import { getOrCreateUserId } from '@/lib/users';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ scanId: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { scanId } = await context.params;

  if (!scanId?.trim()) {
    return NextResponse.json({ error: 'Scan id is required.' }, { status: 400 });
  }

  const clerkUser = await currentUser();
  const email =
    clerkUser?.emailAddresses.find((item) => item.id === clerkUser.primaryEmailAddressId)?.emailAddress ??
    null;
  const supabaseUserId = await getOrCreateUserId(userId, email);

  const scan = await getGradedScanForUser(supabaseUserId, scanId);

  if (!scan) {
    return NextResponse.json({ error: 'Scan not found.' }, { status: 404 });
  }

  const prefill: ScanPrefill = {
    scanId: scan.scanId,
    cardId: scan.cardId,
    imageUrl: scan.imageUrl?.trim() || null,
    certLookupSuccess: scan.certLookupSuccess,
    player: scan.cardPlayer,
    year: scan.cardYear,
    sport: scan.cardSport,
    setName: scan.cardSet ?? scan.cardManufacturer,
    manufacturer: scan.cardManufacturer,
    cardNumber: scan.cardNumber,
    parallel: scan.cardParallel,
    gradingCompany: scan.gradingCompany,
    grade: scan.officialGrade,
    gradeDescription: scan.gradeDescription,
    certNumber: scan.certNumber,
    popAtGrade: scan.popAtGrade,
    popHigher: scan.popHigher,
  };

  return NextResponse.json(prefill);
}
