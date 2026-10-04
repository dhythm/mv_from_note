// 台本確認用：各ビートの秒・文字数・読了に必要な秒・余裕を一覧する。
import { BEATS, charCount, readingShortfall, TOTAL_SECONDS } from "../src/timeline.ts";

for (const b of BEATS) {
  const lines = b.steps.flatMap((st) => st.lines);
  console.log(
    [b.id, b.section, `${b.start.toFixed(1)}-${b.end.toFixed(1)}`, `${charCount(lines)}字`, `余裕${(-readingShortfall(b)).toFixed(2)}s`].join("\t"),
  );
}
console.log(`total ${TOTAL_SECONDS}s`);
