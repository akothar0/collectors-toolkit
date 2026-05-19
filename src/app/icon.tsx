import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
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
          borderRadius: 6,
        }}
      >
        <span
          style={{
            color: '#f6f4ef',
            fontSize: 22,
            fontStyle: 'italic',
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontWeight: 400,
            lineHeight: 1,
            marginTop: 2,
          }}
        >
          c
        </span>
      </div>
    ),
    { ...size },
  );
}
