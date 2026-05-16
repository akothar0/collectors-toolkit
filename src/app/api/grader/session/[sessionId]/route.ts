import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { GraderSessionPrefill } from '@/lib/collection';
import { createServiceClient } from '@/lib/supabase';
import { getOrCreateUserId } from '@/lib/users';

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { sessionId } = await context.params;

  if (!sessionId?.trim()) {
    return NextResponse.json({ error: 'Session id is required.' }, { status: 400 });
  }

  const clerkUser = await currentUser();
  const email =
    clerkUser?.emailAddresses.find((item) => item.id === clerkUser.primaryEmailAddressId)?.emailAddress ??
    null;
  const supabaseUserId = await getOrCreateUserId(userId, email);

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('raw_grade_sessions')
    .select(
      'id, front_image_url, image_url, sub_centering, sub_corners, sub_edges, sub_surface, condition_notes, psa_prediction, bgs_prediction, cgc_prediction, image_count'
    )
    .eq('id', sessionId)
    .eq('user_id', supabaseUserId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Grade session not found.' }, { status: 404 });
  }

  const subGrades =
    data.sub_centering != null ||
    data.sub_corners != null ||
    data.sub_edges != null ||
    data.sub_surface != null
      ? {
          centering: data.sub_centering != null ? Number(data.sub_centering) : undefined,
          corners: data.sub_corners != null ? Number(data.sub_corners) : undefined,
          edges: data.sub_edges != null ? Number(data.sub_edges) : undefined,
          surface: data.sub_surface != null ? Number(data.sub_surface) : undefined,
        }
      : null;

  const prefill: GraderSessionPrefill = {
    sessionId: data.id as string,
    frontImageUrl: (data.front_image_url as string | null) ?? (data.image_url as string | null),
    subGrades,
    conditionNotes: (data.condition_notes as string | null) ?? null,
    psaPrediction: data.psa_prediction != null ? Number(data.psa_prediction) : null,
    bgsPrediction: data.bgs_prediction != null ? Number(data.bgs_prediction) : null,
    cgcPrediction: data.cgc_prediction != null ? Number(data.cgc_prediction) : null,
    imageCount: (data.image_count as number | null) ?? 1,
  };

  return NextResponse.json(prefill);
}
