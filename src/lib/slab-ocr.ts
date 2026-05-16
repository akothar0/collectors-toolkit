import { parseScannerOcrResponse } from '@/lib/scanner-ocr';

const SLAB_OCR_PROMPT =
  'This is a graded trading card in a plastic slab. On the label, find the certification number (digits only, often printed near the barcode on PSA slabs — copy every digit exactly). Also identify the grading company: PSA, BGS, SGC, or CGC.';

export async function callSlabOcr(imageUrl: string) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured.');
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      input: [
        {
          role: 'user',
          content: [
            { type: 'input_text', text: SLAB_OCR_PROMPT },
            {
              type: 'input_image',
              image_url: imageUrl,
              detail: 'high',
            },
          ],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'slab_ocr',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              certNumber: { anyOf: [{ type: 'string' }, { type: 'null' }] },
              gradingCompany: {
                type: 'string',
                enum: ['PSA', 'BGS', 'SGC', 'CGC', 'UNKNOWN'],
              },
            },
            required: ['certNumber', 'gradingCompany'],
          },
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI Responses API returned ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

export async function readSlabLabel(imageUrl: string) {
  const response = await callSlabOcr(imageUrl);
  return parseScannerOcrResponse(response);
}
