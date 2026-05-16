import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { isConfigurationError, scannerErrorResponse } from '@/lib/scanner-api';
import { createServiceClient } from '@/lib/supabase';
import { getOrCreateUserId } from '@/lib/users';

export const runtime = 'nodejs';

async function uploadCollectionImage(userId: string, imageFile: File) {
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

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clerkUser = await currentUser();
    const email =
      clerkUser?.emailAddresses.find((item) => item.id === clerkUser.primaryEmailAddressId)?.emailAddress ??
      null;
    const supabaseUserId = await getOrCreateUserId(userId, email);

    const formData = await req.formData();
    const image = formData.get('image');

    if (!(image instanceof File) || image.size === 0) {
      return NextResponse.json({ error: 'Please upload an image file.' }, { status: 400 });
    }

    const imageUrl = await uploadCollectionImage(supabaseUserId, image);
    return NextResponse.json({ imageUrl });
  } catch (error) {
    if (isConfigurationError(error)) {
      return scannerErrorResponse('Image upload is unavailable until Supabase is configured.', 503);
    }

    return scannerErrorResponse(
      error instanceof Error ? error.message : 'Unable to upload image.'
    );
  }
}
