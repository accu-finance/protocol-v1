import {parseUnits} from 'ethers/lib/utils';
import {PERCENTAGE_DECIMALS} from '../../constants';
import {BaseConfiguration, NativeCurrency, Oracle} from '../../types';

export const baseConfig: BaseConfiguration = {
  marketId: 'Base Market',
  nativeCurrency: NativeCurrency.ETH,
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
  mockUsdPrice: '5848466240000000',
  interestRateStrategies: [],
  oracle: Oracle.Band,
};
