import React from 'react';
import {Composition} from 'remotion';
import {Main} from './Main';
import {LogoCompare} from './components/LogoCompare';
import {FPS, H, TOTAL_FRAMES, W} from './lib/anim';

export const RemotionRoot: React.FC = () => (
  <>
    {/* 完成版（BGMつき） */}
    <Composition id="Challenge" component={Main} defaultProps={{audioTrack: 'bgm.m4a'}} durationInFrames={TOTAL_FRAMES} fps={FPS} width={W} height={H} />
    {/* 映像のみ（確認用） */}
    <Composition id="ChallengeSilent" component={Main} defaultProps={{}} durationInFrames={TOTAL_FRAMES} fps={FPS} width={W} height={H} />
    {/* 文字の画面外・重なりの検査用 */}
    <Composition id="ChallengeCheck" component={Main} defaultProps={{checkBounds: true}} durationInFrames={TOTAL_FRAMES} fps={FPS} width={W} height={H} />
    {/* エンドロゴの検査用（原本 SVG と翻訳の比較） */}
    <Composition id="LogoOrig" component={LogoCompare} defaultProps={{which: "orig" as const}} durationInFrames={165} fps={FPS} width={W} height={H} />
    <Composition id="LogoMine" component={LogoCompare} defaultProps={{which: "mine" as const}} durationInFrames={165} fps={FPS} width={W} height={H} />
  </>
);
