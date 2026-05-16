import { auth, currentUser } from '@clerk/nextjs/server';
import { getOrCreateUserId } from '@/lib/users';

export async function getAuthenticatedSupabaseUserId() {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  const clerkUser = await currentUser();
  const email =
    clerkUser?.emailAddresses.find((item) => item.id === clerkUser.primaryEmailAddressId)?.emailAddress ??
    null;

  const supabaseUserId = await getOrCreateUserId(userId, email);
  return supabaseUserId;
}
