import { SignUp } from '@clerk/nextjs';
import { Eyebrow } from '@/components/editorial';

export default function SignUpPage() {
  return (
    <section className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center py-12">
      <div className="mb-8 space-y-2 text-center">
        <Eyebrow className="justify-center">Account</Eyebrow>
        <h1 className="font-serif italic text-[36px] leading-tight text-ink">
          Create your account.
        </h1>
        <p className="text-[14px] text-ink-2">
          Start scanning slabs and building your collection.
        </p>
      </div>
      <SignUp
        appearance={{
          variables: {
            colorBackground:       '#ffffff',
            colorText:             '#14110d',
            colorTextSecondary:    '#5c594f',
            colorPrimary:          '#b8531a',
            colorInputBackground:  '#fbfaf6',
            colorInputText:        '#14110d',
            borderRadius:          '4px',
            fontFamily:            'var(--font-geist), ui-sans-serif, system-ui',
          },
          elements: {
            rootBox: 'w-full',
            card: 'shadow-soft border border-rule',
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
