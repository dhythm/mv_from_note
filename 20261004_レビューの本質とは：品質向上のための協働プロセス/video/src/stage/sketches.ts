// C12 の二案の下描き（prep/sketches.py が生成）
import sketches from "../../public/gen/sketches.json";
import type { Pt } from "../lib/track";

export const SKETCHES = sketches as unknown as Record<"rush" | "wait", { file: string; drawPath: Pt[] }>;
