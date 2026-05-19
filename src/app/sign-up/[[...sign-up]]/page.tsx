import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <section className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center py-10">
      <div className="mb-8 space-y-3 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-500">Account</p>
        <h1 className="text-3xl font-semibold tracking-tight text-ash-50">
          Create your account
        </h1>
        <p className="text-sm leading-6 text-ash-300">Start scanning slabs and building your collection.</p>
      </div>
      <SignUp
        appearance={{
          elements: {
            rootBox: 'w-full',
            card: 'rounded border border-ink-700 bg-ink-900 ',
          },
        }}
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        forceRedirectUrl="/scanner"
        fallbackRedirectUrl="/scanner"
      />
    </section>
  );
}
