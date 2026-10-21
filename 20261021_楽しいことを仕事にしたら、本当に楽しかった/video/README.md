# 制作プロジェクト（Remotion、DOM／CSS のタイポグラフィー）

[企画書](../plan.html) に従って作った動画のプロジェクト一式。完成版は `../renders/final.mp4`（1920×1080・30fps・151.5秒＝4545フレーム、H.264／AAC 48kHz ステレオ。Git 管理外）。

## 再現手順（このフォルダで）

1. Node.js・Python 3・ffmpeg を用意し、`npm ci`、`python3 -m venv .venv && .venv/bin/pip install -r requirements.txt`。
2. 素材: `node tools/prepare-public.mjs`（企画フォルダ `../assets/` の書体・ロゴ・写真・手元動画を `public/` へコピー。`render.mjs` も最初に実行する）。
3. ナレーション: 完成版に使った `audio/voice/*.mp3`（14区切り）を同梱済み。そのまま再出力する場合はAPI呼び出し不要。原稿変更時だけ `.venv/bin/python audio/tts.py`（ElevenLabs `eleven_v4`、声 Kouichi。原稿 `audio/narration.json` が変わった区切りだけ生成。キーは環境変数 `ELEVENLABS_API_KEY` かリポジトリ直下の `.env`）を実行する。記録は `audio/voice/log.json`。
4. BGM・効果音: `.venv/bin/python audio/bgm.py` → `audio/bgm.wav`、`public/bgm.m4a`（固定シード）。混ぜる: `.venv/bin/python audio/mix.py` → `public/mix.m4a`。
5. 全編: `node render.mjs full` → `out/final.mp4`。スチル `node render.mjs stills 0.4 10,20`、区間 `node render.mjs range S E name 0.5 [1]`。
6. 点検: `npx tsc --noEmit`、`.venv/bin/python tools/strip.py out/final.mp4 S E 0.25 out/review/x.png`（区間の連続コマ一覧）、`.venv/bin/python tools/review.py out/final.mp4`（1秒ごとの一覧と静止区間の検出）。

## 構成

- `src/timeline.json`: カットの尺と切り替えの種類、声の頭までの秒（0.5秒）。尺はナレーションの実測から決め、120BPM の2拍（1秒）単位。`audio/narration.json` の start／end もここから決める。
- `src/Main.tsx`: 書体の読み込み、カットの切り替え（次の面が斜めの縁で押し入り、前の面を押し出す 0.5 秒）、エンドロゴ、音声。
- `src/kit.tsx`: 部品。`Line`（行のマスクから1文字ずつ入る。読む間は形を崩さない）、`VLine`（縦組み）、`Lay`（層の移動・回転・拡縮）、`Plate`（色の面）、`DrawLine`（線と矢印）、`VideoWindow`（手元動画の窓）、`PhotoText`（写真を字の中に見せる）。
- `src/scenes1.tsx`（01–05）、`scenes2.tsx`（06–10）、`scenes3.tsx`（11–14）: 各カットはカットの頭からの秒だけで決まる。
- `src/components/Logo.tsx`: エンドロゴ。リポジトリ直下 `okady-work-logo.svg` の形とアニメーションをフレーム時刻へ翻訳したもの（20261018 と同一）。

## three.js の採否

不採用。文字を主役にするために行のマスク・詰め組（palt）・縦組み・字の中の写真（background-clip）が必要で、DOM／CSS の方が確実に組めた。企画が three.js を推奨した 12 の「回り込む下層の面」は、2D の回転と位置の受け渡しで足りた。すべての動きは `useCurrentFrame` から計算し、実時間・順序依存の乱数は使っていない。

## 素材の使い方

| 素材 | 使用区間（本編） | 使い方 |
|---|---|---|
| `typing-closeup-10s.mp4` | 04: 31.7–40.0 秒（素材 0–8.3 秒） | 右の切り抜き窓から斜めの帯へ広げる。等速・無音 |
| `typing-closeup-10s.mp4` | 06: 47.5–57.5 秒（素材 0–10 秒） | 04 と同じ窓から始め、反対側へ移す。等速・無音 |
| `hong-kong-skyline-2009.jpg` | 05: 40–48 秒 | 「香港」の字の中 → 右の写真面。横のパンと寄りだけ |
| 書体4種・ロゴ | 全編 | 企画フォルダ同梱の原本（OFL）。Noto 以外は単一の太さなので太さ指定をしない（疑似ボールドで字が潰れる） |

カットの尺がナレーションの実測で企画の参考値より伸びたため、手元動画は企画の参考区間（04: 0–6 秒、06: 0–7 秒）より長く使っている。編集用ファイルの範囲内で、ループ・引き伸ばし・速度変更はしていない。

## BGM

Python（numpy/scipy）で合成。音楽生成サービスは使っていない。理由: 切り替え・面の展開・語の着地など約40か所へフレーム単位で合わせる必要があり、ローカル合成が速く確実で費用もかからないため。前作の曲は流用していない。

- 120BPM・4拍子（0秒起点）。F調のファンク寄り: Fmaj7–Dm7–Gm7–C7。上物を引く区間（01・03・09前半・13）は Dm7–B♭maj7–Gm7–Csus4
- 4つ打ちのキック、2・4拍のクラップ、16分のハイハット、16分で跳ねるベース、裏拍のエレピのスタブ、ギター風のプラック。14 と 08 にリード
- 01 は半分のテンポ感で音数を絞り、02 の頭で開く。05 の転機と 14 の「めっちゃいい」にライザーと着地
- 効果音: カットの切り替えのスウッシュ、窓の展開、引用の着地、循環の線、エンドロゴの o の着地・スライド・.work
- 混ぜ方: BGM を全体で −8 dB、声のある間はさらに −9 dB。全体を −14 LUFS に合わせる

## 保存対象

制作ソース・設定・依存関係の固定情報・生成／点検スクリプト・ナレーション音声（`audio/voice/`）を Git 管理する。`public/` へコピーする素材、生成音源（bgm／mix）、書き出し・確認画像・キャッシュは管理対象外。

完成後の整理で、`out/`、`.remotion/`、`public/`、生成音源、`node_modules/`、`.venv/` を削除済み。再出力は上記1・2・4・5の順で復元できる。完成動画は `../renders/final.mp4` に保持し、サムネイルは `../assets/thumbnail/thumbnail.png` に保存している。
