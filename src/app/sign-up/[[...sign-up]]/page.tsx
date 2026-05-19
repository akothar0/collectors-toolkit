import { SignUp } from '@clerk/nextjs';
import { Eyebrow } from '@/components/editorial';

export default function SignUpPage() {
  return (
    <section className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col items-center justify-center py-12">
      <div className="mb-8 w-full space-y-2 text-center">
        <Eyebrow>Account</Eyebrow>
        <h1 className="font-serif italic text-[36px] leading-tight text-ink">
          Create your account.
        </h1>
        <p className="text-[14px] text-ink-2">
          Start scanning slabs and building your collection.
        </p>
      </div>
      <div className="flex w-full justify-center">
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
              rootBox: 'mx-auto flex w-full justify-center',
              cardBox: 'mx-auto w-full max-w-full',
              card: 'w-full shadow-soft border border-rule',
            },
          }}
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          forceRedirectUrl="/scanner"
          fallbackRedirectUrl="/scanner"
        />
      </div>
    </section>
  );
}
