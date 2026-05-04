// trendzip — dark-mode mobile-first landing (v2: cute + playful)

const TWEAKS_DEFAULT = /*EDITMODE-BEGIN*/{
  "accent": "cyan",
  "wordmarkStyle": "stack",
  "showTicker": true,
  "showGrain": true,
  "showSparkles": true,
  "tagline": "요즘 MZ가 보는 게 궁금하다면"
}/*EDITMODE-END*/;

const ACCENTS = {
  cyan:    { primary: 'oklch(0.92 0.18 200)', primarySoft: 'oklch(0.92 0.18 200 / 0.22)', secondary: 'oklch(0.78 0.22 340)' },
  magenta: { primary: 'oklch(0.78 0.22 340)', primarySoft: 'oklch(0.78 0.22 340 / 0.24)', secondary: 'oklch(0.92 0.18 200)' },
  lime:    { primary: 'oklch(0.94 0.22 130)', primarySoft: 'oklch(0.94 0.22 130 / 0.22)', secondary: 'oklch(0.78 0.22 340)' },
};

// Round/playful display font stack
const ROUND = '"Quicksand", "Pretendard", system-ui';
const KOR   = 'Pretendard, system-ui';

// ──────────────────────────────────────────────
// Trending ticker
// ──────────────────────────────────────────────
const TICKER_ITEMS = [
  '뉴진스 직캠', '런닝맨 클립', 'RIIZE 리액션', '지락실3 하이라이트', '아이브 무대',
  '먹방 ASMR', '스우파2 비하인드', '로제 APT.', '플레이브 라이브', '정국 GOLDEN',
  'KBO 끝내기', '일본 vlog', '치지직 스트리밍', '에스파 안무영상',
];

function Ticker({ accent }) {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div style={{
      height: 34,
      background: '#0a0a0a',
      borderTop: '1px solid #1a1a1a',
      overflow: 'hidden',
      display: 'flex', alignItems: 'center',
      maskImage: 'linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)',
      WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)',
    }}>
      <div style={{
        display: 'flex', gap: 28, whiteSpace: 'nowrap',
        animation: 'tz-ticker 38s linear infinite',
        fontFamily: KOR,
        fontSize: 12, fontWeight: 500,
        color: 'rgba(255,255,255,0.46)',
        letterSpacing: '-0.005em',
      }}>
        {items.map((t, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 5, height: 5, borderRadius: 99,
              background: accent.primary,
              boxShadow: `0 0 10px ${accent.primary}`,
            }} />
            #{t}
          </span>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// LIVE pulse badge
// ──────────────────────────────────────────────
function LiveBadge({ accent }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      padding: '7px 14px 7px 12px',
      border: '1px solid rgba(255,255,255,0.14)',
      borderRadius: 999,
      background: 'rgba(255,255,255,0.04)',
      backdropFilter: 'blur(8px)',
      fontFamily: ROUND,
      fontSize: 11.5, fontWeight: 600,
      color: 'rgba(255,255,255,0.85)',
      letterSpacing: '0.02em',
    }}>
      <span style={{ position: 'relative', width: 7, height: 7 }}>
        <span style={{
          position: 'absolute', inset: 0, borderRadius: 99,
          background: '#ff3b3b',
          animation: 'tz-pulse-red 1.6s ease-out infinite',
        }} />
        <span style={{
          position: 'absolute', inset: 0, borderRadius: 99,
          background: '#ff3b3b',
          boxShadow: '0 0 10px #ff3b3b',
        }} />
      </span>
      <span style={{ color: '#fff' }}>LIVE</span>
      <span style={{ color: 'rgba(255,255,255,0.55)' }}>·</span>
      <span style={{ color: 'rgba(255,255,255,0.85)' }}>지금 유튜브 트렌드</span>
    </div>
  );
}

// ──────────────────────────────────────────────
// Wordmark — round, soft, with a little heart that bobs
// ──────────────────────────────────────────────
function Wordmark({ accent, style }) {
  if (style === 'stack') {
    return (
      <div style={{
        fontFamily: ROUND,
        fontWeight: 700,
        fontSize: 92,
        lineHeight: 0.92,
        letterSpacing: '-0.04em',
        color: '#fff',
        textAlign: 'center',
        position: 'relative',
      }}>
        <div>trend</div>
        <div style={{
          color: accent.primary,
          textShadow: `0 0 28px ${accent.primarySoft}, 0 0 60px ${accent.primarySoft}`,
          display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4,
        }}>
          <span>zip</span>
          <span style={{
            display: 'inline-block',
            color: accent.secondary,
            fontSize: 56,
            transform: 'translateY(-6px)',
            animation: 'tz-bounce 2.4s ease-in-out infinite',
            textShadow: `0 0 20px ${accent.primarySoft}`,
          }}>♡</span>
        </div>
      </div>
    );
  }
  return (
    <div style={{
      fontFamily: ROUND,
      fontWeight: 700,
      fontSize: 64,
      lineHeight: 1,
      letterSpacing: '-0.035em',
      color: '#fff',
      textAlign: 'center',
    }}>
      trend<span style={{
        color: accent.primary,
        textShadow: `0 0 24px ${accent.primarySoft}`,
      }}>zip♡</span>
    </div>
  );
}

// ──────────────────────────────────────────────
// Generation selector button
// ──────────────────────────────────────────────
function GenButton({ label, sublabel, emoji, accent, gradient, sparkles, onClick, pressed, hovered, onEnter, onLeave, onPressDown, onPressUp }) {
  const sparklePositions = [
    { top: -8, right: '18%', delay: 0,   size: 14, char: '✨' },
    { bottom: -6, left: '22%', delay: 1.2, size: 11, char: '✨' },
  ];

  return (
    <button
      onClick={onClick}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onMouseDown={onPressDown}
      onMouseUp={onPressUp}
      onTouchStart={onPressDown}
      onTouchEnd={onPressUp}
      style={{
        flex: 1,
        aspectRatio: '1 / 1.15',
        borderRadius: 32,
        border: 'none',
        padding: 0,
        position: 'relative',
        overflow: 'visible',
        cursor: 'pointer',
        background: gradient,
        boxShadow: hovered
          ? `0 24px 50px -14px ${accent.primarySoft}, 0 0 0 4px rgba(255,255,255,0.05)`
          : '0 12px 30px -14px rgba(0,0,0,0.7)',
        transition: 'transform 240ms cubic-bezier(.2,.9,.3,1.4), box-shadow 220ms ease',
        transform: pressed
          ? 'scale(0.94) rotate(-1.5deg)'
          : hovered
            ? `scale(1.04) rotate(${label === '10대' ? '-1deg' : '1deg'})`
            : 'scale(1)',
        fontFamily: KOR,
      }}
    >
      {/* glossy sheen */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 32, pointerEvents: 'none',
        background: 'linear-gradient(160deg, rgba(255,255,255,0.28), rgba(255,255,255,0) 42%)',
      }} />

      {/* inner softlight rim */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 32, pointerEvents: 'none',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -1px 0 rgba(0,0,0,0.12)',
      }} />

      {/* sparkles */}
      {sparkles && sparklePositions.map((s, i) => (
        <span key={i} style={{
          position: 'absolute',
          top: s.top, left: s.left, right: s.right, bottom: s.bottom,
          fontSize: s.size, lineHeight: 1,
          animation: `tz-sparkle 2.4s ease-in-out ${s.delay}s infinite`,
          filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.7))',
          pointerEvents: 'none',
        }}>{s.char}</span>
      ))}

      {/* corner sub-label */}
      <div style={{
        position: 'absolute', top: 18, left: 20,
        fontFamily: ROUND,
        fontSize: 11.5, fontWeight: 700,
        color: 'rgba(0,0,0,0.62)',
        letterSpacing: '0.02em',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span style={{ fontSize: 14 }}>{emoji}</span>
        {sublabel}
      </div>

      {/* huge label */}
      <div style={{
        position: 'absolute', left: 20, bottom: 18, right: 20,
        textAlign: 'left',
      }}>
        <div style={{
          fontFamily: ROUND,
          fontWeight: 700,
          fontSize: 70,
          lineHeight: 0.9,
          letterSpacing: '-0.04em',
          color: '#0a0a0a',
        }}>
          {label.replace('대', '')}
          <span style={{ fontSize: 32, marginLeft: 2, verticalAlign: '26px', opacity: 0.78 }}>대</span>
        </div>
        <div style={{
          marginTop: 8,
          fontFamily: KOR,
          fontSize: 12.5, fontWeight: 600,
          color: 'rgba(0,0,0,0.66)',
          letterSpacing: '-0.005em',
        }}>
          {label === '10대' ? '중·고등학생 트렌드' : '대학생 · 사회초년생'}
        </div>
      </div>

      {/* hover wave halo */}
      <div style={{
        position: 'absolute', inset: -8, borderRadius: 36, pointerEvents: 'none',
        border: `2px dashed rgba(255,255,255,${hovered ? 0.35 : 0})`,
        animation: hovered ? 'tz-spin 8s linear infinite' : 'none',
        transition: 'border-color 240ms',
      }} />
    </button>
  );
}

// ──────────────────────────────────────────────
// Main screen
// ──────────────────────────────────────────────
function TrendzipLanding({ tweaks }) {
  const accent = ACCENTS[tweaks.accent] || ACCENTS.cyan;
  const [hover, setHover] = React.useState(null);
  const [pressed, setPressed] = React.useState(null);
  const [picked, setPicked] = React.useState(null);

  const handlePick = (gen) => {
    setPicked(gen);
    setTimeout(() => setPicked(null), 1100);
  };

  // 10대: pink → mint   |   20대: orange → yellow
  const teenGradient = 'linear-gradient(155deg, oklch(0.82 0.16 0) 0%, oklch(0.9 0.14 165) 100%)';
  const twentyGradient = 'linear-gradient(155deg, oklch(0.78 0.18 50) 0%, oklch(0.92 0.17 95) 100%)';

  return (
    <div style={{
      width: '100%', height: '100%',
      background: '#0a0a0a',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: KOR,
      color: '#fff',
    }}>
      {/* Ambient color blobs */}
      <div style={{
        position: 'absolute', top: '-25%', left: '-35%',
        width: '85%', height: '55%', borderRadius: '50%',
        background: accent.primary, opacity: 0.05,
        filter: 'blur(90px)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-15%', right: '-35%',
        width: '85%', height: '45%', borderRadius: '50%',
        background: 'oklch(0.85 0.18 60)', opacity: 0.04,
        filter: 'blur(90px)', pointerEvents: 'none',
      }} />

      {/* Grain */}
      {tweaks.showGrain && (
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          opacity: 0.45, mixBlendMode: 'overlay',
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.5 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`,
        }} />
      )}

      {/* Header bar (below Dynamic Island) */}
      <div style={{
        position: 'absolute', top: 60, left: 0, right: 0,
        zIndex: 4,
        background: '#0a0a0a',
        borderBottom: '1px solid #222222',
      }}>
        <div style={{
          height: 56,
          display: 'grid', gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          padding: '0 16px', gap: 12,
        }}>
          <div style={{
            fontFamily: ROUND, fontSize: 18, fontWeight: 700,
            letterSpacing: '-0.02em', color: '#fff',
            display: 'flex', alignItems: 'baseline', gap: 1,
          }}>
            tz<span style={{ color: accent.primary }}>♡</span>
          </div>
          <div />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '5px 10px',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 999,
              fontFamily: ROUND, fontSize: 10.5, fontWeight: 700,
              color: '#fff', letterSpacing: '0.04em',
            }}>
              <span style={{ position: 'relative', width: 6, height: 6 }}>
                <span style={{
                  position: 'absolute', inset: 0, borderRadius: 99,
                  background: '#ff3b3b',
                  animation: 'tz-pulse-red 1.6s ease-out infinite',
                }} />
                <span style={{
                  position: 'absolute', inset: 0, borderRadius: 99,
                  background: '#ff3b3b',
                  boxShadow: '0 0 8px #ff3b3b',
                }} />
              </span>
              LIVE
            </div>
          </div>
        </div>
        {tweaks.showTicker && <Ticker accent={accent} />}
      </div>

      {/* Old top marker (removed) */}
      <div style={{ display: 'none' }}>
        <div style={{
          fontFamily: ROUND,
          fontSize: 14, fontWeight: 700, letterSpacing: '-0.02em',
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          tz<span style={{ color: accent.primary }}>♡</span>
        </div>
        <div style={{
          fontFamily: ROUND,
          fontSize: 11, fontWeight: 600,
          color: 'rgba(255,255,255,0.5)', letterSpacing: '0.02em',
        }}>
          v0.4 BETA
        </div>
      </div>

      {/* (ticker now lives in header) */}

      {/* Hero */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '0 22px',
        zIndex: 2,
      }}>
        <div style={{ marginBottom: 30 }}>
          <LiveBadge accent={accent} />
        </div>

        <Wordmark accent={accent} style={tweaks.wordmarkStyle} />

        {/* Tagline — lighter, bigger, friendlier */}
        <div style={{
          marginTop: 26,
          textAlign: 'center',
          fontFamily: KOR,
          fontSize: 18,
          fontWeight: 400,
          color: 'rgba(255,255,255,0.86)',
          letterSpacing: '-0.015em',
          lineHeight: 1.5,
          textWrap: 'pretty',
        }}>
          {tweaks.tagline}
          <span style={{ marginLeft: 4 }}>✨</span>
        </div>
        <div style={{
          marginTop: 10,
          textAlign: 'center',
          fontFamily: ROUND,
          fontSize: 11.5,
          fontWeight: 600,
          color: 'rgba(255,255,255,0.42)',
          letterSpacing: '0.02em',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          🔥 매일 업데이트되는 한국 유튜브 펄스
        </div>

        {/* Generation buttons */}
        <div style={{
          marginTop: 44,
          width: '100%',
          display: 'flex', gap: 14,
          paddingInline: 4,
        }}>
          <GenButton
            label="10대" sublabel="GEN α · Z" emoji="🎀" tilt="-1deg"
            accent={accent} gradient={teenGradient} sparkles={tweaks.showSparkles}
            hovered={hover === 'teen'} pressed={pressed === 'teen' || picked === 'teen'}
            onEnter={() => setHover('teen')} onLeave={() => setHover(null)}
            onPressDown={() => setPressed('teen')} onPressUp={() => setPressed(null)}
            onClick={() => handlePick('teen')}
          />
          <GenButton
            label="20대" sublabel="MZ · GEN Z" emoji="🍑" tilt="1deg"
            accent={accent} gradient={twentyGradient} sparkles={tweaks.showSparkles}
            hovered={hover === 'twenty'} pressed={pressed === 'twenty' || picked === 'twenty'}
            onEnter={() => setHover('twenty')} onLeave={() => setHover(null)}
            onPressDown={() => setPressed('twenty')} onPressUp={() => setPressed(null)}
            onClick={() => handlePick('twenty')}
          />
        </div>

        <div style={{
          marginTop: 26,
          fontFamily: KOR,
          fontSize: 12.5,
          color: 'rgba(255,255,255,0.5)',
          letterSpacing: '-0.01em',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span>나중에 바꿀 수 있어요</span>
          <span style={{ width: 3, height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.3)' }} />
          <span style={{ color: 'rgba(255,255,255,0.7)' }}>1초만에 시작 ✨</span>
        </div>
      </div>

      {/* Picked toast */}
      {picked && (
        <div style={{
          position: 'absolute', left: '50%', bottom: 80,
          transform: 'translateX(-50%)',
          padding: '12px 20px',
          background: '#fff',
          color: '#0a0a0a',
          borderRadius: 999,
          fontFamily: ROUND,
          fontSize: 13.5, fontWeight: 700,
          letterSpacing: '-0.01em',
          boxShadow: `0 12px 40px ${accent.primarySoft}`,
          animation: 'tz-toast 240ms cubic-bezier(.2,.9,.3,1.4)',
          zIndex: 5,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span>{picked === 'teen' ? '🎀' : '🍊'}</span>
          {picked === 'teen' ? '10대' : '20대'} 트렌드 불러오는 중…
        </div>
      )}

      <style>{`
        @keyframes tz-ticker {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @keyframes tz-pulse {
          0% { transform: scale(1); opacity: 0.9; }
          100% { transform: scale(2.6); opacity: 0; }
        }
        @keyframes tz-pulse-red {
          0% { transform: scale(1); opacity: 0.85; }
          100% { transform: scale(2.8); opacity: 0; }
        }
        @keyframes tz-toast {
          from { transform: translateX(-50%) translateY(8px) scale(0.9); opacity: 0; }
          to { transform: translateX(-50%) translateY(0) scale(1); opacity: 1; }
        }
        @keyframes tz-sparkle {
          0%, 100% { opacity: 0; transform: scale(0.4) rotate(0deg); }
          40% { opacity: 1; transform: scale(1.1) rotate(15deg); }
          60% { opacity: 1; transform: scale(1) rotate(-10deg); }
        }
        @keyframes tz-bounce {
          0%, 100% { transform: translateY(-6px) rotate(-6deg); }
          50% { transform: translateY(-14px) rotate(8deg); }
        }
        @keyframes tz-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ──────────────────────────────────────────────
// Tweaks
// ──────────────────────────────────────────────
function Tweaks({ tweaks, setTweak }) {
  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Look" />
      <TweakRadio
        label="Accent"
        value={tweaks.accent}
        onChange={(v) => setTweak('accent', v)}
        options={[
          { value: 'cyan', label: 'Cyan' },
          { value: 'magenta', label: 'Magenta' },
          { value: 'lime', label: 'Lime' },
        ]}
      />
      <TweakRadio
        label="Wordmark"
        value={tweaks.wordmarkStyle}
        onChange={(v) => setTweak('wordmarkStyle', v)}
        options={[
          { value: 'stack', label: 'Stacked' },
          { value: 'inline', label: 'Inline' },
        ]}
      />
      <TweakSection label="Effects" />
      <TweakToggle label="Trending ticker" value={tweaks.showTicker} onChange={(v) => setTweak('showTicker', v)} />
      <TweakToggle label="Button sparkles" value={tweaks.showSparkles} onChange={(v) => setTweak('showSparkles', v)} />
      <TweakToggle label="Film grain" value={tweaks.showGrain} onChange={(v) => setTweak('showGrain', v)} />
      <TweakSection label="Copy" />
      <TweakText label="Tagline" value={tweaks.tagline} onChange={(v) => setTweak('tagline', v)} />
    </TweaksPanel>
  );
}

// ──────────────────────────────────────────────
// App root
// ──────────────────────────────────────────────
function App() {
  const [tweaks, setTweak] = useTweaks(TWEAKS_DEFAULT);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#070708',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
      fontFamily: KOR,
    }}>
      <IOSDevice width={390} height={844} dark={true}>
        <TrendzipLanding tweaks={tweaks} />
      </IOSDevice>
      <Tweaks tweaks={tweaks} setTweak={setTweak} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
