export const CONTRACTS: { [key: string]: { address: string; codeId: number } } = {
  NFT_MINTER: {
    address: 'xion1rtlut0cvchyw8rzcdm7tvl04fecppk04st09hvya9hr7st7rwm7qt9r63c',
    codeId: 1036
  },
  POST_MINTER: {
    address: 'xion1nuxpqsv5ydq0f4ksfnk565d64u6t2ttczxdgjp9jn5sh4wn45rtqvrdezq',
    codeId: 1037
  },
  TRIBE_CONTROLLER: {
    address: 'xion1t65fz5pn46xug5kqnz5e3lz96pphx5dzaf55lcycpmwzy220pr8s0ys6cv',
    codeId: 1038
  },
  ROLE_MANAGER: {
    address: 'xion1ex8vdqyvug5rmz4l92jwy84nhxad42q849ptnntq3sc3jejd3n8q0069er',
    codeId: 1040
  }
};

export const CHAIN_CONFIG = {
  chainId: 'xion-testnet-2',
  rpc: 'https://rpc.xion-testnet-2.burnt.com:443',
  gasPrice: '0.025uxion'
}; 