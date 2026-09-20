# Doti Sovereign AI Copilot 🌐🤖

> **Autonomous On-Chain AI Agent for Sovereign `.i` Domain Holders & Decentralized Identity Management.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Built for Arbitrum](https://img.shields.io/badge/Anchor-Arbitrum%20One-28A0F0.svg)](https://arbitrum.io)
[![Protocol](https://img.shields.io/badge/Protocol-Doti%20(.i)-cyan.svg)](https://doti.my)
[![Powered by Gemini](https://img.shields.io/badge/AI-Google%20Gemini-8E75FF.svg)](https://ai.google.dev)
[![Chainlink CCIP](https://img.shields.io/badge/Bridge-Chainlink%20CCIP-375BD2.svg)](https://chain.link/cross-chain-interoperability-protocol)

---

## 📌 Overview

**Doti Sovereign AI Copilot** is a decentralized, token-gated AI application designed specifically for **`.i` domain owners**. 

Powered by **Google Gemini** and connected directly to the **Doti Protocol Model Context Protocol (MCP)** and **Arbitrum One**, this agent allows users to manage their entire decentralized identity, cross-chain domain bridges, profile metadata, and peer-to-peer marketplace operations using **simple, plain English commands**.

All services are **100% free for `.i` domain holders**—users only need their own free Gemini API key to activate the intelligent agent.

---

## ✨ Key Features

### 🔒 1. Sovereign On-Chain Token Gating
- **Zero Centralized Logins:** Access to the Copilot is verified purely on-chain.
- The smart contract verifies that your connected EVM wallet holds at least one `.i` ERC-721 domain on Arbitrum One (Chain ID `42161`) or active satellite chains before granting session access.

### 💬 2. Natural Language On-Chain Execution
- Chat in plain English (e.g., *"Bridge sovereign.i to Optimism"*, *"List alpha.i on the marketplace for 0.08 ETH for 14 days"*, *"Set dev.i as my primary identity"*).
- The AI Copilot uses **19 official Doti Protocol MCP tools** to query live state, check availability, verify on-chain guards, and prepare safe, human-readable **Action Cards**.
- **User-Guarded Execution:** The agent *never* executes transactions without explicit user wallet confirmation. You review the exact contract address, method, value, and EIP-712 typed data before signing with 1 click.

### ⚡ 3. Complete Suite of 10 On-Chain Actions
1. **Domain Registration**: Register new `.i` domains directly on Arbitrum One (0.001 ETH fixed price).
2. **Cross-Chain Bridge**: Move domains across Arbitrum One (`42161`), OP Mainnet (`10`), Ethereum (`1`), and Robinhood (`4663`) via Chainlink CCIP v1.5.
3. **Primary Identity (Reverse Record)**: Configure default on-chain reverse resolution identity for your EVM wallet.
4. **Direct Domain Transfer**: Transfer non-custodial `.i` NFT domains to any EVM recipient address.
5. **Marketplace Listing**: Create gasless EIP-712 sell orders with custom durations (**7, 14, 30, 90, or 180 days**).
6. **Update Listing Price**: Adjust domain listing prices on the marketplace with custom validity duration.
7. **Cancel Listing**: Delist domains instantly with gasless off-chain or on-chain operator cancellation.
8. **Instant Marketplace Purchase**: Buy listed domains atomically via smart contract escrow.
9. **Escrow Offers & Bids**: Make custom ETH purchase offers on listed or unlisted `.i` domains with duration controls.
10. **Claim Escrow Refund**: Withdraw unspent escrow balance or cancelled deposit funds with zero lockups.

### 🛠️ 4. Real-time MCP Tooling (19 Endpoints)
- Live cross-chain verification, domain lookup, availability checker, transaction status watcher, IPFS avatar updater, and marketplace floor tracking.

---

## 🏗️ Architecture & Technology Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Frontend UI** | **React 18**, **Vite**, **TypeScript**, **Tailwind CSS** | High-performance, responsive UI with dark/light mode and low-latency interaction |
| **Web3 & Wallets** | **Wagmi v2**, **Viem**, **@rainbow-me/rainbowkit** | Multi-wallet connector with native Arbitrum, Optimism, Ethereum & Robinhood support |
| **AI Intelligence** | **Google Gemini (`@google/genai`)** | LLM function calling, structured tool execution, and contextual reasoning |
| **MCP Integration** | **Doti Protocol Official MCP** | JSON-RPC 2.0 interface connecting directly to Doti smart contracts and indexers |
| **Cross-Chain** | **Chainlink CCIP v1.5** | Secure cross-chain message and asset routing across Layer 2s and Ethereum |
| **Signatures** | **EIP-712 Typed Structured Data** | Gasless marketplace orders, price updates, and authorization intents |
| **Backend / Proxy** | **Express.js (Node.js)** | Secure Gemini API proxying, MCP tool router, and off-chain orderbook cache |

---

## 🚀 Getting Started (Local Development)

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm** or **yarn** / **pnpm**
- **Web3 Wallet**: MetaMask, Rainbow, Coinbase Wallet, or any WalletConnect-compatible wallet.
- **`.i` Domain**: At least one `.i` domain in your wallet on Arbitrum One.
- **Gemini API Key**: Free API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

### 2. Clone the Repository
```bash
git clone https://github.com/your-username/doti-sovereign-copilot.git
cd doti-sovereign-copilot
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Configure Environment Variables
Create a `.env` file in the project root based on `.env.example`:

```env
# Google Gemini API Key (Required for AI Copilot reasoning)
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: WalletConnect Project ID for RainbowKit
VITE_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
```

> **Note**: Users can also input their own free Gemini API key directly in the UI settings without modifying server files!

### 5. Run Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:3000`.

### 6. Build for Production
```bash
npm run build
npm start
```

---

## 📖 How to Use

1. **Connect Your Wallet**: Click **Connect Wallet** in the top right.
2. **On-Chain Verification**: The application verifies your `.i` domain ownership on Arbitrum One automatically.
3. **Configure Your Free Gemini Key**: Click the **Settings** icon (or enter your key when prompted) to activate AI capabilities.
4. **Issue Natural Language Commands**:
   - *"Is satoshi.i available to register?"*
   - *"Register cryptoagent.i for my wallet address"*
   - *"List my domain builder.i for 0.15 ETH for 30 days"*
   - *"Update the price of web3.i to 0.09 ETH for 14 days"*
   - *"Bridge my domain identity to Optimism"*
   - *"Cancel my active listing for test.i"*
5. **Review & Confirm**: Click **Execute Action** on the generated Action Card to sign the transaction via your wallet.

---

## 🔒 Security & Best Practices

- **Non-Custodial**: The AI Copilot has **no access to your private keys**. It can only suggest transactions and format structured typed data.
- **Explicit Signing**: Every state-changing transaction or gasless listing requires explicit signature authorization in your Web3 wallet.
- **Strict Guardrails**: All actions check domain availability and ownership on-chain before generating prompts to prevent unnecessary gas loss.

---

## 🛣️ Roadmap & Upcoming Additions

- [x] On-chain verification token gating
- [x] 19 Doti MCP tools integration
- [x] 10 core on-chain transaction actions
- [x] Gasless EIP-712 marketplace listings & cancellations
- [x] Customizable listing durations (7, 14, 30, 90, 180 days)
- [x] Decentralized IPFS website hosting deployment assistant
- [ ] Multi-sig (Safe) integration for DAO domain management
- [ ] Agent-to-Agent autonomous domain negotiations

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

## 🤝 Community & Support

- 🌐 **Live App**: [https://doti.fun](https://doti.fun)
- 🤖 **AI Agent Hub**: [https://doti.my/docs](https://doti.my/docs)
- ✨ **Doti Protocol**: [https://doti.my](https://doti.my)
- 🤖 **AI Agent Hub**: [https://doti.my/docs](https://doti.my/docs)
- 🛠️ **Tester**: [https://mcp.doti.my](https://mcp.doti.my)

- **Issues & Pull Requests**: Contributions are welcome via GitHub Pull Requests!
