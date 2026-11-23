// YouTube サムネイル（1920×1080 / 1280×720）。
// 本編のデザインシステム（紙色・墨・藍・琥珀・Noto Sans JP 900）と、
// Seedance 2.5 Flash の象徴カット（大勢が素通りする中、藍色のコートの1人が立ち止まる）を融合。
import React, {useEffect, useState} from 'react';
import {AbsoluteFill, OffthreadVideo, cancelRender, continueRender, delayRender, staticFile} from 'remotion';
import {C, F, H, W} from './kit';

function useThumbFont() {
  const [handle] = useState(() => delayRender('load thumb font'));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    new FontFace(F.g, `url(${staticFile('NotoSansJP-wght.ttf')})`, {weight: '100 900'})
      .load()
      .then((f) => {
        document.fonts.add(f);
        return Promise.all([900, 700].map((w) => document.fonts.load(`${w} 80px ${F.g}`, '誰見発信人中素通届相談')));
      })
      .then(() => {
        setReady(true);
        continueRender(handle);
      })
      .catch((err) => cancelRender(err));
  }, [handle]);
  return ready;
}

export const Thumbnail: React.FC = () => {
  const ready = useThumbFont();
  if (!ready) return <AbsoluteFill style={{backgroundColor: C.paper}} />;

  const ff: React.CSSProperties = {
    fontFamily: F.g,
    fontFeatureSettings: '"palt" 1',
    lineHeight: 1.05,
    whiteSpace: 'nowrap',
  };

  return (
    <AbsoluteFill style={{backgroundColor: C.paper, overflow: 'hidden'}}>
      {/* 右側の象徴ビジュアル: Seedance 2.5 Flash cut02_one_stops (4.6秒付近: 藍のコートの1人が琥珀の光の前で立ち止まる) */}
      <AbsoluteFill style={{left: 520, width: W - 520, height: H, overflow: 'hidden'}}>
        <OffthreadVideo
          src={staticFile('cut02_one_stops.mp4')}
          startFrom={138}
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: '76% 58%',
            transform: 'scale(1.16)',
            filter: 'brightness(1.06) contrast(1.04) saturate(1.08)',
          }}
        />
      </AbsoluteFill>

      {/* 左側の紙色面から右側映像へシームレスに溶け込むグラデーション */}
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(90deg, #F4F0E6 0%, #F4F0E6 49%, rgba(244,240,230,0.92) 56%, rgba(244,240,230,0.32) 66%, rgba(244,240,230,0.0) 76%)',
        }}
      />

      {/* 上端のタイムライン・ドット装飾（本編の記号とリンク） */}
      <svg width={W} height={120} style={{position: 'absolute', left: 0, top: 28, pointerEvents: 'none'}}>
        <line x1={88} y1={42} x2={1140} y2={42} stroke={C.grayDark} strokeWidth={3} opacity={0.35} />
        {[120, 210, 285, 390, 480, 610, 720, 860].map((cx, i) => (
          <circle key={i} cx={cx} cy={42} r={i % 3 === 0 ? 11 : 7} fill={C.gray} opacity={0.45 + (i % 3) * 0.15} />
        ))}
        <circle cx={1020} cy={42} r={22} fill={C.indigo} opacity={0.18} />
        <circle cx={1020} cy={42} r={14} fill={C.indigo} />
      </svg>

      {/* 左側 62%: 極太タイポグラフィ */}
      <div style={{position: 'absolute', left: 84, top: 158, display: 'flex', flexDirection: 'column', gap: 22}}>
        {/* リード（10人中8人は素通り。1人に届けばいい。） */}
        <div style={{display: 'flex', alignItems: 'center', gap: 18, marginBottom: 14}}>
          <div style={{width: 11, height: 52, backgroundColor: C.amber, borderRadius: 4}} />
          <div style={{...ff, fontSize: 48, fontWeight: 700, color: C.grayDark, letterSpacing: '0.02em'}}>
            10人中8人は素通り。<span style={{color: C.indigo, fontWeight: 900}}>1人に届けばいい。</span>
          </div>
        </div>

        {/* メイン見出し 1行目 */}
        <div style={{...ff, fontSize: 142, fontWeight: 900, color: C.ink, letterSpacing: '-0.02em', marginLeft: -6}}>
          誰もあなたを
        </div>

        {/* メイン見出し 2行目（超特大） */}
        <div style={{...ff, fontSize: 196, fontWeight: 900, color: C.ink, letterSpacing: '-0.03em', marginTop: -6, marginLeft: -10}}>
          見ていない。
        </div>

        {/* パンチライン帯（濃い藍＋琥珀アクセント＋白抜き極太） */}
        <div
          style={{
            marginTop: 34,
            display: 'inline-flex',
            alignItems: 'center',
            alignSelf: 'flex-start',
            backgroundColor: C.indigo,
            borderLeft: `20px solid ${C.amber}`,
            borderRadius: '6px 20px 20px 6px',
            padding: '34px 58px 38px 48px',
            boxShadow: '0 16px 40px rgba(26, 25, 22, 0.20)',
          }}
        >
          <span style={{...ff, fontSize: 100, fontWeight: 900, color: C.paper, letterSpacing: '-0.01em'}}>
            だから発信していい。
          </span>
        </div>
      </div>

      {/* 右上の白い壁余白: 立ち止まった藍の人物の真上に出る吹き出し「相談したい」 */}
      <div style={{position: 'absolute', left: 1270, top: 210, width: 490, height: 185}}>
        <svg width={490} height={185} viewBox="0 0 490 185" style={{position: 'absolute', inset: 0, overflow: 'visible', filter: 'drop-shadow(0 10px 24px rgba(26,25,22,0.14))'}}>
          <path
            d="M 32 8 L 458 8 Q 482 8 482 32 L 482 118 Q 482 142 458 142 L 185 142 L 130 184 L 140 142 L 32 142 Q 8 142 8 118 L 8 32 Q 8 8 32 8 Z"
            fill={C.white}
            stroke={C.indigo}
            strokeWidth={8}
            strokeLinejoin="round"
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            left: 8,
            top: 8,
            width: 474,
            height: 134,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            ...ff,
            fontSize: 72,
            fontWeight: 900,
            color: C.indigo,
          }}
        >
          相談したい
        </div>
      </div>

      {/* 微細な紙の粒テクスチャ（本編と統一） */}
      <svg width={W} height={H} style={{position: 'absolute', inset: 0, mixBlendMode: 'multiply', opacity: 0.08, pointerEvents: 'none'}}>
        <filter id="tgrain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={22} result="n" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0.9 0.9 0.9 0 -0.75" />
        </filter>
        <rect width={W} height={H} filter="url(#tgrain)" />
      </svg>
    </AbsoluteFill>
  );
};
