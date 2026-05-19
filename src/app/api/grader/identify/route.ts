import { NextResponse } from 'next/server';
import { getAuthenticatedSupabaseUserId } from '@/lib/collection-auth';
import {
  finalizeIdentifiedCard,
  identifyCardFromImages,
  type GraderIdentifiedCardInput,
  persistIdentifiedCardForSession,
} from '@/lib/grader-identify';
import { createServiceClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const maxDuration = 60;

type IdentifyRequest = {
  sessionId?: string;
  identifiedCard?: GraderIdentifiedCardInput | null;
};

export async function POST(req: Request) {
  try {
    const supabaseUserId = await getAuthenticatedSupabaseUserId();
    if (!supabaseUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await req.json()) as IdentifyRequest;
    const sessionId = body.sessionId?.trim();
    if (!sessionId) {
      return NextResponse.json({ error: 'Session id is required.' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('raw_grade_sessions')
      .select('id, card_id, front_image_url, back_image_url, image_url, raw_ai_response')
      .eq('id', sessionId)
      .eq('user_id', supabaseUserId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: 'Grade session not found.' }, { status: 404 });
    }

    const identifiedCard = body.identifiedCard
      ? await finalizeIdentifiedCard({
          sessionId,
          existingCardId: (data.card_id as string | null) ?? null,
          draft: body.identifiedCard,
        })
      : await (async () => {
          const imageUrls = [
            (data.front_image_url as string | null) ?? (data.image_url as string | null) ?? null,
            (data.back_image_url as string | null) ?? null,
          ].filter((value): value is string => Boolean(value));

          if (imageUrls.length === 0) {
            throw new Error('This grader session has no stored images to identify from.');
          }

          return identifyCardFromImages({
            sessionId,
            imageUrls,
            existingCardId: (data.card_id as string | null) ?? null,
          });
        })();

    await persistIdentifiedCardForSession({
      sessionId,
      userId: supabaseUserId,
      identifiedCard,
      rawAiResponse: data.raw_ai_response,
    });

    return NextResponse.json({ identifiedCard });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to identify this card.' },
      { status: 500 }
    );
  }
}
