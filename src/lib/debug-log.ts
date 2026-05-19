/** Session debug logging (NDJSON ingest). Do not log secrets. */
export function debugLog(
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisId: string
) {
  // #region agent log
  fetch('http://127.0.0.1:7274/ingest/c0a1f3a8-8163-44c5-9171-6cc76856d3a3', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '3130b7' },
    body: JSON.stringify({
      sessionId: '3130b7',
      location,
      message,
      data,
      hypothesisId,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
}
