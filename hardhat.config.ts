import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-solhint';
import '@tenderly/hardhat-tenderly';
import 'dotenv/config';
import 'hardhat-deploy';
import 'hardhat-gas-reporter';
import 'hardhat-typechain';
import {HardhatUserConfig} from 'hardhat/config';
import 'solidity-coverage';
import getAccount from './utils/getAccounts';
import getNodeUrl from './utils/getNodeUrl';

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: '0.6.12',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  networks: {
    hardhat: {
      accounts: getAccount(),
      // mining: {
      //   auto: false,
      //   interval: [3000, 6000],
      // },
    },
    localhost: {
      url: getNodeUrl('localhost'),
      accounts: getAccount(),
    },
    mainnet: {
      url: getNodeUrl('mainnet'),
      accounts: getAccount('mainnet'),
    },
    rinkeby: {
      url: getNodeUrl('rinkeby'),
      accounts: getAccount('rinkeby'),
    },
    kovan: {
      url: getNodeUrl('kovan'),
      accounts: getAccount('kovan'),
    },
    bsctestnet: {
      url: getNodeUrl('bsctestnet'),
      accounts: getAccount('bsctestnet'),
    },
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
    admin: {
      default: 0,
    },
    emergencyAdmin: {
      default: 1,
    },
    providerRegistryOwner: {
      default: 3,
    },
    user1: {
      default: 4,
    },
    user2: {
      default: 5,
    },
    user3: {
      default: 6,
    },
    user4: {
      default: 7,
    },
    user5: {
      default: 8,
    },
    liquidator: {
      default: 9,
    },
    treasury: {
      default: 10,
    },
  },
  typechain: {
    outDir: 'typechain',
    target: 'ethers-v5',
  },
  tenderly: {
    project: process.env.TENDERLY_PROJECT || '',
    username: process.env.TENDERLY_USERNAME || '',
  },
  mocha: {
    timeout: 600000,
  },
  gasReporter: {
    enabled: false,
    currency: 'USD',
  },
};

export default config;
