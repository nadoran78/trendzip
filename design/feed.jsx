// trendzip — Feed page
// Design system: dark #0a0a0a, cyan + hot pink accents, playful but premium

const FEED_TWEAKS = /*EDITMODE-BEGIN*/{
  "generation": "teen"
}/*EDITMODE-END*/;

const TOKENS = {
  bg: '#0a0a0a',
  card: '#1a1a1a',
  text: '#ffffff',
  textDim: '#888888',
  cyan: '#00e5ff',
  pink: '#ff2d9b',
  red: '#ff3b3b',
};

const ROUND = '"Quicksand", "Pretendard", system-ui';
const KOR   = 'Pretendard, system-ui';

// ──────────────────────────────────────────────
// Mock data
// ──────────────────────────────────────────────
const TEEN_FEED = [
  { id: 1, title: '뉴진스 "Supernatural" 안무 챌린지 폭발한 이유 ⚡', channel: '플레이리스트 PICK', channelMeta: '음악 · 287만', views: '1,284만', posted: '2일 전', tags: ['뉴진스', '챌린지', 'KPOP'], thumbColor: 'linear-gradient(135deg, #ff2d9b 0%, #7b2dff 50%, #00e5ff 100%)', badge: 'HOT' },
  { id: 2, title: '고등학생들이 진짜 쓰는 신조어 TOP10 (2026 ver)', channel: '슈카월드 코믹스', channelMeta: '엔터 · 132만', views: '892만', posted: '5일 전', tags: ['신조어', '학교생활', '챌린지'], thumbColor: 'linear-gradient(135deg, #ffb86b 0%, #ff2d9b 100%)', badge: '🔥 급상승' },
  { id: 3, title: 'RIIZE 첫 단독 콘서트 비하인드 클립 모음', channel: 'SMTOWN', channelMeta: '공식 · 2,140만', views: '4,123만', posted: '1주 전', tags: ['RIIZE', 'KPOP', '콘서트'], thumbColor: 'linear-gradient(135deg, #00e5ff 0%, #5b6dff 100%)', badge: null },
  { id: 4, title: '교복 위에 입는 Y2K 후드 스타일링 6가지', channel: '하늘다람지', channelMeta: '패션 · 88만', views: '331만', posted: '3일 전', tags: ['Y2K', '패션', '스타일링'], thumbColor: 'linear-gradient(135deg, #ff8ad4 0%, #b6ffce 100%)', badge: null },
  { id: 5, title: '편의점 신상 디저트 6종 솔직 후기 (가성비 1위는?)', channel: '입짧은햇님', channelMeta: '먹방 · 412만', views: '673만', posted: '6일 전', tags: ['먹방', '편의점', '리뷰'], thumbColor: 'linear-gradient(135deg, #ffd86b 0%, #ff7a59 100%)', badge: null },
];

const TWENTY_FEED = [
  { id: 1, title: '월급 250 사회초년생 통장 쪼개기 진짜 방법', channel: '머니그라피', channelMeta: '경제 · 198만', views: '2,134만', posted: '4일 전', tags: ['재테크', '사회초년생', '월급관리'], thumbColor: 'linear-gradient(135deg, #ffb86b 0%, #ffe16b 100%)', badge: '🔥 급상승' },
  { id: 2, title: '20대 직장인이 매일 듣는 출근길 플레이리스트', channel: 'essential;', channelMeta: '음악 · 312만', views: '987만', posted: '1주 전', tags: ['플리', '출근길', 'lofi'], thumbColor: 'linear-gradient(135deg, #5b6dff 0%, #00e5ff 100%)', badge: null },
  { id: 3, title: '도쿄 4박5일 vlog · 혼자 떠난 첫 일본 여행', channel: '하루키', channelMeta: '여행 · 76만', views: '442만', posted: '3일 전', tags: ['vlog', '도쿄', '혼자여행'], thumbColor: 'linear-gradient(135deg, #ff8ad4 0%, #ffd86b 100%)', badge: 'HOT' },
  { id: 4, title: '취준생들이 진짜 보는 자기소개서 첨삭 라이브', channel: '합격의 정석', channelMeta: '교육 · 54만', views: '218만', posted: '2일 전', tags: ['취업', '자소서', '취준'], thumbColor: 'linear-gradient(135deg, #00e5ff 0%, #b6ffce 100%)', badge: null },
  { id: 5, title: '자취방 6평 인테리어 BEFORE / AFTER', channel: '미니멀유목민', channelMeta: '라이프 · 121만', views: '561만', posted: '5일 전', tags: ['자취', '인테리어', '룸투어'], thumbColor: 'linear-gradient(135deg, #b6ffce 0%, #5b6dff 100%)', badge: null },
];

// Header
function Header({ generation, onChange }) {
  return (
    <div style={{
      position: 'sticky', top: 60, zIndex: 10,
      marginTop: 60,
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
          letterSpacing: '-0.02em', color: TOKENS.text,
          display: 'flex', alignItems: 'baseline', gap: 1,
        }}>
          tz<span style={{ color: TOKENS.cyan }}>♡</span>
        </div>

        <div style={{
          display: 'inline-flex',
          background: TOKENS.card,
          borderRadius: 24, padding: 4,
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: 'inset 0 1px 0 rgba(0,0,0,0.4)',
        }}>
          {[
            { id: 'teen', emoji: '🎀', label: '10대',
              gradient: 'linear-gradient(155deg, #ff8ad4 0%, #b6ffce 100%)',
              glow: '0 0 0 1px rgba(255,138,212,0.5), 0 6px 18px -6px rgba(255,138,212,0.55)' },
            { id: 'twenty', emoji: '🍑', label: '20대',
              gradient: 'linear-gradient(155deg, #ffb86b 0%, #ffe16b 100%)',
              glow: '0 0 0 1px rgba(255,184,107,0.5), 0 6px 18px -6px rgba(255,184,107,0.55)' },
          ].map((t) => {
            const active = generation === t.id;
            return (
              <button key={t.id} onClick={() => onChange(t.id)}
                style={{
                  border: 'none', cursor: 'pointer',
                  padding: active ? '8px 16px' : '8px 14px',
                  borderRadius: 20,
                  background: active ? t.gradient : 'transparent',
                  color: active ? '#0a0a0a' : TOKENS.textDim,
                  fontFamily: KOR, fontSize: 13.5, fontWeight: 800,
                  letterSpacing: '-0.01em',
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  transition: 'all 220ms cubic-bezier(.2,.9,.3,1.2)',
                  boxShadow: active ? t.glow : 'none',
                  textShadow: active ? '0 1px 0 rgba(255,255,255,0.3)' : 'none',
                }}>
                <span style={{ fontSize: 13 }}>{t.emoji}</span>
                {t.label}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '5px 10px',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 999,
            fontFamily: ROUND, fontSize: 10.5, fontWeight: 700,
            color: TOKENS.text, letterSpacing: '0.04em',
          }}>
            <span style={{ position: 'relative', width: 6, height: 6 }}>
              <span style={{
                position: 'absolute', inset: 0, borderRadius: 99,
                background: TOKENS.red,
                animation: 'tzf-pulse 1.6s ease-out infinite',
              }} />
              <span style={{
                position: 'absolute', inset: 0, borderRadius: 99,
                background: TOKENS.red,
                boxShadow: `0 0 8px ${TOKENS.red}`,
              }} />
            </span>
            LIVE
          </div>
        </div>
      </div>

      <Ticker generation={generation} />
    </div>
  );
}

const TICKER_TEEN = ['뉴진스 직캠', '챌린지', 'RIIZE 리액션', '신조어', 'Y2K', '아이브 무대', '편의점 디저트', '지락실3', '플레이브'];
const TICKER_TWENTY = ['주식초보', '도쿄 vlog', '자취 인테리어', '아침 루틴', '재테크', '취준', '플레이리스트', 'KBO', '스우파2'];

function Ticker({ generation }) {
  const items = generation === 'teen' ? TICKER_TEEN : TICKER_TWENTY;
  const doubled = [...items, ...items, ...items];
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
        display: 'flex', gap: 22, whiteSpace: 'nowrap',
        animation: 'tzf-ticker 42s linear infinite',
        fontFamily: KOR, fontSize: 11.5, fontWeight: 500,
        color: 'rgba(255,255,255,0.55)',
        paddingLeft: 16,
      }}>
        {doubled.map((t, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <span style={{
              width: 5, height: 5, borderRadius: 99,
              background: i % 2 === 0 ? TOKENS.cyan : TOKENS.pink,
              boxShadow: `0 0 8px ${i % 2 === 0 ? TOKENS.cyan : TOKENS.pink}`,
            }} />
            #{t}
          </span>
        ))}
      </div>
    </div>
  );
}

function VideoCard({ video, generation }) {
  const accentEmoji = generation === 'teen' ? '🎀' : '🍑';

  return (
    <div style={{
      background: TOKENS.card,
      borderRadius: 16, overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.04)',
    }}>
      <div style={{
        position: 'relative', aspectRatio: '16 / 9',
        background: video.thumbColor, overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 30% 70%, rgba(255,255,255,0.18), transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(0,0,0,0.25), transparent 60%)',
        }} />
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.08,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px)',
          backgroundSize: '100% 6px',
        }} />

        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 48, height: 48, borderRadius: 999,
          background: 'rgba(10,10,10,0.55)',
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid rgba(255,255,255,0.18)',
        }}>
          <div style={{
            width: 0, height: 0,
            borderLeft: '12px solid #fff',
            borderTop: '8px solid transparent',
            borderBottom: '8px solid transparent',
            marginLeft: 4,
          }} />
        </div>

        {video.badge && (
          <div style={{
            position: 'absolute', top: 10, left: 10,
            padding: '4px 9px',
            background: video.badge === 'HOT' ? TOKENS.pink : 'rgba(10,10,10,0.7)',
            color: '#fff',
            fontFamily: ROUND, fontSize: 10.5, fontWeight: 700,
            letterSpacing: '0.04em', borderRadius: 6,
            backdropFilter: 'blur(8px)',
            border: video.badge === 'HOT' ? 'none' : '1px solid rgba(255,255,255,0.15)',
            display: 'inline-flex', alignItems: 'center', gap: 4,
          }}>
            {video.badge}
          </div>
        )}

        <div style={{
          position: 'absolute', top: 10, right: 10,
          width: 28, height: 28, borderRadius: 999,
          background: 'rgba(10,10,10,0.55)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14,
        }}>
          {accentEmoji}
        </div>

        <div style={{
          position: 'absolute', bottom: 10, right: 10,
          padding: '3px 7px',
          background: 'rgba(10,10,10,0.75)',
          color: '#fff',
          fontFamily: ROUND, fontSize: 10.5, fontWeight: 600,
          letterSpacing: '0.02em', borderRadius: 4,
        }}>
          {video.id % 2 === 0 ? '4:21' : '12:08'}
        </div>
      </div>

      <div style={{ padding: '14px 14px 16px' }}>
        <div style={{
          fontFamily: KOR, fontSize: 15, fontWeight: 700,
          color: TOKENS.text, letterSpacing: '-0.015em',
          lineHeight: 1.35,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          overflow: 'hidden', textWrap: 'pretty',
        }}>
          {video.title}
        </div>

        <div style={{
          marginTop: 6,
          display: 'flex', alignItems: 'center', gap: 6,
          fontFamily: KOR, fontSize: 12, fontWeight: 500,
          color: TOKENS.textDim,
        }}>
          <span style={{ color: 'rgba(255,255,255,0.72)', fontWeight: 600 }}>{video.channel}</span>
          <span style={{ width: 2, height: 2, borderRadius: 99, background: TOKENS.textDim }} />
          <span>{video.channelMeta}</span>
        </div>

        <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {video.tags.map((tag, i) => (
            <span key={i} style={{
              padding: '4px 10px',
              border: `1px solid ${TOKENS.cyan}`,
              color: TOKENS.cyan,
              borderRadius: 999,
              fontFamily: KOR, fontSize: 11, fontWeight: 600,
              letterSpacing: '-0.005em',
              background: 'rgba(0,229,255,0.06)',
            }}>
              #{tag}
            </span>
          ))}
        </div>

        <div style={{
          marginTop: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontFamily: KOR, fontSize: 11.5, fontWeight: 500,
          color: TOKENS.textDim,
        }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 12 }}>👁</span>
            조회수 {video.views}
            <span style={{ marginLeft: 6, opacity: 0.7 }}>· {video.posted}</span>
          </span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            color: 'rgba(255,255,255,0.55)',
          }}>
            <span style={{ fontSize: 12 }}>🔖</span>
            저장
          </span>
        </div>
      </div>
    </div>
  );
}

function Watermark() {
  return (
    <div style={{
      padding: '28px 0 36px',
      textAlign: 'center',
      fontFamily: ROUND, fontSize: 13, fontWeight: 700,
      letterSpacing: '-0.02em',
      color: 'rgba(255,255,255,0.18)',
    }}>
      trend<span style={{ color: 'rgba(0,229,255,0.4)' }}>zip</span><span style={{ color: 'rgba(255,45,155,0.4)' }}>♡</span>
      <div style={{
        marginTop: 4,
        fontFamily: KOR, fontSize: 10, fontWeight: 500,
        color: 'rgba(255,255,255,0.16)',
        letterSpacing: '0.04em',
      }}>
        매일 오전 9시 업데이트 · 한국 유튜브 펄스
      </div>
    </div>
  );
}

function SectionHeader({ emoji, title, subtitle }) {
  return (
    <div style={{ padding: '4px 4px 2px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        fontFamily: KOR, fontSize: 17, fontWeight: 800,
        color: TOKENS.text, letterSpacing: '-0.02em',
      }}>
        <span style={{ fontSize: 18 }}>{emoji}</span>
        {title}
      </div>
      {subtitle && (
        <div style={{
          marginTop: 3,
          fontFamily: KOR, fontSize: 11.5, fontWeight: 500,
          color: TOKENS.textDim, letterSpacing: '-0.005em',
        }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

function FeedPage({ tweaks, setTweak }) {
  const [generation, setGeneration] = React.useState(tweaks.generation || 'teen');

  const onSwitch = (g) => {
    setGeneration(g);
    setTweak('generation', g);
  };

  const feed = generation === 'teen' ? TEEN_FEED : TWENTY_FEED;

  return (
    <div style={{
      width: '100%', height: '100%',
      background: TOKENS.bg,
      overflowY: 'auto', overflowX: 'hidden',
      fontFamily: KOR, color: TOKENS.text,
    }}>
      <Header generation={generation} onChange={onSwitch} />

      <div style={{ padding: '20px 16px 8px' }}>
        <SectionHeader
          emoji={generation === 'teen' ? '🎀' : '🍑'}
          title={generation === 'teen' ? '오늘의 10대 픽' : '오늘의 20대 픽'}
          subtitle={`4월 28일 화요일 · 실시간 인기 ${feed.length * 18}편`}
        />
      </div>

      <div style={{
        padding: '8px 16px 0',
        display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        {feed.slice(0, 2).map((v) => (
          <VideoCard key={v.id} video={v} generation={generation} />
        ))}

        <div style={{ paddingTop: 6 }}>
          <SectionHeader emoji="🔥" title="급상승 트렌드" subtitle="지난 24시간 가장 많이 본 영상" />
        </div>

        {feed.slice(2).map((v) => (
          <VideoCard key={v.id} video={v} generation={generation} />
        ))}
      </div>

      <Watermark />

      <style>{`
        @keyframes tzf-pulse {
          0% { transform: scale(1); opacity: 0.85; }
          100% { transform: scale(2.8); opacity: 0; }
        }
        @keyframes tzf-ticker {
          from { transform: translateX(0); }
          to { transform: translateX(-33.333%); }
        }
        ::-webkit-scrollbar { width: 0; height: 0; }
      `}</style>
    </div>
  );
}

function FeedTweaks({ tweaks, setTweak }) {
  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Generation" />
      <TweakRadio
        label="Active feed"
        value={tweaks.generation}
        onChange={(v) => setTweak('generation', v)}
        options={[
          { value: 'teen', label: '🎀 10대' },
          { value: 'twenty', label: '🍑 20대' },
        ]}
      />
    </TweaksPanel>
  );
}

function FeedApp() {
  const [tweaks, setTweak] = useTweaks(FEED_TWEAKS);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#070708',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
      fontFamily: KOR,
    }}>
      <IOSDevice width={390} height={844} dark={true}>
        <FeedPage tweaks={tweaks} setTweak={setTweak} />
      </IOSDevice>
      <FeedTweaks tweaks={tweaks} setTweak={setTweak} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<FeedApp />);
