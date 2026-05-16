import { NextResponse } from 'next/server';

export function scannerErrorResponse(message: string, status = 500, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export function isConfigurationError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return /is not configured/i.test(error.message);
}
