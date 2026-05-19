import { createServiceClient } from '@/lib/supabase';

export type GradeSessionListItem = {
  sessionId: string;
  imageUrl: string;
  createdAt: string;
  predictedGrade: number | null;
  psaPrediction: number | null;
  confidence: string | null;
  savedToCollection: boolean;
};

export async function listRawGradeSessionsForUser(
  userId: string
): Promise<GradeSessionListItem[]> {
  const supabase = createServiceClient();
  const { data: rows, error } = await supabase
    .from('raw_grade_sessions')
    .select('id, image_url, front_image_url, created_at, predicted_grade, psa_prediction, confidence')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error || !rows) {
    return [];
  }

  const sessionIds = rows.map((row) => row.id as string);
  const { data: collectionRows } = await supabase
    .from('collection_cards')
    .select('id, grade_session_id')
    .in(
      'grade_session_id',
      sessionIds.length > 0 ? sessionIds : ['00000000-0000-0000-0000-000000000000']
    );

  const savedSessions = new Set(
    (collectionRows ?? []).map((row) => row.grade_session_id as string)
  );

  return rows.map((row) => ({
    sessionId: row.id as string,
    imageUrl: (row.front_image_url as string | null) ?? (row.image_url as string | null) ?? '',
    createdAt: row.created_at as string,
    predictedGrade: row.predicted_grade != null ? Number(row.predicted_grade) : null,
    psaPrediction: row.psa_prediction != null ? Number(row.psa_prediction) : null,
    confidence: (row.confidence as string | null) ?? null,
    savedToCollection: savedSessions.has(row.id as string),
  }));
}
