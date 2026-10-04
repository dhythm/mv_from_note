# 画像生成プロンプト — v2

2026-10-04。内蔵image_genで制作。CLI/APIの直接呼び出しは使用していない。参照元はこの企画で生成したオリジナル画像のみ。外部作品の画像は入力していない。

採用画像だけをWebPへ変換してassets/へ保存。元PNG・不採用版はリポジトリ外に保持。以下は実際に送信したプロンプト。寸法の指定は生成結果の保証ではなく、最終寸法はWebP変換時に統一した。

## 01-worktable

参照入力：なし（新規生成）

元出力：exec-ead4baa4-b582-46a6-abf6-69197e8e34ab.png

```text
Use case: illustration-story.
Asset type: master production keyframe for an original hand-drawn animated short film "Turn the Page Again". One single full-frame 16:9 landscape image, ideally 1536x864 or 1792x1024. NO storyboard grid, NO letters, NO labels, NO watermark.
Scene: intimate craftsman's animation worktable, overhead camera looking almost straight down (small natural perspective), a large muted blue-gray wooden tabletop. At exact center, a small horizontal landscape flipbook of ivory paper, bound along its LEFT short edge by two unobtrusive dark thread staples; blank uppermost page with faint paper fibers, no illustrations yet. Flipbook occupies about 42% of frame width, 40% frame height, generous working area on all sides. Flipbook top and bottom edges almost horizontal, rotation at most 3 degrees. Two tiny page-registration dots near bound left edge. An ochre wooden graphite pencil lies horizontally below the book. Small off-white used eraser upper left of book. A small upright cylindrical dark walnut rubber stamp and closed dull vermilion ink pad upper right, far away from book. No cups or other clutter on table.
Action: animator A's two natural adult hands come from bottom edge, sleeves deep muted indigo cotton; left hand gently holds left bound margin, right hand rests open near lower right corner of page, NOT holding pencil. All five fingers anatomically credible, subtle knuckles and fingertip pressure. No other person visible. Same person, two hands only.
Style: exceptionally considered original independent 2D animation background and hand animation key drawing, nuanced graphite contour, restrained gouache washes, delicate irregular handmade edges, matte paper grain, no photorealism or 3D render. Hands expressive and observational, no glossy skin, no anime exaggerated proportions. Warm soft afternoon light from UPPER LEFT, cool desaturated shadows lower right. Palette blue-gray, ivory, muted indigo, ochre, very small vermilion accent. Spare cinematic composition, rich tactile details only near fingers and paper, restful negative space. Quiet adult seriousness and care, not sentimental, not corporate clip art. Maintain a legible blank page for later animation compositing.
```

## 02-approved-cover

参照入力：exec-ead4baa4-b582-46a6-abf6-69197e8e34ab.png

元出力：exec-b3b1462e-22e6-404f-afa1-bfeb508b5027.png

```text
Use case: precise-object-edit. Edit target: reference image 1, a production keyframe for a hand-drawn short film. Preserve the exact overhead camera, 16:9 framing, desaturated blue wooden desk, original warm upper-left lighting, ivory book size and location, left binding, eraser upper left, walnut stamp and closed ink pad upper right, and graphite/gouache style. Change only the book state and hands: the same flipbook is now CLOSED with a plain slightly darker warm kraft-paper cover; near the lower-right of that cover is one small muted vermilion round approval imprint with a simple abstract mark, NO letters or readable symbols. Animator A's same indigo-sleeved adult hands still come from bottom, left at left book edge, right above bottom-right cover, relaxed from brief relief, right fingertips JUST beginning to curl to reopen. Pencil stays below. No other person, no extra objects, no text. This is the misleading relief after approval: quiet, small, no triumphant imagery.
```

## 04-inspect-together

参照入力：exec-ead4baa4-b582-46a6-abf6-69197e8e34ab.png

元出力：exec-644ba751-ac93-447a-ac49-87bb9d8e3ee1.png

```text
Use case: precise-object-edit. Edit target: reference image 1. Preserve exact overhead camera, 16:9 frame, original blue-gray wood tabletop, paper book size and coordinates, left binding, eraser upper left, upright walnut stamp and closed red ink pad upper right, pencil below, warm light upper left and hand-drawn graphite/gouache style. Page MUST remain blank for later animation compositing, no text or drawing. Change hand choreography only to show two adults sitting on the SAME lower side of the desk. Animator A (indigo sleeves) has LEFT hand steadying left bound edge as before, right hand just outside frame, no pencil held. Reviewer B (muted sage-green cotton sleeve) reaches in from LOWER RIGHT with ONE right hand; their index finger hovers just above the blank page around x=57%, y=44% of full frame, pointing to a specific area without touching or drawing. A clear space separates the two hands. Exactly TWO visible hands belonging to two people; plausible fingers, no crossed wrists. Reviewer does not hold any tool. Blank page mostly unobscured, evidence of shared attention rather than authority.
```

## page-01-offer

参照入力：なし（新規生成）

元出力：exec-7183f92e-f7ee-411e-9de2-cffeb7392119.png

```text
Use case: illustration-story. Asset type: reusable inner-film drawing in a flipbook; one single wide 16:9 landscape composition, no collage. Background uniform warm ivory paper, very subtle fine graphite texture, no frame, no book edges, no hands, no shadow of external objects. Entire small quiet scene centered with generous blank margin. Two original small adult human characters drawn in expressive spare graphite with very light muted gouache, NOT stick figures, NOT photorealistic. Giver on LEFT: short charcoal-black hair, muted dark blue loose sweater, rolled sleeves, warm gray trousers, slight stoop, hesitant but kind. Receiver on RIGHT: short wavy dark hair, muted sage-green loose cardigan, warm gray trousers, patiently leaning forward. They face each other in side/three-quarter profile, full bodies with feet aligned on one faint horizontal ground line at 80% height. Heads at about 27% height. Their hands and one small handleless ochre ceramic cup meet near image center. Giver holds the only cup in both hands at chest/waist height at x=46%, receiver's two open hands wait slightly farther right at x=56%, leaving a small gap. Nobody holds another object. No table, no chairs, no scenery, no text, no decorative symbols. The emotional focus is the giver's tiny hesitation before offering, readable shoulder and wrist shapes, not big eyes or smiles. Tactile hand-drawn independent animation character art, intentionally simple repeatable silhouettes, restrained contour, restrained palette.
```

## 03-open-again

参照入力：exec-b3b1462e-22e6-404f-afa1-bfeb508b5027.png

元出力：exec-c65ecab4-b596-42a4-a4c1-97f2c6fe22cc.png

```text
Use case: precise-object-edit. Edit target reference 1, the closed-book frame. Keep the identical overhead camera, all desk details, all stationary props and locations, 16:9, master graphite-gouache style. Show the next acting key pose: A's indigo-sleeved LEFT hand still at left edge; A's RIGHT thumb and index finger carefully LIFT the bottom-right corner of the stamped kraft front cover, opening it toward the left binding, revealing about half of the clean warm-ivory page beneath. Cover is slightly arched physically, not floating detached. Its existing small vermilion emblem stays on that cover and curves with it. The right hand's grip shows a small hesitant pause; anatomically correct. Only two hands, no new tools. Underlying paper MUST be blank for future drawing compositing. Pencil remains below the book, stamp and closed inkpad top right, eraser top left. No text. Quiet decision to return to unfinished work, not a dramatic gesture.
```

## 05-draw-with-support

参照入力：exec-ead4baa4-b582-46a6-abf6-69197e8e34ab.png

元出力：exec-c8ec0267-43ea-4cea-a581-0b47e84c5665.png

```text
Use case: precise-object-edit. Edit target reference 1. Preserve exact 16:9 overhead camera and graphite/gouache style, blue-gray table and wood grain, original paper size and location and left binding, eraser upper left, walnut stamp and closed vermilion inkpad upper right, upper-left warm light. The page remains blank, designed for drawing to be composited later. Change ONLY hand actions: A sits at lower-left in dark INDIGO sleeves; A's left hand steadies bound LEFT edge, and A's RIGHT hand holds the original OCHRE pencil in a natural tripod writing grip with graphite tip physically touching page near center (about 51% frame width, 44% height). The pencil is now in that hand and MUST NO LONGER lie on the desk below. B sits adjacent at lower-right in muted SAGE GREEN sleeve; B's LEFT hand gently holds the far-right outer paper margin, outside writing area, keeps page flat. Exactly THREE hands, two indigo sleeves one green, plausible human anatomy with enough room, no wrists crossing. B holds no drawing tool. The roles must be unmistakable: indigo draws, green supports; no ghost pencil, no duplicate objects, no letters. Detailed contact pressure and fingertip shadows, restrained emotional care.
```

## 06-shared-rest

参照入力：exec-644ba751-ac93-447a-ac49-87bb9d8e3ee1.png

元出力：exec-0be36f20-fc6f-4a74-a6f1-94c9cc47403a.png

```text
Use case: precise-object-edit. Edit target reference 1. A closing production keyframe for the SAME hand-drawn short. Preserve identical 16:9 overhead composition, exact blue desk wood grain, book position and scale, original page and binding, eraser and stamp/inkpad positions, warm upper-left lighting, same two people's sleeve colors and all paper texture. Change ONLY the two visible hands from tense examination to relaxed shared attention: A's INDIGO-sleeved left hand at lower left loosens its hold and rests its fingertips lightly beside the left binding; B's SAGE-sleeved right hand no longer points, its fingers rest naturally along the outer lower-right margin of the book with fingertips just touching paper. The center of the paper is entirely blank and unobstructed for a future animation insert. Keep the ochre pencil lying below the book exactly where it was. Exactly two hands, believable fingers. Quiet exhale, no handshake, no heart gesture, no new stamps or celebratory graphics. No text or artwork on page.
```

## page-02-contact-gap

参照入力：exec-7183f92e-f7ee-411e-9de2-cffeb7392119.png

元出力：exec-31a54eee-cc79-4a79-bec0-d21cb650d6cc.png

```text
Use case: precise-object-edit. Edit target reference 1, an inner-film production state drawing. Preserve the EXACT 16:9 framing, ivory blank background, graphite-and-muted-gouache line style, character identity, face, hair, clothes and colors, body height and feet positions, the single ground line, and the single ochre handleless cup's shape/size/color. No text, no arrows, no red marks, no duplicated cups, no external hands or props. This is one key drawing, not a montage. Change ONLY the arm/hand/cup action described below. Deliberately depict a BAD animation frame to be fixed: keep giver's hands and all body positions identical to the original, but move the CUP ONLY roughly one cup-width to the right, in the empty gap between the two people, at the same height. The cup must NOT TOUCH ANY hand; show a clearly visible ivory gap on BOTH sides, including under it. It temporarily floats because this is a drawing error in a flipbook, not supernatural story logic. Receiver's hands remain patiently open in their original place. Do not 'correct' this disconnected cup; the visible separation is the required subject of this asset.
```

## page-03-too-early（不採用）

参照入力：exec-7183f92e-f7ee-411e-9de2-cffeb7392119.png

元出力：exec-3be8504c-30f7-42d1-b5e1-8343a5ef50dd.png

不採用理由：受け手の両手が合掌に見え、感謝や受領済みと誤読される。v2で両手を離して下げた。

```text
Use case: precise-object-edit. Edit target reference 1, an inner-film production state drawing. Preserve the EXACT 16:9 framing, ivory blank background, graphite-and-muted-gouache line style, character identity, face, hair, clothes and colors, body height and feet positions, the single ground line, and the single ochre handleless cup's shape/size/color. No text, no arrows, no red marks, no duplicated cups, no external hands or props. This is one key drawing, not a montage. Change ONLY the arm/hand/cup action described below. Depict the next attempt, where hand contact is corrected but timing is wrong. Giver on LEFT extends the SAME single cup forward toward center, holding it securely and visibly in both hands so there is NO contact gap. Receiver on RIGHT has already withdrawn BOTH EMPTY hands back toward their own chest, with elbows bent; receiver stays in exactly the same foot position and identity, expression is slightly uncertain rather than pleased. Leave generous visible empty space between receiver's withdrawn hands and the still-offered cup. Nobody touches the other's body. This is a missed timing, not completed exchange.
```

## page-04-received

参照入力：exec-7183f92e-f7ee-411e-9de2-cffeb7392119.png

元出力：exec-fa187363-37e1-4aef-895a-515b8729e0ee.png

```text
Use case: precise-object-edit. Edit target reference 1, an inner-film production state drawing. Preserve the EXACT 16:9 framing, ivory blank background, graphite-and-muted-gouache line style, character identity, face, hair, clothes and colors, body height and feet positions, the single ground line, and the single ochre handleless cup's shape/size/color. No text, no arrows, no red marks, no duplicated cups, no external hands or props. This is one key drawing, not a montage. Change ONLY the arm/hand/cup action described below. Depict the successful completed exchange. Receiver on RIGHT now holds the SAME single ochre cup securely in both hands at waist/chest height, just left of their torso. Giver on LEFT has released it: both giver hands are EMPTY, lowered slightly but still open, a small visible relaxed pause in shoulders. Faces remain restrained, slight natural softening only, no huge smile, no celebration, no hearts. Keep feet, body positions, heights and silhouettes consistent with reference. Cup exists ONLY in receiver's hands. This is the payoff of someone patiently waiting; preserve the intimate tentative body language.
```

## page-03-too-early-v2

参照入力：exec-7183f92e-f7ee-411e-9de2-cffeb7392119.png

元出力：exec-26ad933d-b058-42ae-9a86-d3b62372cdf7.png

```text
Use case: precise-object-edit. Preserve image 1 EXACTLY: same two graphite/gouache people, identities, scale, framing, ivory background, clothes, head angles, feet and ground line. Change only their forearms and hands. LEFT giver still holds the single ochre cup securely in both hands, extended a little toward center. RIGHT receiver has moved both EMPTY hands down and back toward their own lower waist, prematurely as if already bringing an accepted cup toward their body, but they are empty. Their two empty hands remain SEPARATED by at least a palm width, one at belt height and one slightly lower. Palms face inward toward an imaginary cup, not toward camera. No palms touching, no clasped hands, no prayer, no gratitude gesture, no rejecting palm-out gesture. Receiver's head and eyes are directed toward the real cup, expression mildly puzzled; their body still slightly leans forward, indicating desire to receive it. Leave a clear gap between giver's real cup and receiver's empty lowered hands. No extra cup, no text, no arrows. One 16:9 frame showing a mistimed motion in an unfinished flipbook.
```

## page-00-shape-error

参照入力：exec-7183f92e-f7ee-411e-9de2-cffeb7392119.png

元出力：exec-dc344de7-6864-4b39-8075-144cbfecd7fa.png

```text
Use case: precise-object-edit. Edit reference 1 with only ONE precise object change. Keep every aspect of the original identical: two adult graphite/gouache characters, their pose, face, clothes, hand positions, 16:9 framing, ivory background and ground line. Change ONLY the single ochre cup's shape to show an incorrect animation drawing: the cup is anomalously TALL and narrow, roughly twice the original cup height, while still held by the giver's hands at its lower half. It remains ochre, handleless, and the only cup. This is deliberately an inconsistent cup silhouette that the animator will correct, not a new object. No changes elsewhere, no text, arrows or diagram labels. Hand contact must remain credible, cup top visibly higher than original.
```
