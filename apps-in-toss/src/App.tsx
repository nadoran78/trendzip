import { useEffect, useMemo, useState } from 'react';
import './App.css';

type PlayerStatus = 'loading' | 'ready' | 'error';

const TEST_VIDEO = {
  id: 'M7lc1UVf-VE',
  title: 'YouTube iframe 재생 확인',
  channelName: 'YouTube Developers',
};

const PLAYER_LOAD_TIMEOUT_MS = 10_000;
const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

function createYoutubeEmbedUrl(videoId: string): string | null {
  if (!YOUTUBE_VIDEO_ID_PATTERN.test(videoId)) {
    return null;
  }

  const url = new URL(`https://www.youtube.com/embed/${videoId}`);
  url.searchParams.set('playsinline', '1');
  url.searchParams.set('rel', '0');

  return url.toString();
}

function App() {
  const [retryCount, setRetryCount] = useState(0);
  const embedUrl = useMemo(() => createYoutubeEmbedUrl(TEST_VIDEO.id), []);
  const [status, setStatus] = useState<PlayerStatus>(() =>
    embedUrl === null ? 'error' : 'loading',
  );

  useEffect(() => {
    if (status !== 'loading') {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setStatus('error');
    }, PLAYER_LOAD_TIMEOUT_MS);

    return () => window.clearTimeout(timeoutId);
  }, [retryCount, status]);

  const retry = () => {
    setStatus(embedUrl === null ? 'error' : 'loading');
    setRetryCount((count) => count + 1);
  };

  return (
    <main className="canvas player-page">
      <section className="player-content" aria-labelledby="player-title">
        <p className="eyebrow">MZ 따라잡기</p>
        <h1 id="player-title">YouTube 앱 내 재생 확인</h1>
        <p className="description">
          앱인토스 WebView 안에서 YouTube 공식 iframe이 재생되는지 확인하는
          화면입니다.
        </p>

        <article className="video-card">
          <div className="video-frame-wrap">
            {embedUrl !== null && status !== 'error' ? (
              <iframe
                key={retryCount}
                className="video-frame"
                src={embedUrl}
                title={TEST_VIDEO.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                onLoad={() => setStatus('ready')}
              />
            ) : null}

            {status === 'loading' ? (
              <div className="player-state" role="status">
                영상을 불러오는 중입니다.
              </div>
            ) : null}

            {status === 'error' ? (
              <div className="player-state player-state-error" role="alert">
                <p>영상을 불러오지 못했습니다.</p>
                <span>
                  네트워크 상태와 YouTube의 재생 허용 여부를 확인한 뒤 다시
                  시도해 주세요.
                </span>
                <button type="button" onClick={retry}>
                  다시 시도
                </button>
              </div>
            ) : null}
          </div>

          <div className="video-summary">
            <p className="video-title">{TEST_VIDEO.title}</p>
            <p className="video-channel">{TEST_VIDEO.channelName}</p>
            {status === 'ready' ? (
              <p className="player-ready" role="status">
                재생 화면을 불러왔습니다. 실제 재생은 플레이어에서 확인해 주세요.
              </p>
            ) : null}
          </div>
        </article>
      </section>
    </main>
  );
}

export default App;
