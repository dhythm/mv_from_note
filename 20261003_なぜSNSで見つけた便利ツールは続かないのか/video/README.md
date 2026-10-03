# 映像（Remotion）

`../plan.md` と `../references.md` をもとにした、キネティックタイポグラフィの映像。1280x720、30fps、90秒、無音。
静止画は `../assets/` をそのまま使う（`remotion.config.ts` で publicDir に指定）。

```bash
npm install
npm test          # タイムライン・引用の表示時間・引用が references.md のままか、などを検査
npm run studio    # プレビュー
npm run render    # ../../output/20261003.mp4 に書き出す（output/ と *.mp4 は git 管理外）
```

- 時間軸は `src/lib.ts` の `SCENES` と `QUOTES` に集約している。引用の静止時間は「7文字/秒 + 1拍」以上あることをテストで保証する。
- 企画書から変えた点：文字は最後の一文だけでなく、記事の主張を段階的に出す（制作時に確認済み）。机の写真は固定のまま、動くのは文字と図形だけ。
