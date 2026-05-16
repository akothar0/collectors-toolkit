import { auth, currentUser } from '@clerk/nextjs/server';
import { findOrCreateCard } from '@/lib/card-catalog';
import { lookupPSACert } from '@/lib/cert-lookup/psa';
import { checkRateLimit, getRateLimitStatus } from '@/lib/rate-limit';
import { fileToDataUrl, resolveStoredScanImageUrl } from '@/lib/scanner-image';
import { SCAN_LIMIT } from '@/lib/scanner-limit';
import { createServiceClient } from '@/lib/supabase';
import { inferConfidence, parseScannerOcrResponse } from '@/lib/scanner-ocr';
import type { OcrConfidence, OcrGradingCompany, ScannerResult } from '@/lib/scanner';
import { isConfigurationError, scannerErrorResponse } from '@/lib/scanner-api';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

async function getOrCreateUserId(clerkId: string, email: string | null) {
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

async function uploadScanImage(userId: string, imageFile: File) {
  const supabase = createServiceClient();
  const extension = imageFile.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const path = `${userId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const bytes = await imageFile.arrayBuffer();

  const { error } = await supabase.storage
    .from('card-images')
    .upload(path, bytes, {
      contentType: imageFile.type || 'image/jpeg',
      upsert: false,
    });

  if (error) {
    throw new Error(`Unable to upload image: ${error.message}`);
  }

  const { data } = supabase.storage.from('card-images').getPublicUrl(path);
  return data.publicUrl;
}

async function callSlabOcr(imageUrl: string) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured.');
  }

  const prompt =
    'This is a photo of a graded sports card in a protective case (slab). Look at the label on the slab and extract: (1) the certification number (cert number) — usually a 7-9 digit number, (2) the grading company — one of PSA, BGS, SGC, or CGC. Return ONLY a JSON object: { certNumber: string | null, gradingCompany: \'PSA\' | \'BGS\' | \'SGC\' | \'CGC\' | \'UNKNOWN\' } If you cannot read the cert number clearly, return certNumber as null.';

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      input: [
        {
          role: 'user',
          content: [
            { type: 'input_text', text: prompt },
            {
              type: 'input_image',
              image_url: imageUrl,
              detail: 'high',
            },
          ],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'slab_ocr',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              certNumber: { anyOf: [{ type: 'string' }, { type: 'null' }] },
              gradingCompany: {
                type: 'string',
                enum: ['PSA', 'BGS', 'SGC', 'CGC', 'UNKNOWN'],
              },
            },
            required: ['certNumber', 'gradingCompany'],
          },
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI Responses API returned ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

type ScanRowPayload = Partial<ScannerResult> & {
  imageUrl: string;
  rawCertResponse?: unknown;
};

async function insertScanRow(userId: string, payload: ScanRowPayload) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('graded_scans')
    .insert({
      user_id: userId,
      image_url: payload.imageUrl,
      ocr_cert_number: payload.ocrCertNumber ?? null,
      ocr_grading_company: payload.ocrGradingCompany ?? null,
      ocr_confidence: payload.ocrConfidence ?? 'low',
      cert_number: payload.certNumber ?? null,
      grading_company: payload.gradingCompany ?? null,
      card_id: payload.cardId ?? null,
      official_grade: payload.officialGrade ?? null,
      grade_description: payload.gradeDescription ?? null,
      qualifier_code: payload.qualifierCode ?? null,
      autograph_grade: payload.autographGrade ?? null,
      pop_at_grade: payload.popAtGrade ?? null,
      pop_with_qualifier: payload.popWithQualifier ?? null,
      pop_higher: payload.popHigher ?? null,
      is_dual_cert: payload.isDualCert ?? false,
      item_status: payload.itemStatus ?? null,
      lookup_source: payload.certLookupSuccess ? 'psa_api' : 'ocr',
      raw_cert_response: payload.rawCertResponse ?? (payload.error ? { error: payload.error } : null),
    })
    .select('id')
    .single();

  if (error || !data?.id) {
    throw new Error(`Unable to insert scan row: ${error?.message ?? 'unknown error'}`);
  }

  return data.id as string;
}

async function updateScanRow(scanId: string, payload: ScanRowPayload) {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from('graded_scans')
    .update({
      image_url: payload.imageUrl,
      ocr_cert_number: payload.ocrCertNumber ?? null,
      ocr_grading_company: payload.ocrGradingCompany ?? null,
      ocr_confidence: payload.ocrConfidence ?? 'low',
      cert_number: payload.certNumber ?? null,
      grading_company: payload.gradingCompany ?? null,
      card_id: payload.cardId ?? null,
      official_grade: payload.officialGrade ?? null,
      grade_description: payload.gradeDescription ?? null,
      qualifier_code: payload.qualifierCode ?? null,
      autograph_grade: payload.autographGrade ?? null,
      pop_at_grade: payload.popAtGrade ?? null,
      pop_with_qualifier: payload.popWithQualifier ?? null,
      pop_higher: payload.popHigher ?? null,
      is_dual_cert: payload.isDualCert ?? false,
      item_status: payload.itemStatus ?? null,
      lookup_source: payload.certLookupSuccess ? 'psa_api' : 'ocr',
      raw_cert_response: payload.rawCertResponse ?? null,
      pop_captured_at: payload.certLookupSuccess ? new Date().toISOString() : null,
    })
    .eq('id', scanId);

  if (error) {
    throw new Error(`Unable to update scan row: ${error.message}`);
  }
}

export async function POST(req: Request) {
  try {
    return await handleScanRequest(req);
  } catch (error) {
    console.error('Scanner scan request failed', {
      error: error instanceof Error ? error.message : String(error),
    });

    if (isConfigurationError(error)) {
      return scannerErrorResponse(
        'Scanner storage is not configured on the server. Check Supabase environment variables in Vercel.',
        503
      );
    }

    return scannerErrorResponse(
      error instanceof Error ? error.message : 'Unable to scan this slab right now.'
    );
  }
}

async function handleScanRequest(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses.find((item) => item.id === clerkUser.primaryEmailAddressId)?.emailAddress ?? null;

  const supabaseUserId = await getOrCreateUserId(userId, email);
  const allowed = await checkRateLimit(supabaseUserId, 'scan', SCAN_LIMIT);

  if (!allowed) {
    return NextResponse.json(
      { error: 'You have reached your daily scan limit.', remaining: 0 },
      { status: 429 }
    );
  }

  const formData = await req.formData();
  const imageField = formData.get('image');
  const manualCertNumber = formData.get('manualCertNumber');
  const imageUrlFromClient = formData.get('imageUrl');

  const manualCert = typeof manualCertNumber === 'string' ? manualCertNumber.trim() : '';
  const fallbackImageUrl = typeof imageUrlFromClient === 'string' && imageUrlFromClient.trim() ? imageUrlFromClient.trim() : '';

  let uploadedImageUrl = fallbackImageUrl || '';
  let openAiImageUrl = fallbackImageUrl || '';
  let ocrCertNumber: string | null = null;
  let ocrGradingCompany: OcrGradingCompany | null = null;
  let ocrConfidence: OcrConfidence = 'low';
  let rawCertResponse: Record<string, unknown> | null = null;

  if (imageField instanceof File && imageField.size > 0) {
    try {
      uploadedImageUrl = await uploadScanImage(supabaseUserId, imageField);
      openAiImageUrl = uploadedImageUrl;
    } catch (error) {
      console.error('Unable to upload image to Supabase storage', {
        error: error instanceof Error ? error.message : String(error),
      });

      openAiImageUrl = await fileToDataUrl(imageField);
    }

    uploadedImageUrl = resolveStoredScanImageUrl(uploadedImageUrl, fallbackImageUrl);

    try {
      const response = await callSlabOcr(openAiImageUrl);
      const parsed = parseScannerOcrResponse(response);
      if (parsed) {
        ocrCertNumber = parsed.certNumber;
        ocrGradingCompany = parsed.gradingCompany;
        ocrConfidence = inferConfidence(ocrCertNumber, ocrGradingCompany);
        rawCertResponse = {
          openai: parsed,
        };
      }
    } catch (error) {
      console.error('OpenAI slab OCR failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  } else if (manualCert) {
    uploadedImageUrl = fallbackImageUrl;
  } else {
    return NextResponse.json({ error: 'Please upload a slab photo or enter a cert number.' }, { status: 400 });
  }

  const initialResult: ScannerResult = {
    scanId: '',
    imageUrl: uploadedImageUrl,
    ocrCertNumber,
    ocrGradingCompany,
    ocrConfidence,
    certLookupSuccess: false,
    certNumber: manualCert || ocrCertNumber,
    gradingCompany: ocrGradingCompany,
    itemStatus: null,
    cardId: null,
    cardPlayer: null,
    cardYear: null,
    cardManufacturer: null,
    cardSport: null,
    cardSet: null,
    cardParallel: null,
    cardNumber: null,
    officialGrade: null,
    gradeDescription: null,
    qualifierCode: null,
    autographGrade: null,
    isDualCert: false,
    popAtGrade: null,
    popWithQualifier: null,
    popHigher: null,
  };

  let scanId = '';
  try {
    scanId = await insertScanRow(supabaseUserId, initialResult);
  } catch (error) {
    console.error('Unable to persist scan row', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  let finalResult: ScannerResult = {
    ...initialResult,
    scanId,
  };

  if (!scanId) {
    finalResult = {
      ...finalResult,
      error: 'Scan completed, but we could not save this attempt to your history. You can still review the results below.',
    };
  }

  const lookupCertNumber = manualCert || ocrCertNumber;
  const lookupAllowed = lookupCertNumber && (manualCert || ocrGradingCompany === 'PSA');

  if (lookupAllowed) {
    const psaResult = await lookupPSACert(lookupCertNumber);

    if (psaResult) {
      finalResult = {
        ...finalResult,
        certLookupSuccess: true,
        certNumber: psaResult.certNumber,
        gradingCompany: 'PSA',
        itemStatus: 'Y',
        cardPlayer: psaResult.player,
        cardYear: psaResult.year,
        cardManufacturer: psaResult.manufacturer,
        cardSport: psaResult.sport,
        cardSet: null,
        cardParallel: psaResult.parallel,
        cardNumber: psaResult.cardNumber,
        officialGrade: psaResult.grade,
        gradeDescription: psaResult.gradeDescription,
        qualifierCode: psaResult.qualifierCode,
        autographGrade: psaResult.autographGrade,
        isDualCert: psaResult.isDualCert,
        popAtGrade: psaResult.popAtGrade,
        popWithQualifier: psaResult.popWithQualifier,
        popHigher: psaResult.popHigher,
      };

      try {
        const card = await findOrCreateCard({
          player: psaResult.player,
          year: psaResult.year,
          manufacturer: psaResult.manufacturer,
          sport: psaResult.sport,
          card_number: psaResult.cardNumber,
          parallel: psaResult.parallel,
          psa_spec_id: psaResult.psaSpecId,
          source: 'psa_api',
          source_id: psaResult.certNumber,
        });

        finalResult = {
          ...finalResult,
          cardId: card.id,
        };

        rawCertResponse = {
          ...rawCertResponse,
          psa: psaResult,
        };
      } catch (error) {
        console.error('Card catalog sync failed', {
          error: error instanceof Error ? error.message : String(error),
        });
        finalResult = {
          ...finalResult,
          error: 'We found the PSA cert, but could not save the card details. You can still save manually.',
        };
      }
    } else {
      finalResult = {
        ...finalResult,
        error: lookupCertNumber
          ? 'Cert lookup unavailable. Enter card details to save manually.'
          : 'We could not read the cert number. Try again with a clearer photo or enter it manually.',
      };
    }
  } else if (ocrCertNumber) {
    finalResult = {
      ...finalResult,
      error: 'This scanner currently verifies PSA slabs only. Enter the cert number manually if you want to try again.',
    };
  } else {
    finalResult = {
      ...finalResult,
      error: 'We could not read the slab label. Try again or enter the cert number manually.',
    };
  }

  if (scanId) {
    try {
      await updateScanRow(scanId, {
        ...finalResult,
        rawCertResponse,
      });
    } catch (error) {
      console.error('Unable to finalize scan row', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const quota = await getRateLimitStatus(supabaseUserId, 'scan', SCAN_LIMIT);

  return NextResponse.json({
    ...finalResult,
    scanId,
    remainingScans: quota.remaining,
  });
}
