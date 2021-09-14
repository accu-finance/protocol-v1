import {parseUnits} from 'ethers/lib/utils';
import {PERCENTAGE_DECIMALS} from '../../constants';
import {BaseConfiguration, NativeCurrency, Oracle} from '../../types';
import assetPrice from './asset-price.json';

export const baseConfig: BaseConfiguration = {
  marketId: 'Base Market',
  nativeCurrency: NativeCurrency.BNB,
  aTokenNamePrefix: 'Accu interest bearing',
  stableDebtTokenNamePrefix: 'Accu stable debt bearing',
  variableDebtTokenNamePrefix: 'Accu variable debt bearing',
  symbolPrefix: '',
  addressProviderId: 0, // Overriden in index.ts
  protocolGlobalConfig: {
    TokenDistributorPercentageBase: parseUnits('100', PERCENTAGE_DECIMALS),
    priceUSDAddress: '0x10F7Fc1F91Ba351f9C629c5947AD69bD03C05b96',
    Referral: '0',
  },
  mockUsdPrice: assetPrice['USD'], // in wei
  interestRateStrategies: [],
  oracle: Oracle.Band,
};
