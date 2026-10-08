# ナレーション記録（ElevenLabs eleven_v4）

- サービス: ElevenLabs Text to Speech（`/v1/text-to-speech/{voice}/with-timestamps`、mp3_44100_192）
- モデル: `eleven_v4`（生成前に `/v1/models` で当アカウントの一覧に存在し、`ja` 対応・TTS可を確認。結果は `audio/narration/api-check.json`）
- 声: Kouichi - Calm Japanese Narrator / `S9yQN3065fl76yl0gxsW`（professional, calm, ja, middle_aged, narrative_story）
  - 選定理由: 今回の問いと留保を落ち着いて語る常体のナレーションに合う、利用可能な日本語ナレーター。前作で同じ声の eleven_v4 にユーザーの肯定評価がある。今回の原稿・音声は新規。
- 設定: language_code `ja`、stability 0.55、similarity_boost 0.75、seed 20261008。速度・ピッチ加工なし
- 原稿: `narration-script.md`（生成前に保存）。送信文: `audio/narration-plan.json`。英字略語（AI/PTA/OS）は読み誤り回避のためカナで送信（画面は英字）
- 生成回数: 10カット×各1回（試験生成はカット1で、そのまま本番採用）。追加の別案生成なし。可読性修正（ディレクターレビュー）でも再生成していない
- 文字数（送信文）: 35+51+31+98+96+105+96+101+95+69（カット1〜10、計777字）
- 確認できたクレジット: レスポンスヘッダ `character-cost` 合計 **94**（4,6,4,12,12,13,12,12,11,8）。`/v1/user/subscription` の character_count が 188→282（+94）で一致。料金（円・ドル換算）は未確認
- request ID: 各 `audio/narration/v4/cut-XX.json` の `response_headers.request-id`
  - 1 pmWhD8g7IWGJKI1l9iLJ / 2 LzwBZeg5Wn6ueONAaMlM / 3 C3yxKmr5FhAHZbGTexov / 4 T4EvFpKGHHyZA7dfL9GB / 5 TB1bWZijWSSqBrTxBYNf
  - 6 qUCWYHo27h0YNaLjZf40 / 7 qusAZ8Y4znw7NhxMWTJn / 8 hX3YA4K1hjKRTAl7VIXa / 9 wMHEgsVzNBKyFTJLT3ki / 10 PA5QAoDRnq0P3JANWPwR
- 実尺: 合計 140.98 秒。文の切れ目だけ 0.6〜0.9 秒の自然な間（`audio/narration/analysis.json`）
- 同期: 文字単位の時刻（alignment）から要点の表示時刻を決定（`audio/timeline_build.py` → `src/lib/timeline.json`）。各カットの画は発話終了＋余韻まで保持し、発話中に次の論点へ進めない。発話の重なり・カット越えは `audio/mix_build.py` で検査（エラーで停止する）
- APIキー: 通常コピーの Git 対象外 `.env` から実行時に読み、表示・保存・コピーしていない（`audio/eleven_common.py`）
- **試聴: 未確認。** モデルは音声を聴取できないため、抑揚・読みの自然さは数値（無音位置・音量）でしか確認していない
