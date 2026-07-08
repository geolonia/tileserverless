# CLAUDE.md

## ブランチ運用ルール（MUST）

- default branch は `develop`（GitHub organization rule で保護されているのはこのブランチのみ）。
- `main` が branch protection で保護されていなくても、`develop` を経由せず `main` へ直接変更を加えてはならない。
- `main` への直接変更は staging 環境での動作確認をスキップして production 環境へ変更を適用することになるため、原則禁止。
- production 環境が staging 環境よりも進んでいる（内容が乖離した）状態を発生させてはならない。
- PR は必ず `develop` を経由して `main` に取り込むこと。feature/fix ブランチは `develop` から作成し、`develop` を base に PR を作成すること。
- PR の base branch を `main` に向けてはならない。
