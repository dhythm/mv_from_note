# video-kinetic — レビューの本質は、品質を高めること

note記事「レビューの本質とは：品質向上のための協働プロセス」のキネティックタイポグラフィ動画（Remotion）。
1920×1080 / 30fps / 96.9秒 / H.264 yuv420p + AAC。台本は `../plan.md`、引用の対応は `../references.md`。

## セットアップ

`node_modules` は依存が同一の `../../20261003_なぜSNSで見つけた便利ツールは続かないのか/video/node_modules` へのシンボリックリンク（企画の `.gitignore` で除外）。リンクが無い環境では `npm ci`（`package-lock.json` あり）。

フォントは `@remotion/google-fonts`（Noto Sans JP / Shippori Mincho）をレンダリング時に読み込むため、ネットワーク接続が必要。

## 手順

```sh
npm test            # 読了時間・ビートの連続・引用の原稿一致・場面の割り当て・結論で終わること
npm run typecheck
npm run audio       # 音を合成 → ../../output/opus-kinetic/public/score.wav（-20 LUFS に整える。要 ffmpeg）
npm run render:preview  # 720p 確認用 → ../../output/opus-kinetic/review-kinetic-preview.mp4
npm run render      # 1080p → work/ に出力後、ffmpeg で yuv420p・faststart に整えて review-kinetic.mp4
npm run studio      # プレビュー
```

`render:proto` は冒頭（Opening コンポジション）だけを書き出す。

## 構成

| ファイル | 内容 |
|---|---|
| `src/timeline.ts` | 台本の唯一の情報源。ビートの秒・画面の言葉・引用／要約／ラベルの区別 |
| `src/timeline.test.ts` | 台本と構成の検査（原稿は読み取りのみ） |
| `src/Main.tsx` | 全編。場面とビートの対応表と音声 |
| `src/scenes/Opening.tsx` | B01〜B04：問い →「〇〇さんのレビューを通した」→ 目的／二の次の逆転 →「品質を高めるための行為」 |
| `src/scenes/Responsibility.tsx` | B05 見せても責任は移らない／B06 承認は否定しない |
| `src/scenes/Focus.tsx` | B07 複数の視点／B08 集中力の限界（例）／B09 事前準備と時間 |
| `src/scenes/Cycle.tsx` | B10 指摘・議論修正・再レビュー／B11 善意の人 |
| `src/scenes/Joushi.tsx` | B12〜B13 上長の責任とレビューを切り分ける |
| `src/scenes/Ending.tsx` | B14 結論で締める |
| `src/glyph.tsx` `src/common.tsx` `src/design.ts` | 1字ずつのキーフレーム、共通部品、色とイージング |
| `scripts/score.ts` | 音楽・効果音の合成（外部音源なし、種付き乱数） |
| `scripts/beats-table.ts` | ビートごとの秒・文字数・読了の余裕を一覧 |

生成物（音声・動画・検品画像）はすべて `../../output/opus-kinetic/` 以下で、Git 管理外。
