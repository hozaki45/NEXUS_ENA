# NEXUS - Energy Nexus Analytics

<div align="center">

![NEXUS Logo](https://img.shields.io/badge/NEXUS-Energy%20Analytics-blue?style=for-the-badge&logo=lightning)

**電力市場データの次世代分析プラットフォーム**

[![AWS](https://img.shields.io/badge/AWS-Cloud%20Native-orange?style=flat-square&logo=amazon-aws)](https://aws.amazon.com/)
[![Python](https://img.shields.io/badge/Python-3.9+-blue?style=flat-square&logo=python)](https://python.org/)
[![React](https://img.shields.io/badge/React-18+-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.9+-3178C6?style=flat-square&logo=typescript)](https://typescriptlang.org/)
[![Claude](https://img.shields.io/badge/Claude-AI%20Powered-purple?style=flat-square)](https://anthropic.com/)

</div>

## 🎯 プロジェクト概要

NEXUSは電力市場における原料取引データ（現物・先物）を自動収集・分析し、Claude AIを活用したニュース分析とレポート生成により、エネルギーアナリストの戦略立案を支援する次世代分析プラットフォームです。

### ✨ 主要特徴

- 🔄 **週1回の効率的分析**: リアルタイム処理を排除した低コスト・高精度分析サイクル
- 💰 **超低コスト設計**: 月額$20以下のAWSサーバーレス構成
- 🤖 **AI統合分析**: Claude APIによるニュース分析・レポート自動生成
- 📊 **高度統計分析**: 主成分分析、フーリエ解析、季節性分析、モンテカルロシミュレーション
- 🚀 **完全サーバーレス**: AWS基盤による自動スケーリング・高可用性
- 🔐 **エンタープライズセキュリティ**: AWS Cognito認証、WAF防御、暗号化通信

## 🏗️ システムアーキテクチャ

```mermaid
graph TB
    subgraph "外部データソース"
        LSEG[🔌 LSEG API<br/>5資産データ]
        NEWS[📰 News APIs<br/>Reuters, Bloomberg]
        PUBLIC[🌐 Public APIs<br/>経済指標・気象データ]
    end

    subgraph "データ収集層（自動・日次）"
        LAMBDA1[⚡ Lambda<br/>データ収集]
        S3_RAW[📦 S3 Standard<br/>Raw Data]
        S3_PROCESSED[📊 S3 IA<br/>分析用Parquet]
        S3_ARCHIVE[🗄️ S3 Glacier<br/>長期アーカイブ]
    end

    subgraph "分析層（週1回・オンデマンド）"
        ECS[🚀 ECS Fargate<br/>統計分析<br/>15-30分実行]
        CLAUDE[🤖 Claude API<br/>ニュース分析<br/>レポート生成]
    end

    subgraph "表示・配信層"
        ATHENA[🔍 Athena<br/>高速クエリ]
        REACT[💻 React Dashboard<br/>インタラクティブ表示]
        PDF[📄 PDFレポート<br/>プロ仕様自動生成]
    end

    LSEG --> LAMBDA1
    NEWS --> LAMBDA1
    PUBLIC --> LAMBDA1
    LAMBDA1 --> S3_RAW
    S3_RAW --> S3_PROCESSED
    S3_PROCESSED --> S3_ARCHIVE
    S3_PROCESSED --> ECS
    NEWS --> CLAUDE
    ECS --> ATHENA
    ATHENA --> REACT
    CLAUDE --> PDF
