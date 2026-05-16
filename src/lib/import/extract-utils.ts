/**
 * Finds the first array value in a JSON object response, regardless of key name.
 *
 * Needed because response_format: json_object forces GPT to wrap arrays in an object.
 * The model may use any key ("items", "purchases", "results", etc.) — this handles all of them.
 */
export function extractFirstArray(parsed: Record<string, unknown>): unknown[] {
  if (Array.isArray(parsed)) return parsed;
  const arrayValue = Object.values(parsed).find(Array.isArray);
  return (arrayValue as unknown[] | undefined) ?? [];
}
