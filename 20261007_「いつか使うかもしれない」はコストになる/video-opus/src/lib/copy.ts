// 画面の文言（plan.md カット表 v2 ＋ feedback.md の変更を反映）。
// 語の先頭記号: '#' 引用（大）, '*' 強調（濃紺）, '^' 明るい強調（琥珀）, '!' コスト／負債（赤）, なし＝本文
// 文字は語ごとのカード（プレート）として描く。語＝カードという作品のモチーフ。

export type Dir = 'left' | 'right' | 'up' | 'down' | 'near' | 'far';

export type Phrase = {
  id: string;
  cut: number;
  start: number; // 最初の語が入り始める時刻（秒）
  end: number; // 退場が終わる時刻（秒）。最終句は動画の終わり
  size: number; // 本文の字の高さ（テキスト面のワールド単位。1単位≈95px）
  lines: string[][];
  pos: [number, number]; // テキスト面での中心
  dirIn: Dir;
  dirOut: Dir;
  squash?: boolean; // 圧迫の句: 拍で押しつぶされる
  keep?: boolean; // 退場しない（最終句）
};

export const PHRASES: Phrase[] = [
  // 1 雪崩れ
  {id: 'p1a', cut: 1, start: 0.9, end: 5.5, size: 1.0, pos: [0, 0.35], dirIn: 'far', dirOut: 'left',
    lines: [['#「いつか', '#使うかも'], ['#しれない」']]},
  {id: 'p1b', cut: 1, start: 5.2, end: 10.0, size: 0.56, pos: [0, -0.1], dirIn: 'right', dirOut: 'near',
    lines: [['そう言って、'], ['*物も', '*ファイルも'], ['取っておく。']]},
  // 2 圧縮
  {id: 'p2a', cut: 2, start: 10.05, end: 13.7, size: 0.82, pos: [0, 0.2], dirIn: 'far', dirOut: 'up',
    lines: [['#「せっかく'], ['#買ったのに」。']]},
  {id: 'p2b', cut: 2, start: 13.35, end: 17.4, size: 0.54, pos: [0, 0], dirIn: 'down', dirOut: 'left', squash: true,
    lines: [['捨てられない', '気持ちを、'], ['^サンクコストが', '強める。']]},
  {id: 'p2c', cut: 2, start: 17.05, end: 21.8, size: 0.5, pos: [0, 0], dirIn: 'right', dirOut: 'near', squash: true,
    lines: [['取っておく間に、'], ['劣化し、', '場所を占め、'], ['心の余裕まで', '!圧迫する。']]},
  // 3 裏返し（本が上、文字は下）
  {id: 'p3a', cut: 3, start: 22.55, end: 26.7, size: 0.62, pos: [0, -2.35], dirIn: 'down', dirOut: 'left',
    lines: [['データは', '*資産だ。']]},
  {id: 'p3b', cut: 3, start: 26.95, end: 31.0, size: 0.54, pos: [0, -1.9], dirIn: 'right', dirOut: 'down',
    lines: [['同時に、'], ['維持管理の', '!負債でもある。']]},
  {id: 'p3c', cut: 3, start: 30.7, end: 34.2, size: 0.56, pos: [0, -2.05], dirIn: 'down', dirOut: 'near',
    lines: [['多いほど、'], ['たどり着きにくい。']]},
  // 4 隙間
  {id: 'p4a', cut: 4, start: 34.45, end: 39.1, size: 0.54, pos: [2.4, 1.5], dirIn: 'right', dirOut: 'up',
    lines: [['デジタルも', '同じだ。'], ['多すぎると、'], ['*探せない。']]},
  {id: 'p4b', cut: 4, start: 38.75, end: 43.9, size: 0.54, pos: [-2.1, 1.6], dirIn: 'left', dirOut: 'far',
    lines: [['検索できなければ、'], ['それは', '!コストだ。']]},
  // 5 前進・整列
  {id: 'p5a', cut: 5, start: 44.3, end: 48.45, size: 0.54, pos: [0, 1.95], dirIn: 'far', dirOut: 'up',
    lines: [['たどり着けないなら、'], ['宝の', '持ち腐れだ。']]},
  {id: 'p5b', cut: 5, start: 48.25, end: 54.0, size: 0.5, pos: [0, -1.25], dirIn: 'down', dirOut: 'right',
    lines: [['必要なのは、'], ['^捨てる勇気と、'], ['^整理する習慣だ。']]},
  // 6 RAG の留保
  {id: 'p6a', cut: 6, start: 54.3, end: 58.55, size: 0.5, pos: [0, 2.1], dirIn: 'left', dirOut: 'right',
    lines: [['RAGで、', '以前より'], ['探しやすく', 'なることもある。']]},
  {id: 'p6b', cut: 6, start: 58.25, end: 62.05, size: 0.54, pos: [1.9, 1.35], dirIn: 'right', dirOut: 'down',
    lines: [['それでも、'], ['まだ', '*届かないことは'], ['多い。']]},
  {id: 'p6c', cut: 6, start: 61.75, end: 65.95, size: 0.56, pos: [0, -1.9], dirIn: 'down', dirOut: 'right',
    lines: [['だから、'], ['^見直しと', '^削除が', '要る。']]},
  // 7 結論（余白側＝右）
  {id: 'p7a', cut: 7, start: 66.3, end: 71.55, size: 0.54, pos: [2.45, 0.2], dirIn: 'right', dirOut: 'up',
    lines: [['「いつか使うかも'], ['しれない」は、'], ['今の生産性を'], ['!確実に下げる。']]},
  {id: 'p7b', cut: 7, start: 71.2, end: 78, size: 0.5, pos: [2.05, 0], dirIn: 'down', dirOut: 'near', keep: true,
    lines: [['定期的な', '^見直しと、'], ['思い切った', '^削除が、'], ['*真の資産に'], ['つながるのかも'], ['しれない。']]},
];

export type TokenStyle = 'quote' | 'em' | 'accent' | 'cost' | 'body';

export function parseToken(raw: string): {text: string; style: TokenStyle} {
  const c = raw[0];
  if (c === '#') return {text: raw.slice(1), style: 'quote'};
  if (c === '*') return {text: raw.slice(1), style: 'em'};
  if (c === '^') return {text: raw.slice(1), style: 'accent'};
  if (c === '!') return {text: raw.slice(1), style: 'cost'};
  return {text: raw, style: 'body'};
}

export const STYLE_SCALE: Record<TokenStyle, number> = {
  quote: 1,
  em: 1.22,
  accent: 1.2,
  cost: 1.32,
  body: 1,
};
