import { auth, currentUser } from '@clerk/nextjs/server';
import { findOrCreateCard } from '@/lib/card-catalog';
import { uploadPublicCardImage } from '@/lib/card-image-storage';
import type { CertLookupResult } from '@/lib/cert-lookup/types';
import { lookupCertWithStatus, normalizeLookupGradingCompany } from '@/lib/cert-lookup/index';
import { isPlausibleCertNumber, normalizeCertNumber } from '@/lib/cert-number';
import { readSlabLabel } from '@/lib/slab-ocr';
import { checkRateLimit, getRateLimitStatus } from '@/lib/rate-limit';
import { fileToDataUrl, resolveStoredScanImageUrl } from '@/lib/scanner-image';
import { SCAN_LIMIT } from '@/lib/scanner-limit';
import { createServiceClient } from '@/lib/supabase';
import { inferConfidence, normalizeGradingCompany } from '@/lib/scanner-ocr';
import type { LookupSource, OcrConfidence, OcrGradingCompany, ScannerResult } from '@/lib/scanner';
import { isConfigurationError, scannerErrorResponse } from '@/lib/scanner-api';
import { getOrCreateUserId } from '@/lib/users';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

type ScanRowPayload = Partial<ScannerResult> & {
  imageUrl: string;
  rawCertResponse?: unknown;
};

function resolveLookupSource(payload: ScanRowPayload): LookupSource {
  if (payload.certLookupSuccess && payload.lookupSource) {
    return payload.lookupSource;
  }

  if (payload.certNumber && payload.error) {
    return 'failed';
  }

  return 'ocr';
}

async function getSavedCollectionForScan(scanId: string) {
  if (!scanId) {
    return { savedToCollection: false, collectionCardId: null as string | null };
  }

  const supabase = createServiceClient();
  const { data } = await supabase
    .from('collection_cards')
    .select('id')
    .eq('scan_id', scanId)
    .maybeSingle();

  return {
    savedToCollection: Boolean(data?.id),
    collectionCardId: (data?.id as string | undefined) ?? null,
  };
}

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
      lookup_source: resolveLookupSource(payload),
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
      lookup_source: resolveLookupSource(payload),
      raw_cert_response: payload.rawCertResponse ?? null,
      pop_captured_at: payload.certLookupSuccess ? new Date().toISOString() : null,
    })
    .eq('id', scanId);

  if (error) {
    throw new Error(`Unable to update scan row: ${error.message}`);
  }
}

function certLookupRawKey(source: CertLookupResult['source']) {
  if (source === 'psa_api') {
    return 'psa';
  }

  if (source === 'beckett_scrape') {
    return 'bgs';
  }

  if (source === 'sgc_scrape') {
    return 'sgc';
  }

  return 'cardgrade';
}

function applyCertLookup(
  base: ScannerResult,
  lookup: CertLookupResult
): { result: ScannerResult; rawCertResponse: Record<string, unknown> } {
  const company =
    lookup.source === 'psa_api'
      ? 'PSA'
      : lookup.source === 'beckett_scrape'
        ? 'BGS'
        : lookup.source === 'sgc_scrape'
          ? 'SGC'
          : normalizeLookupGradingCompany(base.gradingCompany ?? 'PSA');

  const result: ScannerResult = {
    ...base,
    certLookupSuccess: true,
    ocrConfidence: 'high',
    certNumber: lookup.certNumber,
    gradingCompany: company,
    lookupSource: lookup.source,
    itemStatus: lookup.source === 'psa_api' ? 'Y' : null,
    cardPlayer: lookup.player,
    cardYear: lookup.year,
    cardManufacturer: lookup.manufacturer ?? lookup.setName,
    cardSport: lookup.sport ?? null,
    cardSet: lookup.setName ?? lookup.manufacturer ?? null,
    cardParallel: lookup.parallel,
    cardNumber: lookup.cardNumber,
    officialGrade: lookup.grade,
    gradeDescription: lookup.gradeDescription,
    qualifierCode: lookup.qualifierCode ?? null,
    autographGrade: lookup.autographGrade ?? null,
    subGrades: lookup.subGrades ?? null,
    isDualCert: lookup.isDualCert ?? false,
    popAtGrade: lookup.popAtGrade ?? null,
    popWithQualifier: lookup.popWithQualifier ?? null,
    popHigher: lookup.popHigher ?? null,
    error: undefined,
  };

  const rawCertResponse: Record<string, unknown> = {
    lookup,
    [certLookupRawKey(lookup.source)]: lookup,
  };

  return { result, rawCertResponse };
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
  const manualGradingCompanyField = formData.get('manualGradingCompany');
  const imageUrlFromClient = formData.get('imageUrl');

  const manualCert = normalizeCertNumber(
    typeof manualCertNumber === 'string' ? manualCertNumber.trim() : ''
  ) ?? '';
  const manualGradingCompany =
    typeof manualGradingCompanyField === 'string' && manualGradingCompanyField.trim()
      ? normalizeGradingCompany(manualGradingCompanyField)
      : null;
  const fallbackImageUrl =
    typeof imageUrlFromClient === 'string' ? resolveStoredScanImageUrl(imageUrlFromClient) : '';

  let uploadedImageUrl = fallbackImageUrl || '';
  let openAiImageUrl = fallbackImageUrl || '';
  let ocrCertNumber: string | null = null;
  let ocrGradingCompany: OcrGradingCompany | null = null;
  let ocrConfidence: OcrConfidence = 'low';
  let rawCertResponse: Record<string, unknown> | null = null;

  if (imageField instanceof File && imageField.size > 0) {
    try {
      uploadedImageUrl = await uploadPublicCardImage(supabaseUserId, imageField);
      openAiImageUrl = uploadedImageUrl;
    } catch (error) {
      console.error('Unable to upload image to Supabase storage', {
        error: error instanceof Error ? error.message : String(error),
      });

      openAiImageUrl = await fileToDataUrl(imageField);
    }

    uploadedImageUrl = resolveStoredScanImageUrl(uploadedImageUrl);

    try {
      const parsed = await readSlabLabel(openAiImageUrl);
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

  const resolvedGradingCompany =
    manualGradingCompany && manualGradingCompany !== 'UNKNOWN'
      ? manualGradingCompany
      : ocrGradingCompany && ocrGradingCompany !== 'UNKNOWN'
        ? ocrGradingCompany
        : manualCert
          ? 'PSA'
          : ocrGradingCompany;

  const initialResult: ScannerResult = {
    scanId: '',
    imageUrl: uploadedImageUrl,
    ocrCertNumber,
    ocrGradingCompany,
    ocrConfidence,
    certLookupSuccess: false,
    certNumber: manualCert || ocrCertNumber,
    gradingCompany: resolvedGradingCompany,
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

  const lookupCertNumber =
    manualCert ||
    (ocrCertNumber && isPlausibleCertNumber(ocrCertNumber) ? ocrCertNumber : null);

  const lookupCompany = normalizeLookupGradingCompany(
    manualGradingCompany && manualGradingCompany !== 'UNKNOWN'
      ? manualGradingCompany
      : resolvedGradingCompany ?? 'PSA'
  );

  if (lookupCertNumber && lookupCompany !== 'CGC' && lookupCompany !== 'SGC') {
    const lookupOutcome = await lookupCertWithStatus(lookupCertNumber, lookupCompany);

    if (lookupOutcome.ok) {
      const { result: mapped, rawCertResponse: lookupRaw } = applyCertLookup(finalResult, lookupOutcome.result);
      finalResult = mapped;
      rawCertResponse = {
        ...(rawCertResponse ?? {}),
        ...lookupRaw,
        fromCache: lookupOutcome.fromCache,
      };

      try {
        const card = await findOrCreateCard({
          player: lookupOutcome.result.player,
          year: lookupOutcome.result.year ?? undefined,
          manufacturer: lookupOutcome.result.manufacturer ?? lookupOutcome.result.setName ?? undefined,
          set_name: lookupOutcome.result.setName ?? undefined,
          sport: lookupOutcome.result.sport ?? undefined,
          card_number: lookupOutcome.result.cardNumber ?? undefined,
          parallel: lookupOutcome.result.parallel,
          psa_spec_id: lookupOutcome.result.psaSpecId ?? undefined,
          source: lookupOutcome.result.source,
          source_id: lookupOutcome.result.certNumber,
        });

        finalResult = {
          ...finalResult,
          cardId: card.id,
        };
      } catch (error) {
        console.error('Card catalog sync failed', {
          error: error instanceof Error ? error.message : String(error),
        });
        finalResult = {
          ...finalResult,
          error: 'We found the cert, but could not save the card details. You can still save manually.',
        };
      }
    } else {
      finalResult = {
        ...finalResult,
        gradingCompany: lookupCompany,
        error: lookupOutcome.error.message,
        lookupSource: 'failed',
      };
    }
  } else if (!ocrCertNumber && !manualCert) {
    finalResult = {
      ...finalResult,
      error: 'We could not read a cert number from the label. Enter your cert number below.',
    };
  } else if (lookupCompany === 'CGC') {
    finalResult = {
      ...finalResult,
      error: 'CGC cert lookup is not available yet. You can still save this scan manually after entering details.',
    };
  } else if (lookupCompany === 'SGC') {
    finalResult = {
      ...finalResult,
      error:
        'SGC cert lookup is not supported. We read your cert number from the label — verify on gosgc.com and save this scan manually.',
    };
  } else if (ocrCertNumber && !isPlausibleCertNumber(ocrCertNumber)) {
    finalResult = {
      ...finalResult,
      error: 'We read a number that does not look like a cert. Enter the full cert number below.',
    };
  }

  if (scanId) {
    try {
      await updateScanRow(scanId, {
        ...finalResult,
        imageUrl: uploadedImageUrl,
        rawCertResponse,
      });
    } catch (error) {
      console.error('Unable to finalize scan row', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const saved = await getSavedCollectionForScan(scanId);
  const quota = await getRateLimitStatus(supabaseUserId, 'scan', SCAN_LIMIT);

  return NextResponse.json({
    ...finalResult,
    scanId,
    ...saved,
    remainingScans: quota.remaining,
  });
}
