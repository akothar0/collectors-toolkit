import { auth, currentUser } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { isCardImageStorageConfigurationError, uploadPublicCardImage } from '@/lib/card-image-storage';
import { isConfigurationError, scannerErrorResponse } from '@/lib/scanner-api';
import { getOrCreateUserId } from '@/lib/users';

export const runtime = 'nodejs';

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

    const imageUrl = await uploadPublicCardImage(supabaseUserId, image);
    return NextResponse.json({ imageUrl });
  } catch (error) {
    if (isConfigurationError(error) || isCardImageStorageConfigurationError(error)) {
      return scannerErrorResponse(
        'Image upload is unavailable until Supabase storage is configured.',
        503
      );
    }

    return scannerErrorResponse(
      error instanceof Error ? error.message : 'Unable to upload image.'
    );
  }
}
