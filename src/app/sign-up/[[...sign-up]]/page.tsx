import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <section className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center py-10">
      <div className="mb-8 space-y-3 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-600">Account</p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-slate-950">
          Create your account
        </h1>
        <p className="text-sm leading-6 text-slate-600">Start scanning slabs and building your collection.</p>
      </div>
      <SignUp
        appearance={{
          elements: {
            rootBox: 'w-full',
            card: 'rounded-[1.75rem] border border-slate-200 bg-white shadow-soft',
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
