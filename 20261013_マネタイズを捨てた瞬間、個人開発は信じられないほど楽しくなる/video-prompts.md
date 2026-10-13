# 企画側用：キャラクター動画の生成指示

採用動画3本は用意済み。通常の本編制作は [制作指示書](plan.md) と同梱素材を使う。この資料は追加・再制作が必要になった場合に企画側が使う。作業者へ新規動画生成を依頼するものではない。

## 生成する場合の仕様と用途

| ID／制作時の命名例 | 希望原本尺 | 採用予定区間 → 本編 | AIが担当 | 編集が担当 |
|---|---:|---|---|---|
| M1-brace-8／`M1-brace-source.mp4` | 8秒 | 1.0–7.0秒 → 5.0–11.0秒 | 上を見る、身構える、手が止まる | 圧迫する看板・責任の札、文字、キャラを隠す前景、影、全画面の移動 |
| M2-discover-8／`M2-discover-source.mp4` | 8秒 | 0.5–6.2秒 → 14.3–20.0秒 | 一度タッチ、驚きから発見へ、うなずく | 指先の道具と凹み、波紋、時計、雲、「自分」の文字、全画面の旋回 |
| M3-tinker-10／`M3-tinker-source.mp4` | 10秒 | 0.5–5.5秒 → 27.0–32.0秒、5.5–9.5秒 → 35.0–39.0秒 | 小さな手直し、見守る、愛着、手を引く | 道具のつまみ・跳ね、32–35秒の閉じる図形と「楽しい」、後半の構図変更、結論 |

計3本・希望原本26秒、採用20.7秒。M3の途中に3秒の文字場面を挟む。35秒では新構図に切り替えるのでピクセル単位の連続性は不要。動作の正確なタイミングは生成後に選び、対応する図形の拍を合わせる。長いフリーズ、逆再生、不自然な繰返しで尺を埋めない。

サービス・モデル・尺の対応・背景参照機能・料金は未確認。旧文書にあったユーザー申告のモデル呼称を、現在利用できる製品仕様として転記しない。選ぶ時点で公式情報と実際の利用画面を確認する。

## 共通デザイン参照と背景分離

- **共通参照v1:** [単体画像](assets/character/character-master-v1.png)を3本共通の参照にし、[シート](assets/character/character-sheet-v1.png)は形・表情の説明用とする。シート全体を動画の開始フレームに使わない。参照には一体の全身・無地背景だけを入れ、文字つき絵コンテや記事本文を送らない。テキストだけで同じキャラクターになると保証しない。参照機能がなければ一貫性の実現方法を見直す。
- 第一案は、クリーム色の丸い体、短い手足、濃茶の楕円の目、無地のテラコッタ色ベストの一体。毛・細かい指・透明部分・緑や青の服・アクセサリーなし。実在人物や既存キャラクターの模倣ではない。
- 原本では頭頂から足先まで中央80%内、キャラ全身高は画面高の約65%。左右に手が動ける空間を残す。完成画面の左側の文字余白を、原本の半分に空ける必要はない。切り抜いてから配置する。
- 第一案は均一な鮮やかな緑（目標#00FF00、実際の生成色は変動しうる）のサイクロラマ。画面全域同色、地平線なし、模様なし。体に緑を映し込ませず、強い影・ブラーなし。アルファ付き動画が生成されるとは想定しない。
- 背景色が衣装や目の輪郭と競合する場合は、生成**前**に全3本の背景方針を合わせて青などに変える。下の英語プロンプトの背景段落も置換し、緑・青を同時に依頼しない。
- 共通の固定カメラ、正面から少し左が見える角度、目の高さ、全身。カメラ運動・編集トランジション・文字・道具の生成は不要。躍動感は完成画面の移動と図形で作る。

## M1-brace-8 — 圧迫され、作る手が止まる

**使用:** カット2、5.0–11.0秒。手や頭の上に物体を持たせず、視線と体の緊張を採る。上左の看板は後合成し、表情を囲む。参照する配置: [開始](assets/storyboard/cut-02-start.png)／[終了](assets/storyboard/cut-02-end.png)。これらの文字つき配置図を生成サービスへ送らない。

```text
Create one continuous eight-second landscape 16:9 animation plate, ideally 1920x1080 or higher if available. This is an isolated acting element for later compositing, NOT a finished scene. Use the supplied approved character reference consistently. Do not create a new character if a reference is supplied.

Exactly one original, friendly miniature mascot: a smooth matte cream-colored rounded body, short rounded limbs, simple dark-brown oval eyes, a small expressive mouth, and a plain terracotta vest. Two arms and two legs, mitten-like hands without individual fingers. No hair, fur, antennae, transparent parts, patterns, lettering, accessories, green or blue parts. Preserve its anatomy, face, costume, proportions and material throughout. The performance represents hesitation under expectations, not injury, terror or physical crushing.

Locked camera, eye level, nearly frontal with a slight view of its left side. Keep its full body and both feet visible in the central 80 percent throughout. Body height about 65 percent of image height. Leave room around both hands and above its head. Keep the figure near the center; no large travel across the frame. Soft neutral frontal lighting on the character. Use an entirely uniform vivid green background and floor, target #00FF00, with no horizon, texture, gradient, cast shadow or green reflection on the character. Clean opaque edges, minimal motion blur. The green will be removed in editing.

0-1 seconds: the mascot is attentive with a small forward lean, both hands low in front, relaxed but ready to do something.
1-3 seconds: its eyes look toward the upper left outside its body; shoulders slowly rise and its ready hand pauses. The imagined object is NOT visible.
3-6 seconds: it slightly leans back, draws its hands closer to its chest, and looks between upper left and straight ahead with a worried, hesitant expression. Convey a recognizable pause in enthusiasm through the eyes, posture and timing.
6-8 seconds: remain apprehensive, with a small breath and a blink, not a frozen pose. No relief, celebration, escape or disappearance.

No actual objects, boards, labels, weights, walls, desk, screens, interface, letters, words, numbers, symbols, logos, subtitles or watermark. Do not render anything the mascot is looking at. No cuts, zoom, pan, roll, camera shake, depth-of-field shifts, transitions, speech or music. Any automatically generated audio will be discarded.
```

**合成指示・採用条件:** 1.0–7.0秒内で視線→肩→手の停止が読めること。原本の左上視線に合わせて看板を配置し、前景の札で下半身の一部を隠す。腕が看板を支える芝居に変更しない。必要な表情が小さすぎる、手足が増える、身体が潰れる場合は不採用。図形の縮尺だけで同じ感情が伝わるなら、AIを追加する意味を再評価する。

## M2-discover-8 — 小さな手応えに目が輝く

**使用:** カット4、14.3–20.0秒。最初に1本だけ試す候補。キャラの右手（画面左側）が触れる空間に編集側の道具を合わせる。参照配置: [開始](assets/storyboard/cut-04-start.png)／[終了](assets/storyboard/cut-04-end.png)。

```text
Create one continuous eight-second landscape 16:9 animation plate, ideally 1920x1080 or higher if available. This is an isolated acting element for later compositing, NOT a finished scene. Use the supplied approved character reference consistently. Do not create a new character if a reference is supplied.

Exactly one original, friendly miniature mascot: smooth matte cream-colored rounded body, short rounded limbs, simple dark-brown oval eyes, a small expressive mouth, and a plain terracotta vest. Two arms and two legs, mitten-like hands without individual fingers. No hair, fur, antennae, transparent parts, patterns, lettering, accessories, green or blue parts. Preserve its anatomy, face, costume, proportions and material. The emotion is quiet discovery that a small useful thing works for oneself, not a grand victory.

Locked camera, eye level, nearly frontal with a slight view of its left side. Keep its full body and both feet visible in the central 80 percent throughout. Body height about 65 percent of image height. Keep it near the center with room for its right hand to extend toward screen-left. Soft neutral frontal character lighting. Entirely uniform vivid green background and floor, target #00FF00, no horizon, texture, gradient, cast shadow or green reflection. Opaque clean edges, minimal motion blur. The background will be removed.

0-1 seconds: a curious forward lean, looking at empty space slightly below and to screen-left at waist height, approximately x=38%, y=62% of the frame.
1-2.5 seconds: extend the character's right mitten-hand toward that empty point and make ONE gentle downward tap, then withdraw just enough to see what happened. The left hand stays close to the body. Nothing is held. No object is visible. The location is an approximate acting target, not a requirement for pixel-perfect placement.
2.5-4.5 seconds: its eyes open in pleased recognition, it leans closer, then gives one small satisfied nod. Let the expression change clearly from curiosity to delight.
4.5-6.5 seconds: relax the shoulders, smile subtly, and look again toward that same empty point with a warm feeling of usefulness.
6.5-8 seconds: maintain that engaged expression with a small breath or blink, hands relaxed. Do not walk off or launch into a dance.

No object, device, tray, tool, desk, floor marking, spark, ripple, light beam, graphic, letters, words, digits, interface, logo, subtitle or watermark. The editor will add the touched object and its reaction. No camera movement, cuts, transitions, zoom, roll, focus changes, speech or music. Any generated audio will be discarded.
```

**合成指示・採用条件:** 採用0.5–6.2秒でタッチから発見まで含むこと。手先の位置に合わせて道具を置く。接触した1〜2fを基準に道具を凹ませ、輪を文字へ走らせる。前景の縁が手の下部を短く隠すマスクを作る。指の間へ複雑な道具を通さない。「自分」の文字は目や手に被せない。境界・表情・接触が生成り／墨色／アプリコット背景と全体の旋回の中で成立するかを5.7秒の動画で確認する。原本が綺麗なだけでは採用しない。

## M3-tinker-10 — 手直ししながら、愛着が生まれる

**使用:** カット7前半とカット8冒頭。M2との連続演技ではなく、同じキャラが再登場する。配置: [カット7開始](assets/storyboard/cut-07-start.png)／[カット8開始](assets/storyboard/cut-08-start.png)。

```text
Create one continuous ten-second landscape 16:9 animation plate, ideally 1920x1080 or higher if available. This is an isolated acting element for later compositing, NOT a finished scene. Use the supplied approved character reference consistently. Do not create a new character if a reference is supplied.

Exactly one original friendly miniature mascot: smooth matte cream-colored rounded body, short rounded limbs, simple dark-brown oval eyes, a small expressive mouth, and a plain terracotta vest. Two arms and two legs, mitten-like hands without individual fingers. No hair, fur, antennae, transparent parts, patterns, lettering, accessories, green or blue parts. Preserve anatomy, face, clothing and material throughout. Show absorbed, playful care for a small useful thing, not professional manufacturing, commercial success or a dramatic celebration.

Locked eye-level camera, nearly frontal with a slight view of its left side. Keep the entire body and feet within the central 80 percent throughout, body height about 65 percent of the frame. Keep it centered with room toward screen-left for the right hand. Soft neutral frontal character lighting. Entirely uniform vivid green background and floor, target #00FF00, no horizon, texture, gradient, cast shadow or green reflection. Clean opaque silhouette, minimal motion blur. The background will be removed in editing.

0-0.5 seconds: engaged forward lean, looking at empty space slightly below and toward screen-left at waist height, approximately x=38%, y=62%.
0.5-3 seconds: use the character's right mitten-hand to make one short sideways adjusting gesture near that point, then pause to inspect it. Keep the other hand near the body. Do not grasp or hold an object; all objects will be added later.
3-5.5 seconds: make one small follow-up adjustment with the same hand, then tilt the head with interested concentration. Keep the face visible and the feet planted.
5.5-8 seconds: stop adjusting, watch the imagined result, and develop an affectionate, satisfied smile. A small nod or shoulder bounce can show pleasure without becoming a dance.
8-10 seconds: withdraw the right hand toward the body, straighten slightly, and keep looking fondly at the empty work point, with a breath and blink. No farewell gesture, disappearance, multiplication or growth of the body.

Do not render the imagined object. No props, tools, desk, plants, buttons, icons, graphics, effects, letters, words, digits, interfaces, logos, subtitles or watermark. No camera movement, cuts, transitions, focus shifts, speech or music. Any generated audio will be discarded. The editor will split this performance with a typography-only passage and will supply all tool movement, scene changes and large composition movement.
```

**合成指示・採用条件:** 0.5–5.5秒では手の横移動に合わせて道具のつまみを動かし、直った手応えは図形の小さな跳ねで表す。物の生成・把持を要求しない。5.5–9.5秒は笑顔と手を引く演技を使う。カット8はキャラを左へ移すが左右反転しない。手の左下の道具も一緒に移す。カット7末尾の閉じるアイコンは編集の説明図で、M3がツールを破棄する演技ではない。3つの道具やユーザー数を増やす表現へ戻さない。

## 追加制作の扱い

企画側で必要カット・参照・動作・採用条件を定めて制作する。クレジットを使う生成は共通方針の事前レビューに従う。既存素材の実ファイル・採用区間は制作指示書を参照する。
