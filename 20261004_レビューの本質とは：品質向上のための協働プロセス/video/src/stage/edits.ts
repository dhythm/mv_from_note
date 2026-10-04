// 描き直しの途中の絵と、消しゴム・鉛筆の経路（prep/edits.py が生成）
import edits from "../../public/gen/edits.json";
import type { Pt } from "../lib/track";

export type EditInfo = { before: string; after: string; erased: string; erasePath: Pt[]; drawPath: Pt[]; box: number[] };
export const EDITS = edits as unknown as Record<string, EditInfo>;
