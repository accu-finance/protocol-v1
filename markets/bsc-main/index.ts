import {parseUnits} from 'ethers/lib/utils';
import {RAY_DECIMALS} from '../../constants';
import {Address, BscConfiguration, BscPoolAsset, NativeCurrency, Network} from '../../types';
import {
  rateStrategyStableThree,
  rateStrategyStableTwo,
  rateStrategyVolatileOne,
  rateStrategyVolatileTwo,
} from '../bsc-main/rateStrategies';
import {reserveConfigBTC, reserveConfigLINK, reserveConfigUSDC} from '../bsc-main/reservesConfigs';
import assetPrice from './asset-price.json';
import {baseConfig} from './commons';
import {rateStrategyBNB, rateStrategyETH, rateStrategyStableOne} from './rateStrategies';
import {reserveConfigBNB, reserveConfigDAI, reserveConfigETH} from './reservesConfigs';

export const bscMainConfig: BscConfiguration = {
  ...baseConfig,
  nativeCurrency: NativeCurrency.BNB,
  marketId: 'Bsc Main Market',
  providerId: 2, // main market on bsc
  reserveConfig: {
    WNATIVE: reserveConfigBNB,
    ETH: reserveConfigETH,
    BTC: reserveConfigBTC,
    DAI: reserveConfigDAI,
    USDC: reserveConfigUSDC,
    LINK: reserveConfigLINK,
  },
  assetName: {
    WNATIVE: 'Binance Coin',
    ETH: 'Ethereum',
    BTC: 'Bitcoin',
    DAI: 'DAI',
    USDC: 'Usd Circle',
    LINK: 'Chain Link',
  },
  interestRateStrategies: [
    rateStrategyStableOne,
    rateStrategyStableTwo,
    rateStrategyStableThree,
    rateStrategyVolatileOne,
    rateStrategyVolatileTwo,
    rateStrategyETH,
    rateStrategyBNB,
  ],
  reserveAsset: {
    [Network.hardhat]: {
      BTC: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
      DAI: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
      ETH: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
      LINK: '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707',
      USDC: '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
      WNATIVE: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    },
    [Network.bscmainnet]: {} as BscPoolAsset<Address>,
    [Network.bsctestnet]: {
      BTC: '0x22336E110a2597BB554247C728aC790C916C286C',
      DAI: '0x6E042Bcd339cA49Ae3fd01f2E2CEa9b9C0960f98',
      ETH: '0x62F8EB47616763A9D3397d1C3812b93F1A334952',
      LINK: '0xd9a30C0C6897F83458A5b0Ea972D28c957cf90D0',
      USDC: '0x171CD2463bC7dffCa014D7aF0c7c2D5b0D79Fa81',
      WNATIVE: '0x96760072DC280446E35D04A49DCc5bEc5f65FB04',
    },
  },
  initialMarketRate: {
    BTC: {borrowRate: parseUnits('0.03', RAY_DECIMALS)},
    DAI: {borrowRate: parseUnits('0.039', RAY_DECIMALS)},
    ETH: {borrowRate: parseUnits('0.03', RAY_DECIMALS)},
    LINK: {borrowRate: parseUnits('0.03', RAY_DECIMALS)},
    USDC: {borrowRate: parseUnits('0.039', RAY_DECIMALS)},
    WNATIVE: {borrowRate: parseUnits('0.03', RAY_DECIMALS)},
  },
  // contracts
  providerRegistry: {
    [Network.hardhat]: '0x0165878A594ca255338adfa4d48449f69242Eb8F',
    [Network.bscmainnet]: '',
    [Network.bsctestnet]: '0x56BEcdd563F480fF126092f1Ab745826ca24DEa7',
  },
  addressProvider: {
    [Network.hardhat]: '0xa513E6E4b8f2a923D98304ec87F64353C4D5C853',
    [Network.bscmainnet]: '',
    [Network.bsctestnet]: '0xD39D6153B68926dA0C996222FdCB45E2c649db49',
  },
  lendingRateOracle: {
    [Network.hardhat]: '0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1',
    [Network.bscmainnet]: '',
    [Network.bsctestnet]: '0xb42707d5505161CB8b573F90BACC174B309de84F',
  },
  wbnb: {
    [Network.hardhat]: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    [Network.bscmainnet]: '',
    [Network.bsctestnet]: '0x96760072DC280446E35D04A49DCc5bEc5f65FB04',
  },
  wbnbGateway: {
    [Network.hardhat]: '0x4b6aB5F819A515382B0dEB6935D793817bB4af28',
    [Network.bscmainnet]: '',
    [Network.bsctestnet]: '0xbbdE58aE8C830B82BFa067A3CD8fa12a11F6dfdb',
  },
  mainOracle: {
    [Network.hardhat]: '0x84eA74d481Ee0A5332c457a4d796187F6Ba67fEB',
    [Network.bscmainnet]: '',
    [Network.bsctestnet]: '0x47deA1a1Ebf96aa9ce5a2e5662F7B667E30C4357',
  },
  fallbackOracle: {
    [Network.hardhat]: '0x4ed7c70F96B99c776995fB64377f0d4aB3B0e1C1',
    [Network.bscmainnet]: '',
    [Network.bsctestnet]: '',
  },
  chainlinkAggregator: {
    [Network.hardhat]: {} as BscPoolAsset<Address>,
    [Network.bscmainnet]: {} as BscPoolAsset<Address>,
    [Network.bsctestnet]: {} as BscPoolAsset<Address>,
  },
  bandStdReference: {
    [Network.hardhat]: '0xc3e53F4d16Ae77Db1c982e75a937B9f60FE63690',
    [Network.bscmainnet]: '',
    [Network.bsctestnet]: '0xDA7a001b254CD22e46d3eAB04d937489c93174C3',
  },
  protocolDataProvider: {
    [Network.hardhat]: '0xD5ac451B0c50B9476107823Af206eD814a2e2580',
    [Network.bscmainnet]: '',
    [Network.bsctestnet]: '0x4EB3A9Db396017B31f38435B2FE389E9D78725d5',
  },
  appDataProvider: {
    [Network.hardhat]: '0xF8e31cb472bc70500f08Cd84917E5A1912Ec8397',
    [Network.bscmainnet]: '',
    [Network.bsctestnet]: '0x2b3d4b6a7852104C03945d695a0b1A0F40842681',
  },
  // users and treasury
  poolAdmin: {
    [Network.hardhat]: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    [Network.bscmainnet]: '',
    [Network.bsctestnet]: '0x0BE2BC95ea604a5ac4ECcE0F8570fe58bC9C320A',
  },
  emergencyAdmin: {
    [Network.hardhat]: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    [Network.bscmainnet]: '',
    [Network.bsctestnet]: '0xf6afC7a9eAc97B38A6464c4b5c4927A32F84D7DB',
  },
  providerRegistryOwner: {
    [Network.hardhat]: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
    [Network.bscmainnet]: '',
    [Network.bsctestnet]: '0x0BE2BC95ea604a5ac4ECcE0F8570fe58bC9C320A',
  },
  tokenDistributor: {
    [Network.hardhat]: '',
    [Network.bscmainnet]: '',
    [Network.bsctestnet]: '',
  },
  reserveFactorTreasuryAddress: {
    [Network.hardhat]: '0xBcd4042DE499D14e55001CcbB24a551F3b954096',
    [Network.bscmainnet]: '0xBcd4042DE499D14e55001CcbB24a551F3b954096',
    [Network.bsctestnet]: '0xBcd4042DE499D14e55001CcbB24a551F3b954096',
  },
  // block explorer
  blockExplorerUrl: {
    [Network.hardhat]: '',
    [Network.bscmainnet]: 'https://bscscan.com/tx',
    [Network.bsctestnet]: 'https://testnet.bscscan.com/tx',
  },
  mockPoolAssetPrice: assetPrice,
};

export default bscMainConfig;
