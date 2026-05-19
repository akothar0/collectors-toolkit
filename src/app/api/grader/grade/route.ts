import { auth, currentUser } from '@clerk/nextjs/server';
import { uploadPublicCardImage } from '@/lib/card-image-storage';
import { GRADE_LIMIT, type GradeResult } from '@/lib/grader';
import {
  GRADING_SYSTEM_PROMPT,
  buildGradingUserPrompt,
  parseGraderResponse,
} from '@/lib/grader-prompt';
import { openai } from '@/lib/openai';
import { checkRateLimit, getRateLimitStatus } from '@/lib/rate-limit';
import { isConfigurationError, scannerErrorResponse } from '@/lib/scanner-api';
import { fileToDataUrl } from '@/lib/scanner-image';
import { createServiceClient } from '@/lib/supabase';
import { getOrCreateUserId } from '@/lib/users';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

async function resolveImageUrls(userId: string, file: File): Promise<{ modelInputUrl: string; persistedUrl: string | null }> {
  try {
    const persistedUrl = await uploadPublicCardImage(userId, file);
    return { modelInputUrl: persistedUrl, persistedUrl };
  } catch (error) {
    console.error('Unable to upload grader image to Supabase storage', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { modelInputUrl: await fileToDataUrl(file), persistedUrl: null };
  }
}

export async function POST(req: Request) {
  try {
    return await handleGradeRequest(req);
  } catch (error) {
    console.error('Grader grade request failed', {
      error: error instanceof Error ? error.message : String(error),
    });

    if (isConfigurationError(error)) {
      return scannerErrorResponse(
        'Grader storage is not configured on the server. Check Supabase environment variables.',
        503
      );
    }

    return scannerErrorResponse(
      error instanceof Error ? error.message : 'Unable to grade this card right now.'
    );
  }
}

async function handleGradeRequest(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const clerkUser = await currentUser();
  const email =
    clerkUser?.emailAddresses.find((item) => item.id === clerkUser.primaryEmailAddressId)?.emailAddress ??
    null;

  const supabaseUserId = await getOrCreateUserId(userId, email);
  const allowed = await checkRateLimit(supabaseUserId, 'grade', GRADE_LIMIT);

  if (!allowed) {
    return NextResponse.json(
      { error: 'You have reached your daily grade limit.', remainingGrades: 0 },
      { status: 429 }
    );
  }

  const formData = await req.formData();
  const frontImage = formData.get('frontImage');
  const backImage = formData.get('backImage');
  const surfaceImage = formData.get('surfaceImage');
  const cornerImage = formData.get('cornerImage');

  if (!(frontImage instanceof File) || frontImage.size === 0) {
    return NextResponse.json({ error: 'Please upload a front photo of the card.' }, { status: 400 });
  }

  const imageFiles: File[] = [frontImage];
  if (backImage instanceof File && backImage.size > 0) imageFiles.push(backImage);
  if (surfaceImage instanceof File && surfaceImage.size > 0) imageFiles.push(surfaceImage);
  if (cornerImage instanceof File && cornerImage.size > 0) imageFiles.push(cornerImage);

  const imageCount = imageFiles.length;
  const imageUploads = await Promise.all(imageFiles.map((file) => resolveImageUrls(supabaseUserId, file)));
  const imageUrls = imageUploads.map((upload) => upload.modelInputUrl);

  const frontImageUrl = imageUploads[0]?.persistedUrl ?? null;
  const backImageUrl =
    backImage instanceof File && backImage.size > 0 ? (imageUploads[1]?.persistedUrl ?? null) : null;

  const messages = [
    { role: 'system' as const, content: GRADING_SYSTEM_PROMPT },
    {
      role: 'user' as const,
      content: [
        { type: 'text' as const, text: buildGradingUserPrompt(imageCount) },
        ...imageUrls.map((url) => ({
          type: 'image_url' as const,
          image_url: { url, detail: 'high' as const },
        })),
      ],
    },
  ];

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages,
    response_format: { type: 'json_object' },
    max_tokens: 1000,
  });

  const responseText = completion.choices[0]?.message?.content ?? null;
  const grades = parseGraderResponse(responseText);

  if (!grades) {
    return scannerErrorResponse('Unable to parse grading response from AI.', 502);
  }

  const supabase = createServiceClient();
  const { data: sessionRow, error: insertError } = await supabase
    .from('raw_grade_sessions')
    .insert({
      user_id: supabaseUserId,
      image_url: frontImageUrl,
      front_image_url: frontImageUrl,
      back_image_url: backImageUrl,
      image_count: imageCount,
      predicted_grade: grades.overallGrade,
      sub_centering: grades.centering,
      sub_corners: grades.corners,
      sub_edges: grades.edges,
      sub_surface: grades.surface,
      psa_prediction: grades.psaPrediction,
      bgs_prediction: grades.bgsPrediction,
      cgc_prediction: grades.cgcPrediction,
      confidence: grades.confidence,
      condition_notes: grades.conditionNotes,
      submission_recommended: grades.submissionRecommended,
      submission_company: grades.submissionCompany,
      submission_roi_notes: grades.submissionRoiNotes,
      raw_ai_response: { rawText: responseText, model: 'gpt-4o', imageCount },
    })
    .select('id')
    .single();

  if (insertError) {
    console.error('Unable to persist grade session', {
      error: insertError.message,
    });
    return scannerErrorResponse('Unable to save grade session.', 500);
  }

  const quota = await getRateLimitStatus(supabaseUserId, 'grade', GRADE_LIMIT);

  const result: GradeResult & { remainingGrades: number } = {
    sessionId: sessionRow.id as string,
    frontImageUrl,
    backImageUrl,
    imageCount,
    ...grades,
    remainingGrades: quota.remaining,
  };

  return NextResponse.json(result);
}
