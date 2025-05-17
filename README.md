# Xion App

A React application for interacting with Xion smart contracts.

## Features

- NFT Minter: Create and manage NFTs
- Tribe Controller: Create and manage tribes
- Post Minter: Create and manage posts within tribes
- Role Manager: Manage user roles and permissions

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- A Xion wallet with testnet tokens

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd xion-app
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with your wallet mnemonic:
```
REACT_APP_WALLET_MNEMONIC=your_wallet_mnemonic_here
```

4. Update the contract addresses in `src/config/contracts.ts` with your deployed contract addresses.

## Development

Start the development server:
```bash
npm start
```

The app will be available at `http://localhost:3000`.

## Building for Production

Build the production version:
```bash
npm run build
```

The built files will be in the `build` directory.

## Security Notes

- Never commit your `.env` file or expose your wallet mnemonic
- Always use testnet for development and testing
- Review all transactions before signing

## License

MIT 