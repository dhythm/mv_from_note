# サムネイル生成記録

- 作成日: 2026-10-23
- 使用手段: 組み込み image_gen（APIキーを使うCLIは未使用）
- 採用画像: `thumbnail.png`（1672×941px、PNG、横長・約16:9）
- 文言: 「燃え尽きは、」「温度差」「からくる。」
- 本編の16秒付近のフレームを確認し、紙色・赤・青・太ゴシック・円を結ぶ線の意匠を引き継いだ。フレーム画像は生成サービスへ添付せず、言葉で指示した。
- 生成: 1回。文字の表記、欠け、配色、構図を出力で目視確認。外部への投稿・公開はしていない。
- 指示サイズは1920×1080。実出力は1672×941。生成原寸のまま保存。

## 採用したプロンプト（全文）

```text
Use case: ads-marketing.
Create ONE finished Japanese video thumbnail, landscape 16:9, 1920×1080. A sophisticated, striking kinetic-typography-inspired editorial poster for an essay video about burnout arising from the difference between one's enthusiasm and the surrounding team's enthusiasm.
The dominant visual is excellent Japanese typography, legible at 320px wide. Bright warm ivory background #fbf8f1, near-black ink #1f2630, vivid warm red #e03a2e and cobalt blue #2f6fe4. Match the aesthetic of clean Japanese motion graphics: ultra-bold geometric Japanese sans-serif comparable to Noto Sans JP Black, optically tight spacing, flat solid color, sharp shapes, big size contrasts, strong directional composition. A polished actual thumbnail, not a mockup.
Text MUST be exactly these three phrases, correctly spelled, no other text:
「燃え尽きは、」
「温度差」
「からくる。」
Hierarchy: 「温度差」 is by far the largest, the immediate visual hook, spanning most of the width at the center. 「燃え尽きは、」 above, bold but smaller. 「からくる。」 below, strong and right aligned. The three phrases read in natural Japanese sequence. All letters remain fully visible, undistorted and high contrast. Leave generous safe margins of 90px horizontally and 70px vertically.
Visual metaphor: warm red and cool blue opposing broad diagonal color planes enter from left and right, with a clean ivory central zone behind the headline; their offset makes the temperature gap felt. Keep these supporting shapes simple, asymmetrical and energetic, never a busy background. Use warm red and blue selectively on the enormous word to connect it with the two planes while retaining readability. Near the lower edge, add ONE thin horizontal dark thermometer-like comparison line with a red circular endpoint on the left and a blue circular endpoint on the right, echoing the video's graphic motif; no numbers, no degrees, no arrows, no measurement labels.
No photos, people, faces, medical symbols, distressed office worker, flames, 3D lettering, shiny gradients, noise, fake logos, frame, watermarks or timestamps. No subtitle, no extra English. Typography and composition carry the message. Aim for an arresting professional Japanese editorial thumbnail with motion implied by bold diagonal planes; no decorative explosion or speed lines.
```
