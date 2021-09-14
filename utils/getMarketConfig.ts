import {bscMainConfig, ethereumMainConfig} from '../markets';
import {AddressProviderId, BscConfiguration, EthereumConfiguration, MarketConfiguration} from '../types';

const getMarketConfig = (addressProviderId: AddressProviderId): MarketConfiguration => {
  switch (addressProviderId) {
    case AddressProviderId.EthereumMain:
      return ethereumMainConfig as EthereumConfiguration;
    case AddressProviderId.BscMain:
      return bscMainConfig as BscConfiguration;
    default:
      throw new Error(`Unsupported market config ${addressProviderId}`);
  }
};

export default getMarketConfig;
