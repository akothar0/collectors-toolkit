// scanner.jsx — Scanner surface: capture → OCR → cert lookup → save.
// Editorial A base + selective bold elements (slab-as-hero, ticker traces).
// State machine: idle | scanning | result | manual

const sT = {
  bg: '#f6f4ef',
  surface: '#ffffff',
  surface2: '#fbfaf6',
  ink: '#14110d',
  ink2: '#5c594f',
  ink3: '#8a867b',
  ink4: '#b5b1a6',
  rule: '#e4e0d5',
  ruleSoft: '#efeae0',
  accent: '#b8531a',
  gold: '#c89a3b',
  pos: '#2f6f4a',
  neg: '#b23a2e',
  warn: '#a37a14',
  serif: 'Instrument Serif, "Times New Roman", serif',
  sans: 'Geist, -apple-system, sans-serif',
  mono: 'Geist Mono, ui-monospace, monospace',
};

// ────────────────────────────────────────────────────────────────
//  Shared atoms (re-declared so this file is standalone)
// ────────────────────────────────────────────────────────────────
function SRule({ color = sT.rule, style = {} }) {
  return <div style={{ height: 1, background: color, ...style }}/>;
}
function SEyebrow({ children, color, style = {} }) {
  return <div style={{
    fontFamily: sT.mono, fontSize: 10, letterSpacing: 2,
    textTransform: 'uppercase', color: color || sT.ink3, ...style,
  }}>{children}</div>;
}

function SNavBar({ active = 'Scanner', onCapture }) {
  const items = ['Home', 'Scanner', 'Grader', 'Collection', 'Portfolio', 'Want list', 'Sets', 'Import'];
  return (
    <div style={{
      height: 60, display: 'flex', alignItems: 'center', padding: '0 36px',
      borderBottom: '1px solid ' + sT.rule, background: sT.bg,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 26, height: 26, borderRadius: 4, background: sT.ink,
          color: sT.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: sT.serif, fontStyle: 'italic', fontSize: 16,
        }}>c</div>
        <div style={{
          fontFamily: sT.sans, fontSize: 14, fontWeight: 500, color: sT.ink, letterSpacing: -0.2,
        }}>Collectors Toolkit</div>
      </div>
      <div style={{ display: 'flex', gap: 4, marginLeft: 36 }}>
        {items.map(it => (
          <div key={it} style={{
            padding: '6px 12px', fontSize: 13, color: it === active ? sT.ink : sT.ink2,
            position: 'relative', cursor: 'pointer',
          }}>
            {it}
            {it === active && <div style={{
              position: 'absolute', bottom: -19, left: 12, right: 12, height: 1, background: sT.ink,
            }}/>}
          </div>
        ))}
      </div>
      <div style={{ flex: 1 }}/>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
          border: '1px solid ' + sT.rule, borderRadius: 6,
          fontFamily: sT.mono, fontSize: 11, color: sT.ink3,
        }}>
          <Icon.search style={{ width: 12, height: 12 }}/>
          <span>Search collection</span>
          <span style={{ marginLeft: 24 }}>⌘K</span>
        </div>
        <div style={{
          width: 28, height: 28, borderRadius: '50%', background: sT.accent,
          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 600,
        }}>M</div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
//  Slab card props for the demo scan target — Wembanyama
// ────────────────────────────────────────────────────────────────
const SCANNED_CARD = {
  ...TOP_HOLDINGS[2], // Wembanyama
  certNumber: '48029174',
  certCompany: 'PSA',
  gradeDescription: 'GEM MINT',
  qualifierCode: null,
  popHigher: 0,
  lastSale: 940,
  lastSaleDate: '5d ago',
  saleRange: { lo: 880, hi: 1020, count: 14 },
  comps: 14,
  parallel: null,
  manufacturer: 'Topps',
  inCollection: false,
  inWantList: true,
};

const RECENT_SCANS = [
  { ...TOP_HOLDINGS[3], when: 'Yesterday · 19:08', cert: '76612089' },
  { ...TOP_HOLDINGS[0], when: '2 days · 11:40',    cert: '52001183' },
  { ...TOP_HOLDINGS[1], when: '3 days · 09:14',    cert: '11240056' },
  { ...TOP_HOLDINGS[4], when: '5 days · 21:51',    cert: '88412930' },
];

// ────────────────────────────────────────────────────────────────
//  Viewfinder — the centerpiece capture stage
//  Phases: idle | scanning | result | manual
// ────────────────────────────────────────────────────────────────
function Viewfinder({ phase, onStart, ocrStep }) {
  const showSlab = phase !== 'idle' && phase !== 'manual';
  return (
    <div style={{
      position: 'relative', aspectRatio: '4/3', borderRadius: 6,
      background: 'linear-gradient(160deg, #1c1c1f 0%, #0a0a0c 100%)',
      border: '1px solid ' + sT.rule, overflow: 'hidden',
    }}>
      {/* graph paper texture */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.12,
        backgroundImage:
          'linear-gradient(rgba(212,162,76,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(212,162,76,0.12) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}/>
      {/* corner brackets */}
      {[
        { top: 20, left: 20, t: 2, l: 2 },
        { top: 20, right: 20, t: 2, r: 2 },
        { bottom: 20, left: 20, b: 2, l: 2 },
        { bottom: 20, right: 20, b: 2, r: 2 },
      ].map((c, i) => (
        <div key={i} style={{
          position: 'absolute', width: 36, height: 36,
          borderTop: c.t ? `${c.t}px solid ${sT.accent}` : 'none',
          borderBottom: c.b ? `${c.b}px solid ${sT.accent}` : 'none',
          borderLeft: c.l ? `${c.l}px solid ${sT.accent}` : 'none',
          borderRight: c.r ? `${c.r}px solid ${sT.accent}` : 'none',
          top: c.top, left: c.left, right: c.right, bottom: c.bottom,
        }}/>
      ))}

      {/* IDLE state — drop zone */}
      {phase === 'idle' && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 20, color: '#f2efe7',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <Icon.camera style={{ width: 36, height: 36, color: sT.accent, strokeWidth: 1.4 }}/>
            <div style={{
              fontFamily: sT.serif, fontStyle: 'italic', fontSize: 36, lineHeight: 1.1,
              color: '#f2efe7', marginTop: 6,
            }}>
              Drop a slab photo.
            </div>
            <div style={{
              fontFamily: sT.serif, fontSize: 18, color: '#a09c92', fontStyle: 'italic',
            }}>
              Or use your camera. We read the label.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button onClick={onStart} style={{
              background: sT.accent, color: '#fff', border: 'none',
              padding: '12px 22px', borderRadius: 4, cursor: 'pointer',
              fontFamily: sT.sans, fontSize: 14, fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <Icon.camera style={{ width: 14, height: 14 }}/>
              Capture · live
            </button>
            <button onClick={onStart} style={{
              background: 'transparent', color: '#f2efe7', border: '1px solid #303034',
              padding: '12px 22px', borderRadius: 4, cursor: 'pointer',
              fontFamily: sT.sans, fontSize: 14,
            }}>
              Choose a photo
            </button>
          </div>
          <div style={{
            fontFamily: sT.mono, fontSize: 10, color: '#6b6862', letterSpacing: 1.4,
            display: 'flex', gap: 16, marginTop: 8,
          }}>
            <span>· PSA</span><span>· BGS</span><span>· SGC</span>
            <span style={{ color: '#454340' }}>·</span>
            <span>JPG · PNG · HEIC ≤ 12MB</span>
          </div>
        </div>
      )}

      {/* SCANNING / RESULT — the slab in frame */}
      {showSlab && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: `translate(-50%, -50%) rotate(${phase === 'result' ? -2 : -4}deg)`,
          transition: 'transform .5s cubic-bezier(.2,.7,.3,1)',
          filter: phase === 'scanning' ? 'brightness(1.05)' : 'none',
        }}>
          <Slab holding={SCANNED_CARD} width={220} height={330} flavor="dark"/>
          {/* OCR field highlights overlay on slab during scanning */}
          {phase === 'scanning' && (
            <>
              {/* highlight CERT location */}
              {ocrStep >= 1 && (
                <div style={{
                  position: 'absolute', top: 30, left: 18, width: 90, height: 18,
                  border: '1.5px solid ' + sT.accent, borderRadius: 2,
                  boxShadow: '0 0 12px rgba(184,83,26,0.4)',
                  animation: 'sc-pulse 1.5s ease-in-out infinite',
                }}/>
              )}
              {/* highlight GRADE */}
              {ocrStep >= 2 && (
                <div style={{
                  position: 'absolute', top: 14, right: 18, width: 60, height: 26,
                  border: '1.5px solid ' + sT.gold, borderRadius: 2,
                  boxShadow: '0 0 12px rgba(200,154,59,0.4)',
                  animation: 'sc-pulse 1.5s ease-in-out infinite',
                }}/>
              )}
              {/* highlight PLAYER */}
              {ocrStep >= 3 && (
                <div style={{
                  position: 'absolute', bottom: 50, left: 30, right: 30, height: 30,
                  border: '1.5px solid ' + sT.accent, borderRadius: 2,
                  boxShadow: '0 0 12px rgba(184,83,26,0.4)',
                  animation: 'sc-pulse 1.5s ease-in-out infinite',
                }}/>
              )}
            </>
          )}
        </div>
      )}

      {/* SCAN LINE */}
      {phase === 'scanning' && (
        <div style={{
          position: 'absolute', left: 40, right: 40, height: 1,
          background: 'linear-gradient(90deg, transparent, ' + sT.accent + ', transparent)',
          boxShadow: '0 0 14px ' + sT.accent,
          animation: 'sc-scan 1.8s ease-in-out infinite alternate',
        }}/>
      )}

      {/* RESULT — pop badges */}
      {phase === 'result' && (
        <>
          <div style={{
            position: 'absolute', top: 30, right: 30,
            background: sT.surface, color: sT.ink, padding: '10px 14px',
            borderRadius: 4, border: '1px solid ' + sT.rule,
            boxShadow: '0 8px 20px rgba(0,0,0,0.35)',
            transform: 'rotate(2deg)',
          }}>
            <div style={{ fontFamily: sT.mono, fontSize: 9, color: sT.ink3, letterSpacing: 1.5 }}>POP @ PSA 10</div>
            <div style={{ fontFamily: sT.serif, fontSize: 28, fontStyle: 'italic', lineHeight: 1, marginTop: 2 }}>612</div>
          </div>
          <div style={{
            position: 'absolute', bottom: 30, left: 30,
            background: sT.gold, color: '#1a1409', padding: '8px 14px',
            borderRadius: 999, fontFamily: sT.sans, fontSize: 12, fontWeight: 600,
            boxShadow: '0 4px 14px rgba(200,154,59,0.4)',
            display: 'flex', alignItems: 'center', gap: 6,
            transform: 'rotate(-2deg)',
          }}>
            ♥ ON YOUR WANT LIST
          </div>
        </>
      )}

      {/* MANUAL — failure with prompt */}
      {phase === 'manual' && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 18, color: '#f2efe7',
          padding: 40, textAlign: 'center',
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            border: '2px solid ' + sT.warn, color: sT.warn,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: sT.serif, fontSize: 22, fontStyle: 'italic',
          }}>?</div>
          <div>
            <div style={{ fontFamily: sT.serif, fontStyle: 'italic', fontSize: 32, lineHeight: 1.1 }}>
              Couldn't read the label.
            </div>
            <div style={{ fontFamily: sT.serif, fontSize: 17, color: '#a09c92', fontStyle: 'italic', marginTop: 8 }}>
              Glare on the cert — try again, or type the number below.
            </div>
          </div>
          <button onClick={onStart} style={{
            background: 'transparent', color: '#f2efe7', border: '1px solid #303034',
            padding: '10px 18px', borderRadius: 4, cursor: 'pointer', fontSize: 13,
          }}>Retake photo</button>
        </div>
      )}

      {/* STATUS LINE */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 22px',
        background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.7))',
        color: '#f2efe7', fontFamily: sT.mono, fontSize: 11, letterSpacing: 1,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span>
          {phase === 'idle'     && '· · ·  AWAITING IMAGE'}
          {phase === 'scanning' && (
            <>
              <span style={{ animation: 'sc-pulse 1.4s infinite' }}>● OCR · GPT-4o VISION</span>
            </>
          )}
          {phase === 'result'   && '✓ CERT 48029174 · PSA · MATCH · 1.1s'}
          {phase === 'manual'   && '⚠ OCR · LOW CONFIDENCE · MANUAL ENTRY'}
        </span>
        <span style={{ color: sT.accent }}>
          {phase === 'idle'     && 'READY'}
          {phase === 'scanning' && ['OCR 12%','OCR 36%','OCR 72%','LOOKUP 0.4s','RESOLVING'][Math.min(ocrStep, 4)]}
          {phase === 'result'   && 'PSA · CONFIRMED'}
          {phase === 'manual'   && 'AWAITING INPUT'}
        </span>
      </div>

      <style>{`
        @keyframes sc-scan { 0% { top: 18%; } 100% { top: 82%; } }
        @keyframes sc-pulse { 0%,100% { opacity: 0.6; } 50% { opacity: 1; } }
      `}</style>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
//  Right panel — Reading / Match / Manual
// ────────────────────────────────────────────────────────────────
function SOcrField({ label, value, filled, accent }) {
  return (
    <div style={{ padding: '14px 0', borderBottom: '1px solid ' + sT.ruleSoft }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      }}>
        <SEyebrow>{label}</SEyebrow>
        {filled && <span style={{
          fontFamily: sT.mono, fontSize: 9, color: accent ? sT.accent : sT.pos, letterSpacing: 1.4,
        }}>✓ READ</span>}
      </div>
      <div style={{
        fontFamily: label === 'CERT NUMBER' ? sT.mono : sT.serif,
        fontStyle: label === 'CERT NUMBER' ? 'normal' : 'italic',
        fontSize: label === 'CERT NUMBER' ? 18 : 22,
        marginTop: 6, lineHeight: 1.1,
        color: filled ? sT.ink : sT.ink4,
        transition: 'color .25s',
      }}>
        {filled ? value : '— — —'}
      </div>
    </div>
  );
}

function ReadingPanel({ phase, ocrStep }) {
  const filled = (n) => phase === 'result' || (phase === 'scanning' && ocrStep >= n);
  return (
    <div style={{
      background: sT.surface, border: '1px solid ' + sT.rule, borderRadius: 4,
      padding: '22px 24px',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <SEyebrow color={phase === 'scanning' ? sT.accent : sT.ink3}>
          {phase === 'idle' && 'Waiting'}
          {phase === 'scanning' && '● Reading the label'}
          {phase === 'result' && '✓ Match'}
        </SEyebrow>
        <SEyebrow>
          {phase === 'idle' && 'PSA · BGS · SGC'}
          {phase === 'scanning' && 'GPT-4o'}
          {phase === 'result' && 'PSA API · CACHED'}
        </SEyebrow>
      </div>
      <SOcrField label="CERT NUMBER" value="48029174" filled={filled(1)}/>
      <SOcrField label="GRADING COMPANY" value="PSA 10 · GEM MINT" filled={filled(2)} accent/>
      <SOcrField label="PLAYER" value="Victor Wembanyama" filled={filled(3)}/>
      <SOcrField label="YEAR · SET" value="2023 Topps Chrome RC" filled={filled(4)}/>
      <SOcrField label="CARD NUMBER" value="#180" filled={filled(5)}/>
      <div style={{ padding: '14px 0 0' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontFamily: sT.mono, fontSize: 11, color: sT.ink3, letterSpacing: 0.5,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: phase === 'result' ? sT.pos : phase === 'scanning' ? sT.accent : sT.ink4,
            animation: phase === 'scanning' ? 'sc-pulse 1.4s infinite' : 'none',
          }}/>
          {phase === 'idle'     && 'OCR will read 5 fields. Cert verifies against the issuer.'}
          {phase === 'scanning' && `READING ${Math.min(ocrStep,5)} / 5 · LOOKING UP`}
          {phase === 'result'   && 'Verified against PSA · 0.4s · cached for 24h'}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
//  Result detail — what we matched (replaces ReadingPanel after scan)
// ────────────────────────────────────────────────────────────────
function MatchPanel() {
  const c = SCANNED_CARD;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Header — eyebrow + big serif player */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <SEyebrow color={sT.accent}>● MATCHED · CERT 48029174 · PSA</SEyebrow>
        <SEyebrow>1.1s</SEyebrow>
      </div>
      <div style={{
        fontFamily: sT.serif, fontSize: 56, lineHeight: 1.0, letterSpacing: -1, marginTop: 14,
      }}>
        Victor <span style={{ fontStyle: 'italic', color: sT.accent }}>Wembanyama.</span>
      </div>
      <div style={{ fontSize: 14, color: sT.ink2, marginTop: 8 }}>
        2023 Topps Chrome RC · #180 · NBA · Topps · No parallel
      </div>

      {/* Grade strip */}
      <div style={{
        marginTop: 24, padding: '16px 20px',
        background: '#fff', border: '1px solid ' + sT.rule, borderRadius: 4,
        display: 'flex', alignItems: 'center', gap: 24,
      }}>
        <div style={{
          padding: '8px 14px', borderRadius: 4,
          background: '#c41e3a', color: '#fff',
          fontFamily: sT.sans, fontWeight: 700, fontSize: 16, letterSpacing: 0.5,
        }}>
          PSA <span style={{ fontSize: 22, marginLeft: 4 }}>10</span>
        </div>
        <div>
          <div style={{ fontFamily: sT.serif, fontStyle: 'italic', fontSize: 22, lineHeight: 1 }}>
            Gem Mint
          </div>
          <div style={{ fontFamily: sT.mono, fontSize: 11, color: sT.ink3, marginTop: 3, letterSpacing: 0.4 }}>
            NO QUALIFIER · NOT DUAL CERT
          </div>
        </div>
        <div style={{ width: 1, height: 30, background: sT.rule }}/>
        <div>
          <SEyebrow>Population</SEyebrow>
          <div style={{ fontFamily: sT.serif, fontSize: 22, fontStyle: 'italic', marginTop: 2 }}>
            612 <span style={{ color: sT.ink3, fontSize: 14, fontStyle: 'normal' }}> @ 10</span>
          </div>
        </div>
        <div>
          <SEyebrow>Higher</SEyebrow>
          <div style={{ fontFamily: sT.serif, fontSize: 22, fontStyle: 'italic', marginTop: 2 }}>
            0
          </div>
        </div>
      </div>

      {/* Last sale + comps */}
      <div style={{
        marginTop: 14,
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14,
      }}>
        <div style={{ background: '#fff', border: '1px solid ' + sT.rule, borderRadius: 4, padding: '16px 20px' }}>
          <SEyebrow>Last sale · 5d</SEyebrow>
          <div style={{ fontFamily: sT.serif, fontSize: 30, fontStyle: 'italic', marginTop: 4 }}>
            $940
          </div>
          {/* mini range bar */}
          <div style={{ marginTop: 12 }}>
            <div style={{ height: 4, background: sT.ruleSoft, borderRadius: 2, position: 'relative' }}>
              <div style={{
                position: 'absolute', left: '24%', right: '12%', height: '100%',
                background: sT.ink, borderRadius: 2,
              }}/>
              <div style={{
                position: 'absolute', left: '64%', top: -3, width: 2, height: 10,
                background: sT.accent,
              }}/>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: sT.mono, fontSize: 10, color: sT.ink3, marginTop: 6 }}>
              <span>$880</span><span>14 COMPS · 90D</span><span>$1,020</span>
            </div>
          </div>
        </div>
        <div style={{ background: '#fff', border: '1px solid ' + sT.rule, borderRadius: 4, padding: '16px 20px' }}>
          <SEyebrow>Status</SEyebrow>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
            <div style={{
              width: 22, height: 22, borderRadius: '50%',
              background: sT.gold, color: '#1a1409',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11,
            }}>♥</div>
            <div>
              <div style={{ fontFamily: sT.serif, fontSize: 18, fontStyle: 'italic', lineHeight: 1 }}>
                On your want list
              </div>
              <div style={{ fontFamily: sT.mono, fontSize: 10, color: sT.ink3, marginTop: 4 }}>
                TARGET ≤ $980 · $940 IS UNDER
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ marginTop: 18, display: 'flex', gap: 8 }}>
        <button style={{
          flex: 1, padding: '14px 20px', background: sT.ink, color: sT.bg, border: 'none',
          borderRadius: 4, cursor: 'pointer', fontSize: 14, fontWeight: 500,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <Icon.add style={{ width: 14, height: 14 }}/> Save to collection
        </button>
        <button style={{
          padding: '14px 20px', background: 'transparent', color: sT.ink,
          border: '1px solid ' + sT.rule, borderRadius: 4, cursor: 'pointer', fontSize: 13,
        }}>
          Edit details
        </button>
        <button style={{
          padding: '14px 20px', background: 'transparent', color: sT.ink,
          border: '1px solid ' + sT.rule, borderRadius: 4, cursor: 'pointer', fontSize: 13,
        }}>
          Scan another
        </button>
      </div>

      {/* Disclaimer */}
      <div style={{
        marginTop: 16, padding: '10px 14px',
        background: sT.surface2, border: '1px dashed ' + sT.rule, borderRadius: 4,
        fontFamily: sT.mono, fontSize: 10, color: sT.ink3, letterSpacing: 0.5, lineHeight: 1.5,
      }}>
        POPULATION SNAPSHOT 19 MAY 03:14 · PSA POP IS LIVE 100/DAY · COMP DATA FROM EBAY BROWSE (v2 ROADMAP)
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
//  Manual cert input panel — for AC-03/AC-04 fallback
// ────────────────────────────────────────────────────────────────
function ManualPanel() {
  return (
    <div style={{
      background: sT.surface, border: '1px solid ' + sT.rule, borderRadius: 4,
      padding: '22px 24px',
    }}>
      <SEyebrow color={sT.warn}>⚠ Manual entry · OCR failed</SEyebrow>
      <div style={{
        fontFamily: sT.serif, fontSize: 32, fontStyle: 'italic', lineHeight: 1.1, marginTop: 8,
      }}>
        Type the cert.
      </div>
      <div style={{ fontSize: 13, color: sT.ink2, marginTop: 6, lineHeight: 1.5 }}>
        We'll still verify against the issuer. The number is printed on the slab label below the barcode.
      </div>

      <div style={{ marginTop: 22 }}>
        <SEyebrow>Grading company</SEyebrow>
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          {[
            { id: 'PSA', label: 'PSA', active: true },
            { id: 'BGS', label: 'BGS', active: false },
            { id: 'SGC', label: 'SGC', active: false },
            { id: '?',   label: 'Other / unsure', active: false },
          ].map(c => (
            <button key={c.id} style={{
              padding: '8px 14px', borderRadius: 4,
              background: c.active ? sT.ink : sT.surface,
              color: c.active ? sT.bg : sT.ink2,
              border: '1px solid ' + (c.active ? sT.ink : sT.rule),
              fontFamily: sT.sans, fontSize: 12, fontWeight: 500, cursor: 'pointer',
            }}>{c.label}</button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <SEyebrow>Cert number</SEyebrow>
        <div style={{
          marginTop: 8, display: 'flex', alignItems: 'center', gap: 0,
          border: '1px solid ' + sT.ink, borderRadius: 4, padding: '0 14px',
          background: '#fff',
        }}>
          <input
            defaultValue="48029"
            placeholder="00000000"
            style={{
              flex: 1, padding: '14px 0', border: 'none', outline: 'none', background: 'transparent',
              fontFamily: sT.mono, fontSize: 22, color: sT.ink, letterSpacing: 2,
            }}/>
          <span style={{ fontFamily: sT.mono, fontSize: 11, color: sT.ink3 }}>8 digits</span>
        </div>
      </div>

      <div style={{ marginTop: 14, fontFamily: sT.mono, fontSize: 10, color: sT.ink3, letterSpacing: 0.5, lineHeight: 1.5 }}>
        <div>· PSA · 7–9 DIGITS, NO LETTERS</div>
        <div>· BGS · 8–9 DIGITS</div>
        <div>· SGC · 7–10 DIGITS</div>
      </div>

      <div style={{ marginTop: 22, display: 'flex', gap: 8 }}>
        <button style={{
          flex: 1, padding: '12px 20px', background: sT.ink, color: sT.bg, border: 'none',
          borderRadius: 4, cursor: 'pointer', fontSize: 14, fontWeight: 500,
        }}>Look up cert</button>
        <button style={{
          padding: '12px 20px', background: 'transparent', color: sT.ink2,
          border: '1px solid ' + sT.rule, borderRadius: 4, cursor: 'pointer', fontSize: 13,
        }}>Add raw instead</button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
//  Provenance trace — fine typographic OCR→lookup chain
// ────────────────────────────────────────────────────────────────
function Provenance({ phase, ocrStep }) {
  const lines = [
    { t: '14:22:07.140', step: 1, text: 'Image received',           detail: '3.2 MB · HEIC · iPhone 15 Pro' },
    { t: '14:22:07.483', step: 2, text: 'OCR · GPT-4o vision',      detail: 'Read 5 fields · confidence high (0.94)' },
    { t: '14:22:07.940', step: 4, text: 'Cert dispatched',          detail: 'company=PSA · cert=48029174' },
    { t: '14:22:08.221', step: 5, text: 'PSA API · GetByCertNumber',detail: '0.281s · 200 OK' },
    { t: '14:22:08.246', step: 5, text: 'Card catalog · upsert',    detail: 'cat-bd83 · 2023 Topps Chrome Wembanyama RC' },
    { t: '14:22:08.262', step: 5, text: 'Pop snapshot stored',      detail: 'pop=612 · pop_higher=0 · cached 24h' },
  ];
  const visible = phase === 'result' ? lines : lines.slice(0, Math.min(ocrStep + 1, lines.length));
  return (
    <div style={{
      marginTop: 0, padding: '20px 24px',
      background: sT.surface2, border: '1px solid ' + sT.rule, borderRadius: 4,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <SEyebrow>Provenance · trace</SEyebrow>
        <SEyebrow>{phase === 'result' ? 'COMPLETE · 1.12s' : phase === 'scanning' ? 'RUNNING' : 'AWAITING IMAGE'}</SEyebrow>
      </div>
      <div style={{ marginTop: 14 }}>
        {visible.map((l, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '110px 1fr 1fr', gap: 12,
            padding: '8px 0', borderBottom: i < visible.length - 1 ? '1px solid ' + sT.ruleSoft : 'none',
            fontFamily: sT.mono, fontSize: 11, color: sT.ink2,
          }}>
            <span style={{ color: sT.ink3, letterSpacing: 0.4 }}>{l.t}</span>
            <span style={{ color: sT.ink }}>{l.text}</span>
            <span style={{ color: sT.ink3 }}>{l.detail}</span>
          </div>
        ))}
        {phase === 'idle' && (
          <div style={{ fontFamily: sT.mono, fontSize: 11, color: sT.ink3, fontStyle: 'italic' }}>
            No events yet.
          </div>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
//  Recent scans rail — borrowed from B
// ────────────────────────────────────────────────────────────────
function RecentScans() {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontFamily: sT.serif, fontSize: 28, fontStyle: 'italic', color: sT.ink }}>
          Recently scanned
        </div>
        <SEyebrow>Last 5 days · history →</SEyebrow>
      </div>
      <SRule/>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 22,
        padding: '24px 0',
      }}>
        {RECENT_SCANS.map((h, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
              <Slab holding={h} width={140} height={210} flavor="light"/>
            </div>
            <div style={{ fontFamily: sT.mono, fontSize: 10, color: sT.ink3, letterSpacing: 1 }}>
              {h.when.toUpperCase()}
            </div>
            <div style={{ fontFamily: sT.serif, fontSize: 18, fontStyle: 'italic', marginTop: 4, lineHeight: 1.1 }}>
              {h.player}
            </div>
            <div style={{ fontSize: 12, color: sT.ink2, marginTop: 4 }}>
              {h.year} {h.set} · {h.grade}
            </div>
            <div style={{ fontFamily: sT.mono, fontSize: 10, color: sT.ink3, marginTop: 6 }}>
              CERT {h.cert}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
//  State machine hook
// ────────────────────────────────────────────────────────────────
function useScanFlow(initial) {
  const [phase, setPhase] = React.useState(initial || 'idle');
  const [ocrStep, setOcrStep] = React.useState(0);
  const timersRef = React.useRef([]);

  // Sync external state changes from Tweaks
  React.useEffect(() => {
    if (initial && initial !== phase) {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
      setPhase(initial);
      setOcrStep(initial === 'result' ? 5 : 0);
    }
    // eslint-disable-next-line
  }, [initial]);

  const start = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setPhase('scanning');
    setOcrStep(0);
    [
      [300, () => setOcrStep(1)],
      [700, () => setOcrStep(2)],
      [1100, () => setOcrStep(3)],
      [1500, () => setOcrStep(4)],
      [1900, () => setOcrStep(5)],
      [2300, () => setPhase('result')],
    ].forEach(([t, fn]) => timersRef.current.push(setTimeout(fn, t)));
  };
  const reset = () => {
    timersRef.current.forEach(clearTimeout);
    setPhase('idle'); setOcrStep(0);
  };
  return { phase, ocrStep, start, reset, setPhase };
}

// ────────────────────────────────────────────────────────────────
//  DESKTOP
// ────────────────────────────────────────────────────────────────
function ScannerDesktop({ initialPhase }) {
  const { phase, ocrStep, start, reset } = useScanFlow(initialPhase);
  return (
    <div style={{
      width: '100%', minHeight: '100%', background: sT.bg, color: sT.ink, fontFamily: sT.sans,
      position: 'relative',
    }}>
      <SNavBar active="Scanner"/>

      <div style={{ padding: '32px 36px 24px' }}>
        {/* Page head */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 6 }}>
          <div>
            <SEyebrow>Scanner · cert lookup</SEyebrow>
            <div style={{
              fontFamily: sT.serif, fontSize: 56, lineHeight: 1.0, marginTop: 6, letterSpacing: -1.2,
            }}>
              Point at the <span style={{ fontStyle: 'italic', color: sT.accent }}>slab.</span>
              <span style={{ color: sT.ink3, fontStyle: 'italic', marginLeft: 12 }}>We'll do the rest.</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <SEyebrow>Today's quota</SEyebrow>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 6 }}>
              <span style={{ fontFamily: sT.serif, fontSize: 40, fontStyle: 'italic', lineHeight: 1 }}>9</span>
              <span style={{ fontFamily: sT.mono, fontSize: 14, color: sT.ink3 }}>/10 SCANS</span>
            </div>
            <div style={{ display: 'flex', gap: 2, marginTop: 8, justifyContent: 'flex-end' }}>
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} style={{
                  width: 12, height: 4, borderRadius: 1,
                  background: i < 1 ? sT.accent : sT.ink,
                }}/>
              ))}
            </div>
            <div style={{ fontFamily: sT.mono, fontSize: 10, color: sT.ink3, marginTop: 4, letterSpacing: 1 }}>
              RESETS 00:00 PT
            </div>
          </div>
        </div>

        <SRule style={{ margin: '24px 0' }}/>

        {/* Main: viewfinder + right panel */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24,
        }}>
          <Viewfinder phase={phase} ocrStep={ocrStep} onStart={start}/>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {phase === 'manual' ? <ManualPanel/> :
             phase === 'result' ? <MatchPanel/> :
             <ReadingPanel phase={phase} ocrStep={ocrStep}/>}
          </div>
        </div>

        {/* Provenance + reset row */}
        <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24 }}>
          <Provenance phase={phase} ocrStep={ocrStep}/>
          <div style={{
            background: sT.surface2, border: '1px dashed ' + sT.rule, borderRadius: 4,
            padding: '20px 24px',
          }}>
            <SEyebrow>Tips</SEyebrow>
            <div style={{ marginTop: 12, fontFamily: sT.serif, fontStyle: 'italic', fontSize: 18, color: sT.ink, lineHeight: 1.4 }}>
              Keep the label flat and parallel.
              Glare on the cert number is what kills accuracy.
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button onClick={start} style={{
                padding: '8px 14px', background: sT.ink, color: sT.bg, border: 'none',
                borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 500,
              }}>Run demo scan</button>
              <button onClick={reset} style={{
                padding: '8px 14px', background: 'transparent', color: sT.ink2,
                border: '1px solid ' + sT.rule, borderRadius: 4, cursor: 'pointer', fontSize: 12,
              }}>Reset</button>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 48 }}>
          <RecentScans/>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: 36, paddingTop: 18, borderTop: '1px solid ' + sT.rule,
          display: 'flex', justifyContent: 'space-between',
          fontFamily: sT.mono, fontSize: 10, color: sT.ink3, letterSpacing: 1.4,
        }}>
          <span>COLLECTORS TOOLKIT · SCANNER · v1.0</span>
          <span>OCR · GPT-4O · CERT · PSA / BGS / SGC · CACHE TTL 24H</span>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
//  MOBILE — viewfinder-first
// ────────────────────────────────────────────────────────────────
function ScannerMobile({ initialPhase }) {
  const { phase, ocrStep, start, reset } = useScanFlow(initialPhase);
  return (
    <IOSDevice width={390} height={844} dark={false}>
      <div style={{
        position: 'relative', width: '100%', height: '100%', overflow: 'hidden',
        background: sT.bg, color: sT.ink, fontFamily: sT.sans, paddingTop: 50,
      }}>
        {/* App bar */}
        <div style={{
          padding: '0 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 4, border: '1px solid ' + sT.rule,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: sT.ink2,
          }}>
            <Icon.chevron style={{ transform: 'rotate(180deg)' }}/>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 500, letterSpacing: -0.2 }}>Scanner</div>
            <div style={{ fontFamily: sT.mono, fontSize: 10, color: sT.ink3, letterSpacing: 1.4 }}>
              9 / 10 TODAY
            </div>
          </div>
          <div style={{
            width: 32, height: 32, borderRadius: 4, border: '1px solid ' + sT.rule,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: sT.ink2,
            fontFamily: sT.mono, fontSize: 11,
          }}>
            ⌄
          </div>
        </div>

        {/* Viewfinder — large */}
        <div style={{ padding: '0 16px' }}>
          <div style={{
            position: 'relative', aspectRatio: '3/4', borderRadius: 8,
            background: 'linear-gradient(160deg, #1c1c1f 0%, #0a0a0c 100%)',
            overflow: 'hidden',
          }}>
            {/* graph paper texture */}
            <div style={{
              position: 'absolute', inset: 0, opacity: 0.1,
              backgroundImage:
                'linear-gradient(rgba(212,162,76,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(212,162,76,0.1) 1px, transparent 1px)',
              backgroundSize: '14px 14px',
            }}/>
            {/* corner brackets */}
            {[
              { top: 14, left: 14, t: 2, l: 2 },
              { top: 14, right: 14, t: 2, r: 2 },
              { bottom: 14, left: 14, b: 2, l: 2 },
              { bottom: 14, right: 14, b: 2, r: 2 },
            ].map((c, i) => (
              <div key={i} style={{
                position: 'absolute', width: 26, height: 26,
                borderTop: c.t ? `${c.t}px solid ${sT.accent}` : 'none',
                borderBottom: c.b ? `${c.b}px solid ${sT.accent}` : 'none',
                borderLeft: c.l ? `${c.l}px solid ${sT.accent}` : 'none',
                borderRight: c.r ? `${c.r}px solid ${sT.accent}` : 'none',
                top: c.top, left: c.left, right: c.right, bottom: c.bottom,
              }}/>
            ))}
            {/* slab */}
            {(phase === 'scanning' || phase === 'result') && (
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: `translate(-50%, -50%) rotate(${phase === 'result' ? -2 : -4}deg)`,
                transition: 'transform .5s ease',
              }}>
                <Slab holding={SCANNED_CARD} width={150} height={225} flavor="dark"/>
              </div>
            )}
            {phase === 'scanning' && (
              <div style={{
                position: 'absolute', left: 30, right: 30, height: 1,
                background: 'linear-gradient(90deg, transparent, ' + sT.accent + ', transparent)',
                boxShadow: '0 0 14px ' + sT.accent,
                animation: 'sc-scan 1.8s ease-in-out infinite alternate',
              }}/>
            )}
            {phase === 'idle' && (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 12, color: '#f2efe7',
              }}>
                <Icon.camera style={{ width: 28, height: 28, color: sT.accent }}/>
                <div style={{
                  fontFamily: sT.serif, fontSize: 26, fontStyle: 'italic', lineHeight: 1.1,
                  textAlign: 'center', padding: '0 30px',
                }}>
                  Frame the label.
                </div>
                <div style={{ fontFamily: sT.mono, fontSize: 10, color: '#a09c92', letterSpacing: 1.4 }}>
                  PSA · BGS · SGC
                </div>
              </div>
            )}
            {phase === 'result' && (
              <div style={{
                position: 'absolute', top: 16, right: 16,
                background: '#fff', padding: '6px 10px', borderRadius: 3,
                fontFamily: sT.mono, fontSize: 10, letterSpacing: 1, color: sT.ink,
                transform: 'rotate(2deg)',
                boxShadow: '0 6px 16px rgba(0,0,0,0.4)',
              }}>POP 612 / 0↑</div>
            )}
            {/* status */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              padding: '10px 16px',
              background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.7))',
              color: '#f2efe7', fontFamily: sT.mono, fontSize: 10, letterSpacing: 1.2,
              display: 'flex', justifyContent: 'space-between',
            }}>
              <span>
                {phase === 'idle' && '· AIM · KEEP LABEL FLAT'}
                {phase === 'scanning' && '● OCR · GPT-4O'}
                {phase === 'result' && '✓ CERT 48029174 · PSA'}
              </span>
              <span style={{ color: sT.accent }}>
                {phase === 'idle' && 'READY'}
                {phase === 'scanning' && (ocrStep >= 4 ? 'LOOKUP' : `OCR ${ocrStep*20}%`)}
                {phase === 'result' && '1.1s'}
              </span>
            </div>
          </div>
        </div>

        {/* Below viewfinder — adapts to phase */}
        <div style={{
          padding: '16px 20px',
          height: 'calc(100% - 50px - 50px - 90px)', overflowY: 'auto',
        }}>
          {phase === 'idle' && (
            <>
              <div style={{ fontFamily: sT.serif, fontSize: 30, lineHeight: 1.1, letterSpacing: -0.5 }}>
                Drop a slab photo or use your <span style={{ fontStyle: 'italic', color: sT.accent }}>camera.</span>
              </div>
              <div style={{ fontSize: 13, color: sT.ink2, marginTop: 10, lineHeight: 1.5 }}>
                We'll read the cert, verify with PSA/BGS/SGC, and save to your collection in one tap.
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 18 }}>
                <div style={{ flex: 1 }}>
                  <SEyebrow>Today</SEyebrow>
                  <div style={{ fontFamily: sT.serif, fontSize: 22, fontStyle: 'italic', marginTop: 4 }}>9/10 left</div>
                </div>
                <div style={{ flex: 1 }}>
                  <SEyebrow>All time</SEyebrow>
                  <div style={{ fontFamily: sT.serif, fontSize: 22, fontStyle: 'italic', marginTop: 4 }}>84 scans</div>
                </div>
              </div>
            </>
          )}
          {phase === 'scanning' && (
            <div>
              <SEyebrow color={sT.accent}>● Reading the label</SEyebrow>
              <div style={{ marginTop: 14 }}>
                {[
                  { label: 'CERT', value: '48029174', n: 1 },
                  { label: 'GRADE', value: 'PSA 10', n: 2 },
                  { label: 'PLAYER', value: 'Victor Wembanyama', n: 3 },
                  { label: 'YEAR · SET', value: '2023 Topps Chrome', n: 4 },
                ].map(f => (
                  <div key={f.label} style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: '10px 0', borderBottom: '1px solid ' + sT.ruleSoft,
                  }}>
                    <SEyebrow>{f.label}</SEyebrow>
                    <span style={{
                      fontFamily: f.label === 'CERT' ? sT.mono : sT.serif,
                      fontStyle: f.label === 'CERT' ? 'normal' : 'italic',
                      fontSize: 14, color: ocrStep >= f.n ? sT.ink : sT.ink4,
                    }}>{ocrStep >= f.n ? f.value : '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {phase === 'result' && (
            <div>
              <SEyebrow color={sT.accent}>● MATCH · PSA 48029174</SEyebrow>
              <div style={{
                fontFamily: sT.serif, fontSize: 34, lineHeight: 1.0, marginTop: 8, letterSpacing: -0.5,
              }}>
                Victor <span style={{ fontStyle: 'italic', color: sT.accent }}>Wembanyama.</span>
              </div>
              <div style={{ fontSize: 12, color: sT.ink2, marginTop: 4 }}>
                2023 Topps Chrome RC · #180 · PSA 10
              </div>
              <div style={{
                marginTop: 14, padding: '10px 14px',
                background: sT.gold + '22', border: '1px solid ' + sT.gold,
                borderRadius: 4, display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <div style={{
                  width: 18, height: 18, borderRadius: '50%',
                  background: sT.gold, color: '#1a1409',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10,
                }}>♥</div>
                <div style={{ flex: 1, fontSize: 12 }}>
                  <strong>On your want list</strong> · target ≤ $980 · $940 is under
                </div>
              </div>
              <div style={{
                marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
              }}>
                <div style={{ padding: '10px 12px', background: '#fff', borderRadius: 4, border: '1px solid ' + sT.rule }}>
                  <SEyebrow>POP@10</SEyebrow>
                  <div style={{ fontFamily: sT.serif, fontSize: 20, fontStyle: 'italic', marginTop: 2 }}>612</div>
                </div>
                <div style={{ padding: '10px 12px', background: '#fff', borderRadius: 4, border: '1px solid ' + sT.rule }}>
                  <SEyebrow>HIGHER</SEyebrow>
                  <div style={{ fontFamily: sT.serif, fontSize: 20, fontStyle: 'italic', marginTop: 2 }}>0</div>
                </div>
                <div style={{ padding: '10px 12px', background: '#fff', borderRadius: 4, border: '1px solid ' + sT.rule }}>
                  <SEyebrow>LAST</SEyebrow>
                  <div style={{ fontFamily: sT.serif, fontSize: 20, fontStyle: 'italic', marginTop: 2 }}>$940</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button style={{
                  flex: 1, padding: '12px 14px', background: sT.ink, color: sT.bg, border: 'none',
                  borderRadius: 4, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                }}>Save to collection</button>
                <button onClick={reset} style={{
                  padding: '12px 14px', background: 'transparent', color: sT.ink,
                  border: '1px solid ' + sT.rule, borderRadius: 4, fontSize: 12, cursor: 'pointer',
                }}>Scan another</button>
              </div>
            </div>
          )}
          {phase === 'manual' && (
            <div>
              <SEyebrow color={sT.warn}>⚠ Couldn't read · manual entry</SEyebrow>
              <div style={{ fontFamily: sT.serif, fontSize: 28, fontStyle: 'italic', lineHeight: 1.1, marginTop: 10 }}>
                Type the cert.
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 16 }}>
                {['PSA','BGS','SGC','Other'].map((c,i) => (
                  <button key={c} style={{
                    flex: 1, padding: '10px 0', borderRadius: 4,
                    background: i === 0 ? sT.ink : 'transparent',
                    color: i === 0 ? sT.bg : sT.ink2,
                    border: '1px solid ' + (i === 0 ? sT.ink : sT.rule),
                    fontSize: 12, fontWeight: 500, cursor: 'pointer',
                  }}>{c}</button>
                ))}
              </div>
              <div style={{
                marginTop: 12, padding: '0 14px', border: '1px solid ' + sT.ink, borderRadius: 4,
                background: '#fff',
              }}>
                <input
                  defaultValue="48029"
                  style={{
                    width: '100%', padding: '14px 0', border: 'none', outline: 'none', background: 'transparent',
                    fontFamily: sT.mono, fontSize: 20, color: sT.ink, letterSpacing: 2,
                  }}/>
              </div>
              <button style={{
                width: '100%', marginTop: 12, padding: '12px 14px', background: sT.ink, color: sT.bg, border: 'none',
                borderRadius: 4, fontSize: 13, fontWeight: 500, cursor: 'pointer',
              }}>Look up cert</button>
            </div>
          )}
        </div>

        {/* Bottom — shutter (idle) or controls */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          padding: '10px 16px 30px',
          borderTop: '1px solid ' + sT.rule, background: sT.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ width: 44, color: sT.ink2 }}>
            <Icon.collection/>
          </div>
          <button onClick={phase === 'idle' ? start : reset} style={{
            width: 60, height: 60, borderRadius: '50%',
            background: phase === 'scanning' ? sT.surface : sT.ink,
            border: phase === 'scanning' ? '2px solid ' + sT.accent : 'none',
            color: sT.bg, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 6px 18px rgba(20,17,13,0.18)',
          }}>
            {phase === 'idle' && <Icon.camera style={{ width: 22, height: 22 }}/>}
            {phase === 'scanning' && <div style={{
              width: 18, height: 18, borderRadius: '50%',
              border: '2px solid ' + sT.accent, borderTopColor: 'transparent',
              animation: 'sc-spin 0.9s linear infinite',
            }}/>}
            {(phase === 'result' || phase === 'manual') && (
              <span style={{ fontSize: 22, color: sT.bg }}>↻</span>
            )}
          </button>
          <div style={{ width: 44, color: sT.ink2 }}>
            <Icon.import/>
          </div>
        </div>
        <style>{`
          @keyframes sc-spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    </IOSDevice>
  );
}

Object.assign(window, { ScannerDesktop, ScannerMobile, sT });
