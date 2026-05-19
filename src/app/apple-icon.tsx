import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#14110d',
          borderRadius: 32,
        }}
      >
        <span
          style={{
            color: '#f6f4ef',
            fontSize: 120,
            fontStyle: 'italic',
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontWeight: 400,
            lineHeight: 1,
            marginTop: 8,
          }}
        >
          c
        </span>
      </div>
    ),
    { ...size },
  );
}
