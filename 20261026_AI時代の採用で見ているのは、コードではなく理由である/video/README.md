# 制作プロジェクト（Remotion、DOM／CSS のタイポグラフィー＋07 のみ three.js）

[企画書](../plan.html) に従って作った動画のプロジェクト一式。完成版は `../renders/final.mp4`（1920×1080・30fps・125.5秒＝3765フレーム、H.264／AAC。Git 管理外）。

## 再現手順（このフォルダで）

1. Node.js・Python 3・ffmpeg を用意し、`npm ci`、`python3 -m venv .venv && .venv/bin/pip install -r requirements.txt`。
2. 実写の原本: `footage-src/Speed_typing_with_dvorak.webm` を取得する（Wikimedia Commons・CC0。URL と sha256 は `../references.md`。Git 管理外）。
3. 素材: `node tools/prepare-public.mjs`（`render.mjs` も最初に実行する）。企画フォルダ `../assets/` の書体・ロゴを `public/` へコピーし、実写の原本 0:09–0:22 を 180° 回転・上部の天板を切り落として `public/typing/f001.jpg…`（30fps）へ書き出す。
4. ナレーション: 完成版に使った `audio/voice/*.mp3`（10区切り）を同梱済み。そのまま再出力する場合はAPI呼び出し不要。原稿変更時だけ `.venv/bin/python audio/tts.py`（ElevenLabs `eleven_v4`、声 Kouichi。原稿 `audio/narration.json` が変わった区切りだけ生成。キーは環境変数 `ELEVENLABS_API_KEY` かリポジトリ直下の `.env`）。記録は `audio/voice/log.json`。
5. BGM・効果音: `.venv/bin/python audio/bgm.py` → `audio/bgm.wav`、`public/bgm.m4a`（固定シード）。混ぜる: `.venv/bin/python audio/mix.py` → `public/mix.m4a`。
6. 全編: `node render.mjs full` → `out/final.mp4`。スチル `node render.mjs stills 0.4 10,20`、区間 `node render.mjs range S E name 0.5 [1]`、文字の画面外検査 `node render.mjs check 0.5` → `out/bounds.log`。
7. 点検: `npx tsc --noEmit`、`.venv/bin/python tools/strip.py out/final.mp4 S E 0.25 out/review/x.png`（区間の連続コマ一覧）、`.venv/bin/python tools/review.py out/final.mp4`（1秒ごとの一覧と静止区間の検出）。

## 構成

- `src/timeline.json`: カットの尺と切り替えの種類、声の頭までの秒（0.5秒）。尺はナレーションの実測から決め、120BPM の2拍（1秒）単位。`audio/mix.py` が声の位置をここから計算する。
- `src/Main.tsx`: 書体の読み込み、カットの切り替え（次の面が斜めの縁で押し入る 0.5 秒。01→02 は場面側で寄りを連続、10→ロゴは横振り）、カットを通しての画面全体の移動（`CutCam`）、エンドロゴ、音声、文字の画面外検査。
- `src/kit.tsx`: 部品。`Line`（行のマスクから入る。読む間は形を崩さない）、`Slam`（主役の語を塊ごと叩き込む）、`VLine`（縦組み）、`Lay`（層の移動・回転・拡縮）、`Plate`、`DrawLine`（線と矢印）、`CodeWall`（行ごとに逆向きに流れるダミーコードの壁）、`TypingFrame`（実写のコマを時刻で選ぶ）、`Card`（借りた答えの札）。
- `src/scenes1.tsx`（01–05）、`src/scenes2.tsx`（06・08–10）、`src/scene07.tsx`（07 の 3D）: 各カットはカットの頭からの秒だけで決まる。
- `src/components/Logo.tsx`: エンドロゴ。リポジトリ直下 `okady-work-logo.svg` の形とアニメーションをフレーム時刻へ翻訳したもの（20261018／20261021 と同一）。

## three.js の採否

07（下駄と柱の比較・因果）だけ採用（`@remotion/three`）。カメラの回り込み・沈み・見上げ、下駄の抜き取り、柱の落下はすべてカットの頭からの秒の関数。ラベルは DOM の層に置き、同じカメラで 3D の点を画面へ投影して位置だけ合わせた（文字にカメラの回転を掛けない）。ほかのカットは、行のマスク・詰め組（palt）・縦組みが必要なため DOM／CSS。

## 素材の使い方

| 素材 | 使用区間（本編） | 使い方 |
|---|---|---|
| `Speed_typing_with_dvorak.webm`（CC0） | 06: 56.0–69.0 秒（原本 0:10 から） | 180° 回転・天板を切り落とし、角丸の窓へ。原本 0:10–0:19.6 を等速 → 1.6 秒かけて減速し停止（原本 0:20.4 で止まる）→ 彩度を抜き、止まったカーソルを置く |
| `assets/code/dummy-code.ts` | 01・02・10 | 本文を `kit.tsx` の `CODE_LINES` に写し、壁の行と問われる 1 行（`const delay = …`）に使う |
| `okady-work-logo.svg` | エンドロゴ | `Logo.tsx` |
| Noto Sans JP（OFL）・Menlo | 全編 | 和文は Noto Sans JP（`../assets/fonts/`）。コードの等幅は企画の第一候補 IBM Plex Mono が手元に無く、制作機の Menlo（macOS 標準）を使った |

実写はカットの尺がナレーションの実測で企画の参考値（約11秒→13秒）より伸びたため、企画の参考区間（0:10–0:16）より長く使っている。ループ・引き伸ばしはしていない（減速は企画どおりの演出）。

## BGM

Python（numpy/scipy）で合成。音楽生成サービスは使っていない。理由: 06 の手元の減速と同じ曲線でテープストップさせる、02 の組み変わり・各カットの主役の語の着地に合わせる、といったフレーム単位の同期が必要で、ローカル合成が確実で費用もかからないため。前作の曲は流用していない（共通の合成関数の書き方だけ参考にした）。

- 120BPM・Aマイナー（Am–F–C–G）。ミニマルなテック・ポップ: タイトなキック、16 分のハイハット、FM の短いアルペジオ、キックでポンプするパッド、跳ねるベース。09・10 にリード
- 01 は音数を絞り（フィルターを閉じたアルペジオ）、02 の「なぜ？」で開く。08 の問いの前後は半分のテンポ感へ引く
- 06: 手が止まる区間（9.6–11.2 秒）に再生速度を映像と同じ曲線で 0 へ落とすテープストップ → 07 の頭まで無音に近いパッド → 07 の柱が落ちる瞬間の低い衝撃から組み直す
- 効果音: 切り替えのスウッシュ、主役の語の着地（打音・低い衝撃を語ごとに変える）、02 の組み変わりのグリッチ、エンドロゴの o の着地・スライド・.work
- 混ぜ方: BGM を全体で −8 dB、声のある間はさらに −9 dB。全体を −14 LUFS に合わせる（`audio/mix.py`）

## 保存対象

制作ソース・設定・依存関係の固定情報・生成／点検スクリプト・ナレーション音声（`audio/voice/`）を Git 管理する。`public/`、`footage-src/`、生成音源（bgm／mix）、書き出し・確認画像・キャッシュは管理対象外（`video/.gitignore`）。
