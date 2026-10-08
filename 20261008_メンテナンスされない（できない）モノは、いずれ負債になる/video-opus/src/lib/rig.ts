// カットの舞台の位置（流れに乗って現れ、流れに置いていかれる）とカメラのキーの型。
import {Key, cut, ease, prog} from './anim';
import {flowX} from './flow';

export type CamKeys = Partial<Record<'dist' | 'az' | 'el' | 'roll' | 'tx' | 'ty' | 'tz' | 'fov', Key[]>>;

// 舞台は流れの先(+x)で待ち、カットの始まりに滑り込み、終わりに後ろ(-x)へ流れ去る
export function stage(t: number, n: number, D = 46, inDur = 0.7, outDur = 0.7) {
  const c = cut(n);
  const kin = prog(t, c.start - inDur * 0.8, c.start + inDur * 0.2);
  const kout = prog(t, c.end - outDur * 0.25, c.end + outDur * 0.75);
  const x = flowX(t) + D * (1 - ease.outQuint(kin)) - D * ease.in(kout);
  const on = t > c.start - inDur && t < c.end + outDur;
  return {x, on, kin, kout};
}
