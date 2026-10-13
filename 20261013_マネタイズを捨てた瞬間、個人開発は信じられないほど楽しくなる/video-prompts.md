# AI動画素材の独立プロンプトと生成前レビュー票

> **文書のみ・動画生成未承認／未実施。** [plan.md](plan.md) v2の素材依頼案。各コードブロックはそれ単体で1本を再生成できる。共通条件を省略せず内包している。サービス別に同じ内容を複数生成する計画ではない。

## 希望尺・本編使用・サービスの制作前提

ユーザー申告の制作前提: 6〜10秒ならGemini Omni Flash／Grok Imagine、15秒ならGrok Imagine／Seedance、Seedanceの30秒も選択肢だが失敗範囲を小さくするため短く分ける。**公式最新仕様・アカウントの利用可能設定として検証したものではない。** 現在の呼称を記録し、モデル名・尺・参照機能・画質・料金・利用条件は生成を依頼する時点で確認する。30秒の一括生成は本案にはない。

| 素材ID／プロンプトID | 対象カットと表示尺 | 原本の希望尺 | 採用区間案（原本の秒）／余裕 | 候補（未選択） |
|---|---|---|---|---|
| A / A-8 | 2、6.0秒 | 8秒 | 1.0–7.0。前後各1秒 | Gemini Omni Flash／Grok Imagine |
| B / B-8 | 4、5.7秒 | 8秒 | 0.5–6.2。前0.5秒・後1.8秒 | Gemini Omni Flash／Grok Imagine |
| C / C-15 | 7の前半5.0秒、8の前半8.0秒 | 15秒 | 0.5–5.5と5.5–13.5。前0.5秒・後1.5秒 | Grok Imagine／Seedance |
| C1 / C1-6（Cの置換案） | 7の前半5.0秒 | 6秒 | 0.5–5.5。前後各0.5秒 | Gemini Omni Flash／Grok Imagine |
| C2 / C2-10（Cの置換案） | 8の前半8.0秒 | 10秒 | 1.0–9.0。前後各1秒 | Gemini Omni Flash／Grok Imagine |

Cの前後余裕は前0.5秒・後1.5秒で、採用13秒と合わせ15秒になる。C1/C2は**Cと同時に採用しない**。基本は8＋8＋15＝31秒・3本、分割を選ぶ場合は8＋8＋6＋10＝32秒・4本。どちらでも完成動画のAI区間24.7秒と全体50.5秒は変わらない。

採用区間は生成品質を見て動かしてよいが、各表示尺と主動作を保つ。希望より短い原本をループ／フリーズ／無理な倍速で埋めない。別尺しか選べなければ利用画面の実値・費用と動作配分を記録してレビュー票を更新する。

## 共通仕様と編集者への引き渡し

- 希望は横16:9、720p以上、余白を含む1ショット。正確なfps・解像度・秒数は取得後に記録。重要物は中央より右、外周10%より内側。完成画面の文字は左に置く。数値・文字・URL・UI・ロゴのないクリーンな原本を受け取る。
- 暗いAと白いB/Cでもライムの角丸タイルの形・色・マットな材質を揃える。B/Cの机・白い受け皿・光は同一。参照画像は未作成で、全プロンプトはテキストのみでも場面が定義される。絵コンテ確定後、利用可能なら文字なしの共通スタイル画像を1枚用意し、選んだ1サービス内で共有する。開始・終了画像の指定機能を全モデルにあると仮定しない。
- 音は編集で除去。板の接触・道具の開く動きと、後段の文字・図形・BGMを組み合わせる。面追跡、実UIの貼込み、人の前後マスクは必要ない構成。カメラが動いても文字は編集上の独立した面に置く。
- Aから切り替える0.3秒、BからURLへ移る1秒、Cの間に挟む3秒、ロゴ前の2秒はすべて後段で作る。生成原本の中にトランジションや重要文字を入れない。
- 以下は日本語本文の逐語翻訳ではなく、架空の比喩素材を生成する英語指示。ユーザーの私生活・実績を再現した映像とは表示しない。

## A-8: 重い前提が積み上がる（単独でコピー）

```text
Create one eight-second continuous landscape 16:9 shot, 720p or higher if supported. Editorial miniature-object footage with realistic contact shadows, restrained physical motion and matte paper-and-resin textures. This is a fictional visual metaphor, not a real person's workspace or a demonstration of an app.

A charcoal-gray tabletop and seamless charcoal background. On the RIGHT side, at about 72% frame width and 65% frame height, sits one small lime-green rounded rectangular resin tile, about 12% of frame width, with an ivory shallow tray underneath it. Its surface is completely blank. Three broad, heavy, unmarked dark-gray slabs are poised above the tray, occupying only the right half of the composition. Preserve the lime tile's geometry and the number and material of the slabs. Leave the LEFT 50% as low-detail dark negative space for typography added by the editor. Keep all important objects inside the central 80% of the image; no slab may cross into the left text area.

Hard but controlled light from upper left, long contact shadows, tactile matte surfaces, a quiet low-key charcoal palette and a small lime accent. No sparks, smoke, shattering or destruction. Camera: medium close three-quarter view, a very slow dolly-in over the shot, with no fast pan, camera roll, cut or focus pumping. The editor will supply the dramatic full-screen motion.

Timing: 0-1 seconds, establish the small tile and the poised slabs. Between 1-6 seconds, the three slabs lower one after another and stack on the tray, leaving the lime tile visibly present at the front edge. Each contact causes a small grounded settling motion, making the growing stack feel heavy. The slabs never crush, destroy or morph the tile. Between 6-8 seconds, keep the stack intact with only a slight final settling movement and the ongoing slow camera move. Finish with a clear silhouette of the stack and the same tile still visible. No disappearance; the editor will remove the entire video plane with a smash cut later.

No people, hands, animals, screens, interfaces, letters, words, digits, URLs, diagrams, logos, watermarks or symbols on any surface. No extra objects appearing, changes of object identity, melting geometry or flickering lighting. Do not generate transitions, titles or subtitles. No speech or music; any generated audio will be discarded.
```

採用判断: 重さが接触・影・沈み込みで見える。タイルが壊れない。3つの板が同じ形のまま積み上がり、6秒の採用範囲内で動作が分かる。完成の文字は左、札／バーは後合成。生成物体へ札を貼りつける追跡精度を採用条件にしない。終端の看板再登場と全消失は編集が担当。

## B-8: 自分の手元に収まる（単独でコピー）

```text
Create one eight-second continuous landscape 16:9 shot, 720p or higher if supported. Editorial miniature-object footage, matte paper-and-resin materials, realistic gentle contact shadows, a tactile and light-hearted feel. This is a fictional visual metaphor of a small useful tool, not evidence of actual software development or a real person's possessions.

Use an off-white tabletop merging into a clean warm-white background. A single shallow ivory rounded rectangular tray sits on the RIGHT, centered near 72% frame width and 65% frame height. One small lime-green rounded rectangular resin tile, about 12% of frame width, starts just in front of that tray. The tray and tile have completely blank surfaces; the tile is not a phone or a screen. Leave the LEFT 50% as quiet empty white space for typography added in editing. Keep the tray and tile within the central 80% of the image throughout. There are no other props.

Soft diffuse daylight from upper left, stable exposure, gentle contact shadows, muted ivory and matte lime, no glossy neon or holograms. Camera: a medium close three-quarter view and a subtle clockwise arc of at most 10 degrees across the shot. Keep the object on the right and preserve the empty left area. No fast orbit, camera roll, whip pan, cut, zoom jump or focus change.

Timing: 0-1 seconds, establish the tile just in front of the tray. Between 1-4 seconds, the tile slides a short distance into the tray, fitting neatly, then gives one small buoyant settling bounce. The movement feels easy and practical, not triumphant or magical. Between 4-8 seconds, the tile stays fitted while slight natural settling and the gentle camera arc continue. The tile does not multiply, open, disappear or change its shape. End with the same tile resting in the same tray, fully visible.

No people, hands, animals, screens, interfaces, letters, words, digits, URLs, diagrams, logos, watermarks or symbols. No extra objects, morphing geometry, flickering lighting, explosions or confetti. Do not generate transitions, titles or subtitles. No speech or music; any generated audio will be discarded. All meaningful text, clock graphics, cloud graphics and full-screen motion will be controlled by the editor.
```

採用判断: 0.5–6.2秒の5.7秒で「手元にぴたりと収まる」が伝わる。左余白と道具の輪郭を保つ。時計・無料枠・今日は独立した後合成で、原本の精密な動きに貼り付けない。Cと机・光・タイルの見た目を揃える。

## C-15: 小さな道具を育てる（基本案、単独でコピー）

```text
Create one fifteen-second continuous landscape 16:9 shot, 720p or higher if supported. Editorial miniature-object footage with matte paper-and-resin materials, gentle realistic shadows and playful but restrained physical motion. This is a fictional visual metaphor of tending small useful tools, not a literal app interface, business growth, user-count growth or a real person's development history.

An off-white tabletop merging into a clean warm-white background. On the RIGHT half are exactly three small lime-green rounded rectangular resin tiles, each seated in a shallow ivory rounded rectangular tray. One is near 72% frame width and 65% frame height, with two similar tiles slightly farther back, arranged as a compact triangular cluster. Each tile is a simple hinged object with a blank lid, not a phone, screen or letter. Preserve exactly three tiles and three trays throughout. Leave the LEFT 50% as quiet empty white space for typography added by the editor. All important objects remain inside the central 80% of the frame.

Soft diffuse daylight from upper left, stable exposure, gentle contact shadows, warm white and matte lime. Same simple proportions and tactile material on all tiles. No plants, additional props, human figures or neon. Camera: start in a medium-close three-quarter view; slowly crane upward and arc clockwise by at most 15 degrees over the whole shot, gradually revealing a more top-down view. The cluster stays on the right and never spreads into the left text area. No sudden zoom, whip pan, roll, cut or focus change.

Timing: 0-0.5 seconds, establish the three closed tiles. Between 0.5-5.5 seconds, the three blank lids tilt open in a gentle staggered sequence, revealing simple blank lime inner surfaces; each remains connected by its hinge and settles with a small spring-like motion. Between 5.5-13.5 seconds, the three already-open tiles remain the same objects, continuing gentle settling motion while the camera slowly rises to show the compact group. Growth is suggested by opening and gaining a new view, not by multiplying objects or producing extra tiles. Between 13.5-15 seconds, keep the final group clearly visible with the slow camera movement continuing. Do not close a tile: the editor will illustrate the option to close a public tool separately using a graphic icon.

No people, hands, animals, screens, interfaces, letters, words, digits, URLs, diagrams, logos, watermarks or symbols on any surface. No extra objects, object multiplication, melting, discontinuous geometry, flashing light, confetti or victory spectacle. Do not generate transitions, titles or subtitles. No speech or music; any generated audio will be discarded. All typography and all large composition changes will be controlled by the editor.
```

採用判断: Cの0.5–5.5秒で開く、5.5–13.5秒で俯瞰へ移る。間の文字場面は編集で挿入するため、生成原本は15秒連続のまま。3つの道具が同一性を保ち、片側の余白を維持すること。開く／俯瞰の両方が崩れた場合に全15秒を繰り返すのではなく、次の分割案を検討する。

## C1-6: 開く動作だけ（Cの分割代替、単独でコピー）

```text
Create one six-second continuous landscape 16:9 shot, 720p or higher if supported. Editorial miniature-object footage with tactile matte paper-and-resin surfaces and gentle contact shadows. A fictional visual metaphor of small useful tools, not a real app or real person's history.

An off-white tabletop merging into a warm-white background. Exactly three small lime-green rounded rectangular hinged resin tiles sit in three shallow ivory rounded rectangular trays in a compact triangle on the RIGHT half, the front tile near 72% frame width and 65% frame height. Lids and inner surfaces are completely blank. Preserve the objects' count, dimensions and hinge connections. Keep the LEFT 50% empty and low-detail for later typography. All objects remain inside the central 80% of the image. Soft diffuse daylight from upper left, steady exposure, matte lime and ivory, no neon or extra props.

Camera: medium-close three-quarter view, locked position with no pan, zoom, cut or focus shift. Timing: 0-0.5 seconds, three closed tiles. Between 0.5-4.5 seconds, the three lids open in a gentle stagger, remaining attached, with slight spring-like settling. Between 4.5-6 seconds, the same three open tiles continue gently settling. No closing or object multiplication. End with all three lids open and clearly visible.

No people, hands, animals, screens, interfaces, letters, words, digits, URLs, diagrams, logos, watermarks or symbols. No added objects, morphing geometry, flicker, confetti, transitions, titles or subtitles. No speech or music; generated audio will be discarded. The editor supplies all text and large full-screen motion.
```

## C2-10: 俯瞰の動きだけ（Cの分割代替、単独でコピー）

```text
Create one ten-second continuous landscape 16:9 shot, 720p or higher if supported. Editorial miniature-object footage with tactile matte paper-and-resin surfaces and gentle contact shadows. A fictional visual metaphor of tending small useful tools, not business growth, actual user counts or a real person's history.

An off-white tabletop merging into a warm-white background. Exactly three small lime-green rounded rectangular hinged resin tiles, each with its blank lid ALREADY OPEN, sit in three shallow ivory rounded rectangular trays. Arrange them in a compact triangle on the RIGHT half, the front tile near 72% frame width and 65% frame height. Preserve exactly three tiles and three trays; all surfaces are blank. Keep the LEFT 50% empty and low-detail for later typography and all objects inside the central 80% of the image. Soft diffuse daylight from upper left, steady exposure, matte lime and ivory, no neon or other props.

Camera and timing: 0-1 seconds, establish a medium-close three-quarter view of the already-open group. Between 1-9 seconds, slowly crane upward and arc clockwise by at most 15 degrees, revealing a more top-down view while the same three open tiles gently settle. Keep the cluster on the right throughout. Between 9-10 seconds, continue the gentle motion with all objects clearly visible. No lids opening or closing, no object multiplication, no abrupt cuts, focus shifts, zoom jumps or camera roll.

No people, hands, animals, screens, interfaces, letters, words, digits, URLs, diagrams, logos, watermarks or symbols. No extra objects, morphing geometry, flicker, confetti, transitions, titles or subtitles. No speech or music; generated audio will be discarded. The editor supplies all text and large full-screen motion.
```

分割時はC1の0.5–5.5秒、C2の1.0–9.0秒を採用する。間にカット7の3秒の文字場面があるので、C1の終了とC2の開始のピクセル一致は不要。同じ場所・材質・3つの道具に見えることは必要。カット7の閉じるアイコンは説明図であり、C2に3つの比喩素材が再登場することは再公開や実開発件数を示さない。

## 将来の生成前レビュー票（まだ承認依頼できる完成票ではない）

| 項目 | 現在の案／未確認事項 |
|---|---|
| 生成対象 | 基本A-8・B-8・C-15、各1候補で合計3回を提案。分割を最初から選ぶ場合はA-8・B-8・C1-6・C2-10の合計4回。両方まとめて生成しない |
| 指示・画面配置 | 上の独立プロンプトとplan v2。絵コンテ画像と文字なし共通参照は未作成 |
| 実際のサービス・モデル・尺・解像度・参照機能 | 未選択／利用画面と必要なら公式最新情報で確認 |
| 1回・合計の費用／クレジット | 未確認。無料・定額内・消費量を推測しない |
| 保存・利用条件 | 原本のダウンロード、編集、公開可否、透かし等を利用プランで確認 |
| 初期生成の順序案 | 絵コンテを確定→対象・費用・回数を埋めて明示承認→Bを1候補で文字と合成確認→その結果を共通スタイルに反映→承認範囲内でA/C。候補を大量生成しない |
| 再生成・分割への変更 | 破綻箇所とプロンプト変更を記録。C失敗後にC1/C2を追加する場合は追加回数・費用を再レビューし、承認範囲を超えない。自動追加生成なし |
| 現在の承認・実行 | 課金生成・テスト生成とも未承認／未実施。今回の文書改訂は生成の許可ではない |

## 採用確認と納品の記録

1. 冒頭・途中・末尾を等速で確認。形／数／光の連続性、不要な文字やロゴ、採用範囲の主動作を点検。
2. planの日本語・図形を実際に重ね、1280×720で可読性・切り取り・大きな画面運動を検証してから残りを追加。不適合は「形／動きの破綻」「企画との不一致」「使用可能だが不要」を分ける。
3. 原本の実仕様、生成サービス・モデル、日時、プロンプトIDと修正履歴、入力参照、回数・費用、利用条件、採用区間・不採用理由を台帳へ記録。原本と30fps編集版を区別する。
4. 後続の素材名は `cut-A-weight-source.mp4` / `cut-B-fit-source.mp4` / `cut-C-grow-source.mp4`、分割時は `cut-C1-open-source.mp4` / `cut-C2-overview-source.mp4` 等、役割を含める。現在これらは存在しない。動画バイナリはGit管理外の作業先に保存し、本PRに追加しない。
5. 不採用なら該当部分だけを改訂・再生成するか、同じ板／タイルの動作をモーションで代替。完成映像の尺・論旨・接続は維持する。
