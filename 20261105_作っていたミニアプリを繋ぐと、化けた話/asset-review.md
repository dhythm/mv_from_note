# 05の採用素材と確認記録

## 採用内容

- 05の2〜6秒に、模擬画面とマウスを操作する手元を並べる4秒の挿入を採用。
- 模擬画面は「集計」の結果をコピーし、「整形」へ貼り付け、元の画面へ戻る。業務名、実データ、実数値は使用していない。
- 手元はGrok Imagineで生成したイメージ。本人・職場の記録映像として扱わない。画面に「AI生成のイメージ / Created with Grok」を表示する。
- 他のカットは既存の青いコマで統一する。06の画面文言は「一か所が、全体に響く。」を採用。

## ファイルと区間

| 用途 | ファイル | 仕様と使用区間 |
|---|---|---|
| 手元の原本 | assets/source/cut05-hand-mouse-grok-source.mp4 | 1280×720、24fps、6.041667秒。映像と付随ポスターを含む |
| 手元の編集用 | assets/footage/cut05-hand-mouse-4s.mp4 | 原本0.5〜4.5秒を等速切り出し。1280×720、24fps、4秒、無音 |
| 模擬画面 | assets/footage/cut05-manual-transfer-ui.mp4 | 1200×680、30fps、4秒、無音。全区間使用 |
| 配置確認 | assets/review/cut05-placement-4s.mp4 | 1920×1080、30fps、4秒。模擬画面・手元・文字を合成 |
| 配置の静止見本 | assets/review/cut05-placement.webp | 配置確認動画の1.5秒 |
| 制作元 | assets/source/build_manual_transfer.py | 模擬画面、05・06コマ画、切り出し、配置確認を再生成できる |
| フォント | assets/fonts/NotoSansJP-wght.ttf | Noto Sans JP、同梱のOFLに従う |

手元は1000×562に縮小し、左240px・上0pxから620×562を切り出し、確認画面の1270,208へ配置。模擬画面は1164×660へ縮小し60,150へ配置。この数値は確認見本の配置で、制作側は手とマウス・可読性・表示文言を保って調整できる。

## 調達と生成

- 既存の打鍵ストックも棚卸ししたが、今回はコピー・貼り付けの操作に対応するマウスの手元を新たに用意した。
- imagegenの組み込みツールで参照画像を1枚作成し `assets/source/cut05-hand-first-frame.png` に保存した。
- Grok Build CLIの初回確認で、参照画像が必要と判明。参照画像を付けた動画生成1回は、ZDRで `output.upload_url` が必要というエラーで失敗。動画出力はなし。
- ブラウザ版Grok Imagineに切り替え、テキストから動画を1回生成。6秒、16:9、720p、音声オフを選択。ブラウザのファイル選択操作では参照画像を添付できず、テキスト指示で構図を指定した。参照画像は完成動画の入力には使用していない。
- 生成ページ https://grok.com/imagine/post/2695c725-d7f9-4f46-8308-55b58a6077fc?conversation=5ff3fd9e-9011-4d01-8013-b5a1ddc56fb8
- 実際のブラウザ用プロンプトは `assets/source/grok-browser-request.txt`。CLIの試行は `grok-hand-result.json` と `grok-hand-video-result.json` に記録。
- ブラウザの内部モデルIDと動画生成の費用・クレジット消費量は画面で確認できず、不明。CLIの確認・失敗リクエストに伴うモデル費用は0.0252994米ドル＋0.034068米ドル＝0.0593674米ドル。これは動画生成料金ではない。imagegenの課金額もツール出力では不明。

## 利用条件の確認

- 2026-11-05に[Grokの利用規約](https://x.ai/legal/terms-of-service)第4節と[ブランドガイドライン](https://x.ai/legal/brand-guidelines)のContent Attributionを確認。規約には利用者の権利保持と出力利用時の許諾・帰属表示、AI生成の開示に関する記載がある。素材表示に `Created with Grok` を含める。公開は今回の作業範囲に含まれていない。
- 参照画像、模擬画面、生成動画に第三者の人物写真・ロゴ・実顧客情報を入力していない。
- ファイルの仕様とSHA-256は `assets/review/media-manifest.json`。

## 確認範囲

- 手元動画の0〜5秒の1秒間隔のコマを確認。マウスと手首の位置、指の本数の連続性、背景の安定性を確認した。指を持ち上げる動きがやや大きい区間は含まれるが、選んだ4秒内で操作のイメージとして使用可能と判断。
- 配置確認の静止見本で、手とマウスが切れず、模擬画面と見出しに重ならないことを確認。
- 模擬画面・配置見本・06コマ画の文字外接矩形を検査。左右30px・上下20pxの範囲で画面端違反0件。結果は `assets/review/ui-bounds.json`。これは本編のDOM機械検査とは別の素材段階の確認。
- MP4の全フレームのデコード検査を実施。本編の全カット・ナレーション・BGM・場面接続は制作段階の確認対象。

## Grok Buildの保存先に関する補足

ユーザーの質問を受け、値を出力せず設定項目だけ確認。`~/.grok/config.toml` にCloudflare R2のバケット・endpoint・region・read_write認証情報が存在する。`~/.grok/managed_config.toml` は存在しない。Grok Build 1.0.70の今回の呼び出しは、APIから `output.upload_url` が必要という400エラーを受けた。[公式手順](https://docs.x.ai/build/settings/zdr-video-storage)はmanaged_config.tomlへの設定を指定している。設定の配置または適用経路の問題が考えられるが、実効設定とR2接続の診断は未完了のため原因は確定していない。
