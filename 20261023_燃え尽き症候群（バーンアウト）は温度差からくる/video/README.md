# 制作プロジェクト（Remotion、DOM／CSS のタイポグラフィー）

[企画書](../plan.html) に従って作った動画のプロジェクト一式。完成版は `../renders/final.mp4`（1920×1080・30fps・98.5秒＝2955フレーム、H.264／AAC 48kHz ステレオ。Git 管理外）。

## 再現手順（このフォルダで）

1. Node.js・Python 3・ffmpeg を用意し、`npm ci`、`python3 -m venv .venv && .venv/bin/pip install -r requirements.txt`。
2. 素材: `node tools/prepare-public.mjs`（企画フォルダ `../assets/` の書体・ロゴ・ろうそくの実写を `public/` へコピー。`render.mjs` も最初に実行する）。
3. ナレーション: 完成版に使った `audio/voice/*.mp3`（9区切り）を同梱。そのまま再出力する場合は API 呼び出し不要。原稿変更時だけ `.venv/bin/python audio/tts.py`（ElevenLabs `eleven_v4`、声 Kouichi。`audio/narration.json` が変わった区切りだけ生成。キーは環境変数 `ELEVENLABS_API_KEY` かリポジトリ直下の `.env`／`.env.local`）。記録は `audio/voice/log.json`。
4. 読みの照合（任意）: `uv venv -p 3.12 .venv-asr && VIRTUAL_ENV=.venv-asr uv pip install faster-whisper`、`HF_HUB_OFFLINE=1 .venv-asr/bin/python tools/transcribe.py`。ローカルの Whisper large-v3 で書き起こし、語の時刻を `audio/voice/words.json` に書く（外部へは送らない）。
5. BGM・効果音: `.venv/bin/python audio/bgm.py` → `audio/bgm.wav`、`public/bgm.m4a`（固定シード）。混ぜる: `.venv/bin/python audio/mix.py` → `public/mix.m4a`。
6. 全編: `node render.mjs full` → `out/final.mp4`。スチル `node render.mjs stills 0.5 10,20`、区間 `node render.mjs range S E name 0.5 [1]`、文字の画面外検査 `node render.mjs check 0.25` → `out/bounds.log`。
7. 点検: `npx tsc --noEmit`、`.venv/bin/python tools/strip.py out/final.mp4 S E 0.5 out/review/x.png`（区間の連続コマ一覧）。

## 構成

- `src/timeline.json`: カットの尺と切り替えの種類、声の頭までの秒（0.5秒）。尺はナレーションの実測＋読む時間で決め、120BPM の2拍（1秒）単位。`audio/narration.json` の start／end もここから決める。
- `src/Main.tsx`: 書体の読み込み、カットの切り替え（次の面が斜めの縁で押し入り、前の面を押し出す 0.5 秒）、エンドロゴ、音声、文字の画面外検査。
- `src/kit.tsx`: 部品。`Line`（行のマスクから1文字ずつ入る。読む間は形を崩さない）、`VLine`（縦組み）、`Lay`（層の移動・回転・拡縮）、`Plate`（色の面）、`DrawLine`（線）、`Thermo`（温度計＝自分の熱量の量）、`Dot`、`CandleWindow`（07 のろうそくの窓）、`kv`（キー列の補間。キーの3つ目はそのキーへ向かう区間のイージング）。
- `src/scenes1.tsx`（01–03）、`scenes2.tsx`（04–06）、`scenes3.tsx`（07–09）: 各カットはカットの頭からの秒だけで決まる。
- `src/components/Logo.tsx`: エンドロゴ。リポジトリ直下 `okady-work-logo.svg` の形とアニメーションをフレーム時刻へ翻訳したもの（20261018 と同一）。
- 出発点は 20261021 の制作一式（部品・書き出し・音声の仕組み）。場面ファイルと曲は新規に書いた。

## three.js の採否

不採用。06 のピント送りは、文字を DOM のまま CSS の `blur` と拡縮で入れ替えれば足り、ライトな背景で点状のにじみも出ない。文字を主役にする行のマスク・詰め組（palt）・縦組みは DOM／CSS の方が確実に組める。すべての動きは `useCurrentFrame` から計算し、実時間・順序依存の乱数は使っていない（04 のタイルは整数シードの `hash`）。

## 素材の使い方

| 素材 | 使用区間（本編） | 使い方 |
|---|---|---|
| `white-candle-02-07.mp4` | 07: 66.0–71.0 秒（素材 0–5 秒） | 温度計の灰色の球が右の窓（543×527px、角丸）に重なり、円の窓が開いて炎の実写へ切り替わる。等速・無音・ループなし。カットの終わり（08 へ押し出される 0.5 秒を含む）でちょうど 5 秒 |
| Noto Sans JP（OFL） | 全編 | 見出し 900、補助文 700〜800。palt |
| okady.work SVG | 93.0–98.5 秒 | 規定の 4 秒の動き＋1.5 秒保持 |

## BGM

Python（numpy/scipy）で合成。音楽生成サービスは使っていない。理由: 球の停止・境界の欠け・窓の展開・語の着地など約30か所へフレーム単位で合わせる必要があり、ローカル合成が速く確実で費用もかからないため。前作の曲は流用していない。

- 120BPM・4拍子（0秒起点）。01–05 は A マイナーの Am(add9)–Fmaj7–Dm7–Esus4。8分で刻む短いベース、リムショット、乾いたハイハット、裏拍の短い和音
- 06 は低音を D へ移した Dm9–B♭maj7–Gm7–Asus4。ピント送りの直前の1拍だけハイハット以外を抜く
- 07 から C 長調へ開く（Cmaj9–G/B–Am7–Fmaj7）。温かいエレピの刻み・持続の鍵盤・プラック・シェイカー。08 からリード。09 は Fmaj7–G–Csus2–C
- アクセント: 03 の球の停止、06 の視線の転換、08 の「起点力」、09 の「踏もう。」。カットの切り替えのスウッシュ、エンドロゴの o の着地・スライド・.work
- 混ぜ方: BGM を全体で −8 dB、声のある間はさらに −9 dB。全体を −14 LUFS に合わせる

## 保存対象

制作ソース・設定・依存関係の固定情報・生成／点検スクリプト・ナレーション音声と記録（`audio/voice/`）を Git 管理する。`public/` へコピーする素材、生成音源（bgm／mix）、書き出し・確認画像・キャッシュ、`.venv`／`.venv-asr` は管理対象外。
