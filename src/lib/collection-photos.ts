import { createServiceClient } from '@/lib/supabase';

export const COLLECTION_CARD_PHOTO_LIMIT = 10;
const LEGACY_COLLECTION_CARD_PHOTO_LIMIT = 2;

export type CollectionPhoto = {
  id: string;
  imageUrl: string;
  position: number;
};

type CollectionPhotoRow = {
  id: string;
  image_url: string;
  position: number;
  created_at?: string | null;
};

type SupabaseClient = ReturnType<typeof createServiceClient>;

function isCollectionPhotoTableUnavailable(message: string) {
  return /collection_card_images|schema cache/i.test(message);
}

function comparePhotoRows(left: CollectionPhotoRow, right: CollectionPhotoRow) {
  if (left.position !== right.position) {
    return left.position - right.position;
  }

  const leftCreatedAt = left.created_at ?? '';
  const rightCreatedAt = right.created_at ?? '';
  if (leftCreatedAt !== rightCreatedAt) {
    return leftCreatedAt.localeCompare(rightCreatedAt);
  }

  return left.id.localeCompare(right.id);
}

export function mapCollectionPhotoRows(rows: CollectionPhotoRow[] | null | undefined): CollectionPhoto[] {
  return [...(rows ?? [])]
    .sort(comparePhotoRows)
    .map((row, index) => ({
      id: row.id,
      imageUrl: row.image_url,
      position: Number.isFinite(row.position) ? row.position : index,
    }));
}

export function buildLegacyPhotoUrls(frontImageUrl: string | null, backImageUrl: string | null) {
  return [frontImageUrl, backImageUrl].filter((value): value is string => Boolean(value?.trim()));
}

function mapLegacyPhotoUrls(frontImageUrl: string | null, backImageUrl: string | null): CollectionPhoto[] {
  return buildLegacyPhotoUrls(frontImageUrl, backImageUrl).map((imageUrl, index) => ({
    id: `legacy-${index}`,
    imageUrl,
    position: index,
  }));
}

async function loadLegacyCollectionCardPhotos(
  supabase: SupabaseClient,
  collectionCardId: string,
  userId: string
) {
  const { data, error } = await supabase
    .from('collection_cards')
    .select('front_image_url, back_image_url')
    .eq('id', collectionCardId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load collection photos: ${error.message}`);
  }

  return mapLegacyPhotoUrls(
    (data?.front_image_url as string | null | undefined) ?? null,
    (data?.back_image_url as string | null | undefined) ?? null
  );
}

async function replaceLegacyCollectionCardPhotos(
  supabase: SupabaseClient,
  collectionCardId: string,
  userId: string,
  imageUrls: string[]
) {
  const trimmedUrls = imageUrls.map((url) => url.trim()).filter(Boolean);
  if (trimmedUrls.length > LEGACY_COLLECTION_CARD_PHOTO_LIMIT) {
    throw new Error(
      'Multi-photo gallery storage is not available yet for this database. Apply the latest Supabase migrations to save more than 2 photos.'
    );
  }

  const { error } = await supabase
    .from('collection_cards')
    .update({
      front_image_url: trimmedUrls[0] ?? null,
      back_image_url: trimmedUrls[1] ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', collectionCardId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Unable to replace collection photos: ${error.message}`);
  }
}

export async function listCollectionCardPhotos(
  supabase: SupabaseClient,
  collectionCardId: string,
  userId: string
) {
  const { data, error } = await supabase
    .from('collection_card_images')
    .select('id, image_url, position, created_at')
    .eq('collection_card_id', collectionCardId)
    .eq('user_id', userId);

  if (error) {
    if (isCollectionPhotoTableUnavailable(error.message)) {
      return loadLegacyCollectionCardPhotos(supabase, collectionCardId, userId);
    }
    throw new Error(`Unable to load collection photos: ${error.message}`);
  }

  return mapCollectionPhotoRows((data ?? []) as CollectionPhotoRow[]);
}

export async function replaceCollectionCardPhotos(
  supabase: SupabaseClient,
  collectionCardId: string,
  userId: string,
  imageUrls: string[]
) {
  const trimmedUrls = imageUrls.map((url) => url.trim()).filter(Boolean);

  if (trimmedUrls.length > COLLECTION_CARD_PHOTO_LIMIT) {
    throw new Error(`You can upload up to ${COLLECTION_CARD_PHOTO_LIMIT} photos per card.`);
  }

  const { error: deleteError } = await supabase
    .from('collection_card_images')
    .delete()
    .eq('collection_card_id', collectionCardId)
    .eq('user_id', userId);

  if (deleteError) {
    if (isCollectionPhotoTableUnavailable(deleteError.message)) {
      return replaceLegacyCollectionCardPhotos(supabase, collectionCardId, userId, trimmedUrls);
    }
    throw new Error(`Unable to replace collection photos: ${deleteError.message}`);
  }

  if (trimmedUrls.length > 0) {
    const { error: insertError } = await supabase.from('collection_card_images').insert(
      trimmedUrls.map((imageUrl, index) => ({
        collection_card_id: collectionCardId,
        user_id: userId,
        image_url: imageUrl,
        position: index,
      }))
    );

    if (insertError) {
      if (isCollectionPhotoTableUnavailable(insertError.message)) {
        return replaceLegacyCollectionCardPhotos(supabase, collectionCardId, userId, trimmedUrls);
      }
      throw new Error(`Unable to replace collection photos: ${insertError.message}`);
    }
  }

  await syncCollectionCardPhotoCover(supabase, collectionCardId, userId);
}

export async function appendCollectionCardPhotos(
  supabase: SupabaseClient,
  collectionCardId: string,
  userId: string,
  imageUrls: string[]
) {
  const existingPhotos = await listCollectionCardPhotos(supabase, collectionCardId, userId);
  const trimmedUrls = imageUrls.map((url) => url.trim()).filter(Boolean);

  if (trimmedUrls.length === 0) {
    return existingPhotos;
  }

  if (existingPhotos.length + trimmedUrls.length > COLLECTION_CARD_PHOTO_LIMIT) {
    throw new Error(`You can upload up to ${COLLECTION_CARD_PHOTO_LIMIT} photos per card.`);
  }

  if (existingPhotos.some((photo) => photo.id.startsWith('legacy-'))) {
    const combinedUrls = [...existingPhotos.map((photo) => photo.imageUrl), ...trimmedUrls];
    await replaceLegacyCollectionCardPhotos(supabase, collectionCardId, userId, combinedUrls);
    return listCollectionCardPhotos(supabase, collectionCardId, userId);
  }

  const startPosition = existingPhotos.length;
  const { error } = await supabase.from('collection_card_images').insert(
    trimmedUrls.map((imageUrl, index) => ({
      collection_card_id: collectionCardId,
      user_id: userId,
      image_url: imageUrl,
      position: startPosition + index,
    }))
  );

  if (error) {
    if (isCollectionPhotoTableUnavailable(error.message)) {
      const combinedUrls = [...existingPhotos.map((photo) => photo.imageUrl), ...trimmedUrls];
      await replaceLegacyCollectionCardPhotos(supabase, collectionCardId, userId, combinedUrls);
      return listCollectionCardPhotos(supabase, collectionCardId, userId);
    }
    throw new Error(`Unable to add collection photos: ${error.message}`);
  }

  await syncCollectionCardPhotoCover(supabase, collectionCardId, userId);
  return listCollectionCardPhotos(supabase, collectionCardId, userId);
}

export async function removeCollectionCardPhotos(
  supabase: SupabaseClient,
  collectionCardId: string,
  userId: string,
  photoIds: string[]
) {
  const ids = photoIds.map((id) => id.trim()).filter(Boolean);
  if (ids.length === 0) {
    return listCollectionCardPhotos(supabase, collectionCardId, userId);
  }

  const existingPhotos = await listCollectionCardPhotos(supabase, collectionCardId, userId);
  if (existingPhotos.some((photo) => photo.id.startsWith('legacy-'))) {
    const remainingUrls = existingPhotos
      .filter((photo) => !ids.includes(photo.id))
      .map((photo) => photo.imageUrl);
    await replaceLegacyCollectionCardPhotos(supabase, collectionCardId, userId, remainingUrls);
    return listCollectionCardPhotos(supabase, collectionCardId, userId);
  }

  const { error } = await supabase
    .from('collection_card_images')
    .delete()
    .eq('collection_card_id', collectionCardId)
    .eq('user_id', userId)
    .in('id', ids);

  if (error) {
    if (isCollectionPhotoTableUnavailable(error.message)) {
      const remainingUrls = existingPhotos
        .filter((photo) => !ids.includes(photo.id))
        .map((photo) => photo.imageUrl);
      await replaceLegacyCollectionCardPhotos(supabase, collectionCardId, userId, remainingUrls);
      return listCollectionCardPhotos(supabase, collectionCardId, userId);
    }
    throw new Error(`Unable to remove collection photos: ${error.message}`);
  }

  await resequenceCollectionCardPhotos(supabase, collectionCardId, userId);
  await syncCollectionCardPhotoCover(supabase, collectionCardId, userId);
  return listCollectionCardPhotos(supabase, collectionCardId, userId);
}

async function resequenceCollectionCardPhotos(
  supabase: SupabaseClient,
  collectionCardId: string,
  userId: string
) {
  const photos = await listCollectionCardPhotos(supabase, collectionCardId, userId);

  for (let index = 0; index < photos.length; index += 1) {
    const photo = photos[index];
    if (photo.position === index) {
      continue;
    }

    const { error } = await supabase
      .from('collection_card_images')
      .update({ position: index })
      .eq('id', photo.id)
      .eq('collection_card_id', collectionCardId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Unable to reorder collection photos: ${error.message}`);
    }
  }
}

async function syncCollectionCardPhotoCover(
  supabase: SupabaseClient,
  collectionCardId: string,
  userId: string
) {
  const photos = await listCollectionCardPhotos(supabase, collectionCardId, userId);
  const cover = photos[0]?.imageUrl ?? null;
  const secondary = photos[1]?.imageUrl ?? null;

  const { error } = await supabase
    .from('collection_cards')
    .update({
      front_image_url: cover,
      back_image_url: secondary,
      updated_at: new Date().toISOString(),
    })
    .eq('id', collectionCardId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Unable to sync collection cover image: ${error.message}`);
  }
}
