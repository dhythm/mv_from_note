# Opus起動記録

- Claude Code: 2.1.293
- モデル指定: opus
- 権限指定: --permission-mode auto（実際の初期化ログは起動後確認）
- セッションID: 571256ea-85eb-4f15-8c14-5d610709b1e1
- 隔離: --worktree opus-maintenance-20261008
- 正本: /Users/yuta.okada/local/dev/mv_from_note/20261008_メンテナンスされない（できない）モノは、いずれ負債になる
- 状態: 起動要求

- 初期化ログ確認: model=claude-opus-5-5、permissionMode=auto
- 実作業場所: /Users/yuta.okada/local/dev/mv_from_note/.claude/worktrees/opus-maintenance-20261008
- 状態: 資料確認を開始（起動成功だけでなく、資料を読むツール実行を確認）
- 統合予定: 通常コピーの対象企画/video-opus/

## 試作レビューの反映

- 冒頭・内部腐食・終盤の試作をCodexが画面観察し、カット4・9の文字の隠れを発見。
- 全編出力前に処理をSIGINTで穏やかに中断し、同セッションを --resume / --permission-mode auto で再開。設定や隔離ガードの変更なし。
- 追加指示: opus-direction-update.md / director-review.md。既存ナレーションを維持し、文字の配置・奥行き等を直して残作業を継続。

## 完了

- 最終全編の生成・型検査・音声技術検査・再現性検査完了。
- 通常コピーへ統合済み: 同企画/video-opus/out/maintenance-full.mp4。
- 完了報告と改善記録: opus-production-report.md、feedback.md。実試聴未確認。

## ユーザー指摘の線の修正

- 同セッションを `--resume` / `--model opus` / `--permission-mode auto` で再開。初期化ログでも `permissionMode=auto` を確認。
- 作業場所と出力先は同じ隔離ワークツリー。指示: opus-line-fix-request.md。
- 修正対象はカット8の「生涯保証」の札と箱の蓋の交差。既存音声を再利用。
- 修正・型検査・全編再書き出しが完了。修正版のソース、完成動画、確認画像、報告を通常コピーへ統合済み。
