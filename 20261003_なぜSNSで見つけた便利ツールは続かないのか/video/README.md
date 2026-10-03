# 映像（Remotion）

`../script.md`（台本）と `../references.md`（記事の引用）をもとにした、キネティックタイポグラフィの映像。1280x720、30fps、90秒、BGM付き。
静止画と BGM は `../assets/` をそのまま使う（`remotion.config.ts` で publicDir に指定）。

```bash
npm install
npm test          # タイムライン・言葉の表示時間・引用が references.md のままか・合成器の単体テスト
npm run bgm       # BGM を合成して ../assets/bgm.mp3 に書き出す（ffmpeg が必要）
npm run studio    # プレビュー
npm run render    # ../../output/20261003.mp4 に書き出す（output/ と *.mp4 は git 管理外）
```

- 画面に出す言葉と秒数は `src/lib.ts` の `BEATS` に集約している。各まとまりが「7文字/秒 + 1拍」以上止まること、重ならないこと、引用部分が references.md の文のままであることをテストで保証する。
- BGM は `bgm/compose.ts` で合成している（外部音源なし）。映像の時間軸（`BEATS`）を読んで、崩落・語の入れ替え・最後の一文に音を合わせる。
- フォント（Noto Sans JP、しっぽり明朝）は書き出し時に Google Fonts から取得するので、ネット接続が必要。
- 企画書から変えた点：記事の主張を段階的に文字で出す／BGM を付ける／最後に記事タイトルを小さく出す（いずれも制作時に確認済み）。机の写真は固定のまま、動くのは文字と図形だけ。
