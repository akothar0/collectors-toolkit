import { FeaturePage } from '@/components/feature-page';

export default function GraderPage() {
  return (
    <FeaturePage
      title="Grader"
      description="Upload a raw card photo to get an estimated grade, sub-grades, and a submission recommendation."
      bullets={[
        'PSA 1-10 style estimate for raw cards.',
        'Sub-grades for centering, corners, edges, and surface.',
        'Clear disclaimer that the result is an AI estimate only.',
      ]}
    />
  );
}

