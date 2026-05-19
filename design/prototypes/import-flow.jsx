// import-flow.jsx — Import hub + review table.
// Replaces the painful screenshot at _ref/import-review-page.png.

const IMPORT_BATCH = {
  id: 'batch-bd83',
  source: 'Fanatics PDF',
  filename: 'Fanatics_Order_20260516.pdf',
  uploadedAt: '14:22 · 19 May',
  parsed: 12,
  matched: 9,
  rows: [
    { id: 1, sel: true,  conf: 'high',   raw: '2024 Topps Chrome UEFA Euro Soccer Sealed Hobby Box',
      player: '—', year: 2024, set: 'Topps Chrome UEFA Euro', grade: '',  company: '',     price: 360, date: '2026-05-12', note: 'SEALED PRODUCT · NOT A SINGLE CARD' },
    { id: 2, sel: true,  conf: 'high',   raw: '2018 Panini Prizm Luka Doncic ROOKIE #280 PSA 10 GEM MINT',
      player: 'Luka Dončić', year: 2018, set: 'Panini Prizm', grade: '10', company: 'PSA', price: 1850, date: '2026-05-10', note: '' },
    { id: 3, sel: true,  conf: 'high',   raw: '2023 Topps Chrome Wembanyama RC #180 PSA 10',
      player: 'Victor Wembanyama', year: 2023, set: 'Topps Chrome RC', grade: '10', company: 'PSA', price: 940, date: '2026-05-08', note: '' },
    { id: 4, sel: true,  conf: 'medium', raw: '2024 Select Premier League EPL Soccer Sealed Mega Box, 6ct Packs',
      player: '—', year: 2024, set: 'Select Premier League EPL Soccer', grade: '', company: '', price: 38, date: '2026-05-06', note: 'SEALED PRODUCT · NOT A SINGLE CARD' },
    { id: 5, sel: false, conf: 'low',    raw: '2025 Topps All Kings VJ Edgecombe ROOKIE #AK-18 CGC AUTH',
      player: 'VJ Edgecombe', year: 2025, set: 'Topps All Kings', grade: '', company: 'CGC', price: 800, date: '2026-05-04', note: 'CGC AUTH ≠ A GRADE NUMBER — REVIEW' },
    { id: 6, sel: true,  conf: 'high',   raw: '2024 Bowman Chrome Skenes 1st Auto #BCP-PS Raw',
      player: 'Paul Skenes', year: 2024, set: 'Bowman Chrome Auto', grade: '', company: 'Raw', price: 410, date: '2026-04-29', note: '' },
    { id: 7, sel: true,  conf: 'high',   raw: '2017 Panini Prizm Patrick Mahomes ROOKIE #270 PSA 9',
      player: 'Patrick Mahomes', year: 2017, set: 'Panini Prizm', grade: '9', company: 'PSA', price: 720, date: '2026-04-21', note: '' },
    { id: 8, sel: true,  conf: 'medium', raw: 'A\'JA WILSON 2018 DONRUSS WNBA #34 PSA 9',
      player: 'A\'ja Wilson', year: 2018, set: 'Donruss WNBA', grade: '9', company: 'PSA', price: 280, date: '2026-04-12', note: '' },
  ],
};

// ────────────────────────────────────────────────────────────────
//  HUB
// ────────────────────────────────────────────────────────────────
function ImportHub() {
  const sources = [
    { id: 'ebay',    title: 'eBay CSV',       sub: 'Chrome extension export',  detail: 'Drop the CSV from your eBay history. We read titles, prices, dates.', icon: <Icon.import/>, freq: '147 USERS THIS MONTH' },
    { id: 'fan',     title: 'Fanatics PDF',   sub: 'Order confirmation',        detail: 'Upload the PDF receipt. We OCR the line items, parse the cards.', icon: <Icon.import/>, freq: '38 USERS THIS MONTH' },
    { id: 'shot',    title: 'Screenshot',     sub: 'Any purchase page',         detail: 'Photo of your eBay / COMC / WhatNot history. GPT-4o reads it.', icon: <Icon.camera/>,  freq: 'WORKS WITH ANY VENDOR' },
    { id: 'paste',   title: 'Paste text',     sub: 'Order confirmation email',  detail: 'Paste an order email or a typed list. We parse each line.', icon: <Icon.add/>,     freq: 'ALWAYS AVAILABLE' },
  ];
  return (
    <>
      {/* Masthead */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <Eyebrow>Import · catch up your collection</Eyebrow>
          <div style={{
            fontFamily: st.serif, fontSize: 56, lineHeight: 1.0, letterSpacing: -1.2, marginTop: 6,
          }}>
            Bring in <span style={{ fontStyle: 'italic', color: st.accent }}>everything you already bought.</span>
          </div>
          <div style={{ fontFamily: st.serif, fontStyle: 'italic', fontSize: 20, color: st.ink2, marginTop: 12, maxWidth: 640 }}>
            We parse, you review, then save. Nothing lands in your collection until you confirm.
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <Eyebrow>This month</Eyebrow>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 6 }}>
            <span style={{ fontFamily: st.serif, fontSize: 40, fontStyle: 'italic', lineHeight: 1 }}>3</span>
            <span style={{ fontFamily: st.mono, fontSize: 14, color: st.ink3 }}>/100 BATCHES</span>
          </div>
        </div>
      </div>

      <Rule style={{ margin: '32px 0' }}/>

      {/* Source picker */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 18,
      }}>
        {sources.map((s, i) => (
          <div key={s.id} style={{
            padding: '28px 28px', background: st.surface, border: '1px solid ' + st.rule, borderRadius: 4,
            cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 16,
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 4, background: st.surface2,
                border: '1px solid ' + st.rule,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{s.icon}</div>
              <div>
                <div style={{ fontFamily: st.mono, fontSize: 10, color: st.accent, letterSpacing: 1.4 }}>
                  OPTION {String(i+1).padStart(2,'0')}
                </div>
                <div style={{ fontFamily: st.serif, fontSize: 26, fontStyle: 'italic', lineHeight: 1.1, marginTop: 2 }}>
                  {s.title}
                </div>
                <div style={{ fontFamily: st.mono, fontSize: 10, color: st.ink3, letterSpacing: 1, marginTop: 2 }}>
                  {s.sub.toUpperCase()}
                </div>
              </div>
            </div>
            <div style={{ fontSize: 13, color: st.ink2, lineHeight: 1.5 }}>{s.detail}</div>
            <div style={{
              marginTop: 6, padding: '20px 0', border: '1px dashed ' + st.rule, borderRadius: 4,
              background: st.surface2, textAlign: 'center',
            }}>
              <div style={{ fontFamily: st.mono, fontSize: 11, color: st.ink2, letterSpacing: 0.6 }}>
                {s.id === 'paste' ? 'PASTE ORDER TEXT' : 'DROP A FILE OR CLICK TO UPLOAD'}
              </div>
              <div style={{ fontFamily: st.mono, fontSize: 9, color: st.ink3, marginTop: 4, letterSpacing: 0.4 }}>
                {s.id === 'ebay' && 'CSV · ≤5MB · UTF-8'}
                {s.id === 'fan' && 'PDF · ≤8MB · TEXT LAYER REQUIRED'}
                {s.id === 'shot' && 'JPG · PNG · HEIC · ≤12MB'}
                {s.id === 'paste' && '≤4,000 CHARACTERS'}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
              <span style={{ fontFamily: st.mono, fontSize: 9, color: st.ink3, letterSpacing: 1 }}>{s.freq}</span>
              <span style={{ fontFamily: st.sans, fontSize: 12, color: st.ink, fontWeight: 500 }}>
                Choose this →
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Recent batches */}
      <div style={{ marginTop: 44 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontFamily: st.serif, fontSize: 28, fontStyle: 'italic' }}>Recent batches</div>
          <Eyebrow>Last 30 days</Eyebrow>
        </div>
        <Rule/>
        {[
          { dt: '19 MAY · 14:22', src: 'Fanatics PDF',  count: '12 parsed · 9 matched',  status: 'NEEDS REVIEW', accent: true },
          { dt: '12 MAY · 09:08', src: 'eBay CSV',      count: '34 parsed · 32 matched', status: 'SAVED 32 · DISCARDED 2', accent: false },
          { dt: '04 MAY · 21:14', src: 'Screenshot',    count: '6 parsed · 6 matched',   status: 'SAVED ALL', accent: false },
        ].map((b, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '140px 200px 1fr 200px 80px', gap: 14,
            padding: '16px 0', alignItems: 'center', borderBottom: '1px solid ' + st.ruleSoft,
          }}>
            <span style={{ fontFamily: st.mono, fontSize: 11, color: st.ink3, letterSpacing: 0.4 }}>{b.dt}</span>
            <span style={{ fontFamily: st.serif, fontStyle: 'italic', fontSize: 17 }}>{b.src}</span>
            <span style={{ fontSize: 13, color: st.ink2 }}>{b.count}</span>
            <span style={{
              fontFamily: st.mono, fontSize: 10,
              color: b.accent ? st.accent : st.ink3, letterSpacing: 1.4,
            }}>{b.status}</span>
            <span style={{ textAlign: 'right', fontFamily: st.sans, fontSize: 12, color: st.ink }}>Open →</span>
          </div>
        ))}
      </div>
    </>
  );
}

// ────────────────────────────────────────────────────────────────
//  REVIEW — the table redesign
// ────────────────────────────────────────────────────────────────
function ConfPill({ conf }) {
  const map = {
    high:   { bg: '#d6e7dc', fg: st.pos,   text: 'HIGH' },
    medium: { bg: '#e9e3c6', fg: st.warn,  text: 'MED' },
    low:    { bg: '#e9d0cb', fg: st.neg,   text: 'LOW' },
  }[conf];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: map.bg, color: map.fg, padding: '2px 7px', borderRadius: 3,
      fontFamily: st.mono, fontSize: 9, fontWeight: 600, letterSpacing: 1,
    }}>
      ● {map.text}
    </span>
  );
}

function ImportReview() {
  const b = IMPORT_BATCH;
  const total = b.rows.length;
  const selected = b.rows.filter(r => r.sel).length;
  const lowCount = b.rows.filter(r => r.conf === 'low').length;
  return (
    <>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <Eyebrow>Review · batch {b.id}</Eyebrow>
          <div style={{
            fontFamily: st.serif, fontSize: 52, lineHeight: 1.0, letterSpacing: -1.2, marginTop: 6,
          }}>
            Review <span style={{ fontStyle: 'italic', color: st.accent }}>{total} cards.</span>
          </div>
          <div style={{ fontSize: 13, color: st.ink2, marginTop: 10, lineHeight: 1.5 }}>
            <span style={{ fontFamily: st.mono, color: st.ink3 }}>{b.source.toUpperCase()}</span>
            {' · '}{b.filename}{' · '}
            <span style={{ fontFamily: st.mono, color: st.ink3 }}>{b.uploadedAt}</span>
            {' · '}<span style={{ color: st.pos }}>{b.matched} matched to catalog</span>
          </div>
        </div>
        <div>
          <Eyebrow>Selected</Eyebrow>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 6 }}>
            <span style={{ fontFamily: st.serif, fontSize: 40, fontStyle: 'italic', lineHeight: 1 }}>{selected}</span>
            <span style={{ fontFamily: st.mono, fontSize: 14, color: st.ink3 }}>/ {total}</span>
          </div>
          <div style={{ fontFamily: st.mono, fontSize: 10, color: lowCount > 0 ? st.warn : st.ink3, marginTop: 6, letterSpacing: 1 }}>
            {lowCount > 0 ? `${lowCount} LOW-CONFIDENCE` : 'ALL CONFIDENT'}
          </div>
        </div>
      </div>

      <Rule style={{ margin: '24px 0' }}/>

      {/* Action bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
      }}>
        <button style={{
          padding: '7px 12px', background: 'transparent', border: '1px solid ' + st.rule, borderRadius: 4,
          fontSize: 12, color: st.ink, cursor: 'pointer',
        }}>Select all</button>
        <button style={{
          padding: '7px 12px', background: 'transparent', border: '1px solid ' + st.rule, borderRadius: 4,
          fontSize: 12, color: st.ink, cursor: 'pointer',
        }}>Deselect low confidence</button>
        <button style={{
          padding: '7px 12px', background: 'transparent', border: '1px solid ' + st.rule, borderRadius: 4,
          fontSize: 12, color: st.ink, cursor: 'pointer',
        }}>Hide sealed products</button>
        <div style={{ flex: 1 }}/>
        <span style={{ fontFamily: st.mono, fontSize: 11, color: st.ink3, letterSpacing: 0.4 }}>
          NOTHING SAVES UNTIL YOU CLICK BELOW
        </span>
        <button style={{
          padding: '10px 18px', background: st.ink, color: st.bg, border: 'none', borderRadius: 4,
          fontSize: 13, fontWeight: 500, cursor: 'pointer',
        }}>Save {selected} cards to collection →</button>
      </div>

      {/* Column headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '32px 64px 1.7fr 1.3fr 90px 90px 100px 84px',
        gap: 14, padding: '10px 16px',
        background: st.surface2, border: '1px solid ' + st.rule, borderRadius: '4px 4px 0 0',
        fontFamily: st.mono, fontSize: 10, color: st.ink3, letterSpacing: 1.4,
      }}>
        <div></div><div></div><div>PARSED IDENTITY · CLICK TO EDIT</div><div>RAW TITLE</div>
        <div>GRADE</div><div>CO.</div><div style={{ textAlign: 'right' }}>PRICE</div>
        <div style={{ textAlign: 'right' }}>CONFIDENCE</div>
      </div>
      {/* Rows */}
      <div style={{ border: '1px solid ' + st.rule, borderTop: 'none', borderRadius: '0 0 4px 4px', background: st.surface }}>
        {b.rows.map((r, i) => (
          <React.Fragment key={r.id}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '32px 64px 1.7fr 1.3fr 90px 90px 100px 84px',
              gap: 14, padding: '16px',
              borderBottom: r.note ? 'none' : (i < b.rows.length - 1 ? '1px solid ' + st.ruleSoft : 'none'),
              alignItems: 'center',
              opacity: r.sel ? 1 : 0.5,
            }}>
              {/* Select */}
              <div style={{
                width: 16, height: 16, borderRadius: 3,
                border: '1.5px solid ' + (r.sel ? st.ink : st.ink3),
                background: r.sel ? st.ink : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}>
                {r.sel && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#fff" strokeWidth="2">
                    <path d="M2 5l2 2 4-5"/>
                  </svg>
                )}
              </div>
              {/* Slab preview (sport-guessed tint) */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <Slab holding={{
                  player: r.player !== '—' ? r.player : 'Unknown',
                  year: r.year, set: r.set, num: '',
                  grade: r.grade ? `${r.company || 'PSA'} ${r.grade}` : 'Raw',
                  sport: r.player !== '—' ? 'NBA' : 'NBA',
                  tint: r.conf === 'high' ? '#1f1d6b' : r.conf === 'medium' ? '#0d322b' : '#5c594f',
                  accent: '#f4ddc1',
                }} width={44} height={66} flavor="light" showLabel={false}/>
              </div>
              {/* Parsed identity */}
              <div>
                <div style={{ fontFamily: st.serif, fontSize: 16, lineHeight: 1.1 }}>
                  {r.player !== '—' ? r.player : (
                    <span style={{ color: st.ink3, fontStyle: 'italic' }}>— no player parsed</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: st.ink2, marginTop: 4 }}>
                  {r.year} {r.set}
                </div>
              </div>
              {/* Raw title */}
              <div style={{
                fontFamily: st.mono, fontSize: 10, color: st.ink3, lineHeight: 1.4, letterSpacing: 0.3,
              }}>
                {r.raw}
              </div>
              {/* Grade */}
              <div style={{
                padding: '5px 8px', borderRadius: 3,
                background: r.grade ? st.surface2 : 'transparent',
                border: r.grade ? '1px solid ' + st.ruleSoft : '1px dashed ' + st.rule,
                fontFamily: st.mono, fontSize: 12, color: r.grade ? st.ink : st.ink3,
                textAlign: 'center',
              }}>
                {r.grade || '—'}
              </div>
              {/* Company */}
              <div style={{
                padding: '5px 8px', borderRadius: 3,
                background: r.company ? st.surface2 : 'transparent',
                border: r.company ? '1px solid ' + st.ruleSoft : '1px dashed ' + st.rule,
                fontFamily: st.mono, fontSize: 12, color: r.company ? st.ink : st.ink3,
                textAlign: 'center',
              }}>
                {r.company || '—'}
              </div>
              {/* Price */}
              <div style={{ fontFamily: st.serif, fontStyle: 'italic', fontSize: 20, textAlign: 'right' }}>
                ${r.price.toLocaleString()}
              </div>
              {/* Confidence */}
              <div style={{ textAlign: 'right' }}>
                <ConfPill conf={r.conf}/>
              </div>
            </div>
            {r.note && (
              <div style={{
                padding: '8px 16px 14px 110px',
                borderBottom: i < b.rows.length - 1 ? '1px solid ' + st.ruleSoft : 'none',
                background: r.conf === 'low' ? '#fbf3eb' : 'transparent',
              }}>
                <div style={{
                  fontFamily: st.mono, fontSize: 10, letterSpacing: 0.5,
                  color: r.conf === 'low' ? st.neg : st.warn,
                }}>
                  ⚠ {r.note}
                </div>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      <div style={{
        marginTop: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ fontFamily: st.mono, fontSize: 11, color: st.ink3, letterSpacing: 0.4 }}>
          BATCH WILL BE LINKED TO RESULTING CARDS · PROVENANCE TRACKED PER ROW
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{
            padding: '10px 16px', background: 'transparent', color: st.ink2, border: '1px solid ' + st.rule, borderRadius: 4,
            fontSize: 13, cursor: 'pointer',
          }}>Discard batch</button>
          <button style={{
            padding: '10px 18px', background: st.ink, color: st.bg, border: 'none', borderRadius: 4,
            fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}>Save {selected} cards →</button>
        </div>
      </div>
    </>
  );
}

// ────────────────────────────────────────────────────────────────
//  Wrapper
// ────────────────────────────────────────────────────────────────
function ImportDesktop({ view = 'hub' }) {
  return (
    <div style={{ width: '100%', minHeight: '100%', background: st.bg, color: st.ink, fontFamily: st.sans }}>
      <SharedNav active="Capture"/>
      <div style={{ padding: '36px 36px 24px' }}>
        {view === 'review' ? <ImportReview/> : <ImportHub/>}
        <PageFooter
          left="COLLECTORS TOOLKIT · IMPORT · v1.0"
          right="EBAY · FANATICS · SCREENSHOT · PASTE · 100/DAY"
        />
      </div>
    </div>
  );
}

Object.assign(window, { ImportDesktop });
