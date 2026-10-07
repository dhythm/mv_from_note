# BGM 来歴と使用条件

- ファイル: `public/bgm.mp3`（198.0秒 / 44.1kHz / ステレオ / 192kbps）。動画へ埋め込み時はRemotionがAAC 48kHzへ再エンコード。
- 生成: `audio/bgm_build.py`（Python/numpy）で**新規にゼロから合成**。乱数seed固定（20261007）で再現可能。
- 来歴: 既存の `assets/bgm.mp3` 等の波形・フレーズ・メロディは一切使用していない。外部サービス・有料生成・購入・配布素材を使っていない。純粋な数式合成（正弦波・加算合成・ノイズ・減衰包絡）。
- 使用条件: 自作合成のため第三者ライセンス不要。効果音なし。
- 仕様: 150BPM（0.4s/拍 = 12frame/拍 @30fps、1.6s/小節）。和声進行 Am–F–C–G。構成（秒）: 0–18 intro / 18–38 / 38–64（読む場面・密度のみ低減、テンポは維持）/ 64–92 build / 92–124 見せ場 / 124–145 / 145–178 ピーク / 178–198 収束（末尾2秒フェード）。
- 同期: 150BPMを30fpsグリッドに完全一致させ、`src/lib/energy.json` に各フレームの overall/low/kickPulse を書き出し、映像のY20/Y21へフレーム決定論的に供給。
- 数値確認: 長さ198.0秒、ピーク -1.5dBFS、ステレオ、無音でないこと。
- **未確認**: 音声の主観的試聴（音色・ノリ・映像との相性）。モデルは聴取できないため未確認。ユーザー試聴での採否確認が必要。

## 再生成

```
cd video-opus/audio
python3 bgm_build.py           # bgm.wav と ../src/lib/energy.json を生成
ffmpeg -y -i bgm.wav -codec:a libmp3lame -b:a 192k ../public/bgm.mp3
```
