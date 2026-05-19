import { SignIn } from '@clerk/nextjs';
import { Eyebrow } from '@/components/editorial';

export default function SignInPage() {
  return (
    <section className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center py-12">
      <div className="mb-8 space-y-2 text-center">
        <Eyebrow className="justify-center">Account</Eyebrow>
        <h1 className="font-serif italic text-[36px] leading-tight text-ink">
          Sign in to continue.
        </h1>
        <p className="text-[14px] text-ink-2">
          Access the scanner, collection tools, and your saved slab history.
        </p>
      </div>
      <SignIn
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
        path="/sign-in"
        signUpUrl="/sign-up"
        forceRedirectUrl="/scanner"
        fallbackRedirectUrl="/scanner"
      />
    </section>
  );
}
