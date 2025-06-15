# 🔋 NEXUS ENA - AWS電力価格分析基盤

[![AWS](https://img.shields.io/badge/AWS-Cloud-orange.svg)](https://aws.amazon.com/)
[![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)](https://python.org/)
[![Terraform](https://img.shields.io/badge/Terraform-Infrastructure-purple.svg)](https://terraform.io/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**エネルギー市場向けの包括的なリスク分析・価格予測プラットフォーム**

## 🎯 プロジェクト概要

NEXUS ENAは、電力・エネルギー市場における価格分析、リスク評価、予測モデリングを行うAWSクラウドベースの分析基盤です。

### 🌟 主要機能
- ⚡ **リアルタイム価格分析** - 電力先物・現物価格の監視
- 📊 **VaRリスク計算** - モンテカルロシミュレーション
- 📈 **フォワードカーブ構築** - 将来価格予測モデル
- 🔄 **季節性分析** - 需要パターン・天候影響分析
- 🚨 **アラートシステム** - リスク閾値監視・通知

## 🏗️ アーキテクチャ

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│   Data Sources  │────│  AWS Lambda  │────│   TimeStream    │
│  (Market APIs)  │    │ (ETL Pipeline)│    │ (Time Series)   │
└─────────────────┘    └──────────────┘    └─────────────────┘
                              │
                              ▼
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│   SageMaker     │────│  API Gateway │────│   QuickSight    │
│ (ML Analytics)  │    │  (REST API)  │    │  (Dashboard)    │
└─────────────────┘    └──────────────┘    └─────────────────┘
```

## 📋 実装スケジュール

### 🗓️ Month 1: 基盤構築
- **Week 1-2**: AWS基盤セットアップ・データパイプライン
- **Week 3-4**: SageMaker環境・基本分析機能

### 🗓️ Month 2: 高度な分析機能
- **Week 1-2**: フォワードカーブ・季節性モデリング
- **Week 3-4**: 分散計算・リアルタイムアラート

### 🗓️ Month 3: ダッシュボード・運用
- **Week 1-2**: 本格ダッシュボード・レポート機能
- **Week 3-4**: 本番デプロイ・運用体制構築

## 💰 コスト見積もり

| 環境 | 月額コスト | 主要サービス |
|------|------------|--------------|
| **開発環境** | ~$549 | S3, TimeStream, SageMaker |
| **本番環境** | ~$3,645 | Full Stack + High Availability |
| **年間合計** | ~$37,548 | 開発2ヶ月 + 本番10ヶ月 |

## 🚀 クイックスタート

### 1. 環境準備
```bash
# リポジトリクローン
git clone https://github.com/hozaki45/NEXUS_ENA.git
cd NEXUS_ENA

# AWS CLI設定
aws configure
```

### 2. インフラデプロイ
```bash
# Terraform初期化
terraform init

# 開発環境デプロイ
terraform plan -var-file="environments/dev.tfvars"
terraform apply -var-file="environments/dev.tfvars"
```

### 3. アプリケーション起動
```bash
# 依存関係インストール
pip install -r requirements.txt

# サンプルデータロード
python scripts/load_sample_data.py

# 分析開始
jupyter notebook notebooks/energy_analysis.ipynb
```

## 📁 プロジェクト構造

```
NEXUS_ENA/
├── 📋 aws_implementation_guide.md  # 詳細実装ガイド
├── 🏗️ terraform/                  # インフラコード
│   ├── modules/
│   ├── environments/
│   └── main.tf
├── 🐍 src/                        # アプリケーションコード
│   ├── data_pipeline/
│   ├── analytics/
│   ├── api/
│   └── dashboard/
├── 📊 notebooks/                  # Jupyter分析ノートブック
├── 🧪 tests/                      # テストコード
├── 📜 scripts/                    # デプロイ・運用スクリプト
└── 📖 docs/                       # ドキュメント
```

## 🛡️ セキュリティ

- **暗号化**: 保存時・通信時の暗号化 (AES-256, TLS 1.2+)
- **アクセス制御**: IAMロールベースアクセス制御
- **監査**: CloudTrailによる全操作ログ
- **コンプライアンス**: 金融規制要件対応

## 📊 技術スタック

| レイヤー | 技術 | 用途 |
|----------|------|------|
| **Data Lake** | Amazon S3 | 生データ・バックアップ保存 |
| **Time Series** | Amazon TimeStream | 価格・時系列データ |
| **Analytics** | Amazon SageMaker | ML・統計分析 |
| **Compute** | AWS Lambda + Batch | データ処理・計算 |
| **API** | API Gateway | RESTful API |
| **Visualization** | Amazon QuickSight | BI・ダッシュボード |
| **Infrastructure** | Terraform | IaC |
| **Monitoring** | CloudWatch + SNS | 監視・アラート |

## 🤝 コントリビューション

1. Fork this repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## 📞 サポート

- **Issues**: [GitHub Issues](https://github.com/hozaki45/NEXUS_ENA/issues)
- **Discussions**: [GitHub Discussions](https://github.com/hozaki45/NEXUS_ENA/discussions)

---

<div align="center">

**🔋 NEXUS ENA** - Empowering Energy Analytics with AWS

*Powered by AWS Cloud & Machine Learning*

</div>