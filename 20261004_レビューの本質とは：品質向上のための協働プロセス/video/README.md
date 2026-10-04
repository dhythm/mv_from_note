# 映像『もう一度、めくる』（Remotion）

`../plan.md` の14カット・本編180秒を、`../assets/` の基準画11点だけから作る2D短編。台詞・説明字幕・ナレーション・音楽なし。効果音は全てコードで合成。1920x1080、24fps、タイトル5秒＋本編180秒＋クレジット8秒＝193秒。

## 作り直す手順

```bash
# 1. 画像処理用の Python（numpy / Pillow / scipy）。venv の場所は自由
python3 -m venv ../../output/opus-video/.venv
../../output/opus-video/.venv/bin/pip install -r prep/requirements.txt

# 2. Node の依存
npm ci

# 3. 部品の生成（public/gen/ へ。Git 管理外）。Python は PREP_PYTHON で指定、省略時は python3
PREP_PYTHON=../../output/opus-video/.venv/bin/python npm run prep

# 4. 効果音の合成（public/gen/sfx-*.wav）
npm run sfx -- film
npm run sfx -- proto

# 5. 検査と書き出し（../../output/opus-video/ へ）
npm test
npm run typecheck
npm run render          # 全編 mouichido-mekuru.mp4（Apple M 系で約18分）
npm run render:proto    # 難所試作 proto-c08-c11.mp4（約3分）
npm run studio          # プレビュー
```

検品用の静止画一覧：`sh scripts/stills.sh Film 名前 秒 秒 …`（`../../output/opus-video/check/名前/sheet.png`）。

## しくみ

| 層 | 作り方 | 主なファイル |
|---|---|---|
| 内側のパラパラ漫画 | P01 の体に、P00〜P04 から切り出した腕・手・カップを差し替え、24ページ×4版（Q0〜Q3）を合成。前腕は袖口を固定して伸縮 | `src/story/pages.ts`（ページ表）、`prep/inner.py` |
| 版の因果 | Q0→Q1 はカップの形だけ、Q1→Q2 は受け手の絵を変えずカップと渡す人だけ、Q2→Q3 は受け手と隣接ページ。ためらいのページは全版で同一 | `src/story/pages.test.ts` |
| 手のない机 | K01 を土台に、手が動く右下だけ K03・K04 と K01 の別の場所から張り替え（境界の色差は調和補間）。鉛筆・消しゴム・印も外す。A の左手は全基準画で綴じ目を押さえるので背景に残し、同じ位置に前景の手を重ねる | `prep/outer.py` |
| 手と道具 | 基準画から9種の手（色＋背景差分のマスク）と鉛筆・消しゴム・印を切り出し、袖を画面外まで延長。袖の奥を中心に回転・移動し、高さに応じて影を変える | `prep/outer.py`、`src/stage/Stage.tsx` |
| ページと表紙 | 紙の質感は K01／K02 から。めくりは CSS 3D で、1枚を3本の帯に分けてしならせる。めくる速さは常に 12 ページ/秒 | `src/stage/Book.tsx`、`src/story/flip.ts` |
| 消す・描く | before／消した跡／after の3枚を重ね、消しゴム・鉛筆の通った経路だけを見せるマスク。道具の先は同じ経路を通る | `prep/edits.py`、`src/cuts/kit.ts` |
| 二案の比較（C12） | 薄紙に、渡す人を急がせる腕（B の案）と、受け手が待つ手（A が選ぶ案）を下描き | `prep/sketches.py` |
| カット | 時刻→舞台の状態の純粋関数。C08〜C11 は試作の拍を1.5倍に伸ばして使う | `src/film/beats.ts`、`src/film/film.ts`、`src/cuts/proto.ts` |
| 効果音 | 雑音・減衰する正弦波・小さな残響で、紙・鉛筆・消しゴム・印・椅子・息・室内の空気を合成。映像と同じ拍の表から作る | `src/audio/synth.ts`、`src/film/filmCues.ts` |

`public/gen/` は全て生成物（約1.7MiB の WebP と WAV）。Git には入れない。リポジトリに入るのはソースと `../assets/` の基準画だけ。

## 制約と限界

- 手は**切り絵式の差し替えと移動**であり、指の一本一本を描いた作画ではない。新しい手の形（掌を上に向ける等）は作れないため、手の演技は基準画の9つの形の範囲に限られる。
- 背景の机・手は 1600x900 の基準画を出力で1.2倍（寄りでは約1.9〜2.9倍）に拡大している。内側の絵は 1280x720 を寄りで約1.5倍。ページ・めくり・影・鉛筆の線の出方はコード由来で出力解像度。
- 本セッションに画像生成はなく、中割りの手描き原画は追加していない。
- 押印の場面などは右下の机を張り替えた背景で、木目の一部（節）が繰り返して見える。
