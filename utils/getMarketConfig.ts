import {bscMainConfig, ethereumMainConfig} from '../markets';
import {BscConfiguration, EthereumConfiguration, MarketConfiguration, MarketProvider} from '../types';

const getMarketConfig = (market: MarketProvider): MarketConfiguration => {
  switch (market) {
    case MarketProvider.EthereumMain:
      return ethereumMainConfig as EthereumConfiguration;
    case MarketProvider.BscMain:
      return bscMainConfig as BscConfiguration;
    default:
      throw new Error(`Unsupported market config ${market}`);
  }
};

export default getMarketConfig;
