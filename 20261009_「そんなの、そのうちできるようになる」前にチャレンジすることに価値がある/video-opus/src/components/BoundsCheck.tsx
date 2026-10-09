// 検査用: 読む区間に入った文字（data-settled）の矩形を測り、安全域の外・別の文字群との重なりをログに出す。
// 本番の書き出しでは使わない（checkBounds=true のときだけ）。
import React, {useEffect} from 'react';
import {H, W} from '../lib/anim';

const SAFE = {l: 60, r: W - 60, t: 40, b: H - 40};

export const BoundsCheck: React.FC<{frame: number}> = ({frame}) => {
  useEffect(() => {
    const blocks = Array.from(document.querySelectorAll<HTMLElement>('[data-block]'));
    const rects: {id: string; r: DOMRect}[] = [];
    for (const b of blocks) {
      const id = b.dataset.block ?? '?';
      for (const s of Array.from(b.querySelectorAll<HTMLElement>('[data-settled="1"]'))) {
        const r = s.getBoundingClientRect();
        if (r.width < 1) continue;
        rects.push({id, r});
        if (r.left < SAFE.l || r.right > SAFE.r || r.top < SAFE.t || r.bottom > SAFE.b) {
          console.log(`BOUNDS frame=${frame} block=${id} ch=${s.textContent} rect=${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)}`);
        }
      }
    }
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        if (rects[i].id === rects[j].id) continue;
        const a = rects[i].r;
        const b = rects[j].r;
        const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (ox > 6 && oy > 6) console.log(`OVERLAP frame=${frame} ${rects[i].id}/${rects[j].id}`);
      }
    }
    // 書体の欠損: 3書体が読み込まれ、画面の文字の書体が代替になっていないか
    const fams = ['900 40px NotoJP', '400 40px BIZMincho', '400 40px Dot16'];
    const missing = fams.filter((f) => !document.fonts.check(f, '経験技術99%'));
    if (missing.length) console.log(`FONTMISSING frame=${frame} ${missing.join('|')}`);
    console.log(`CHECKED frame=${frame} chars=${rects.length}`);
  }, [frame]);
  return null;
};
