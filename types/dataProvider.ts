import {BigNumber} from 'ethers';
import {AssetId, NativeCurrency} from './index';

export type AggregatedReserveData = {
  underlyingAsset: string;
  decimals: BigNumber;
  baseLTVasCollateral: BigNumber;
  reserveLiquidationThreshold: BigNumber;
  reserveLiquidationBonus: BigNumber;
  reserveFactor: BigNumber;
  usageAsCollateralEnabled: boolean;
  borrowingEnabled: boolean;
  stableBorrowRateEnabled: boolean;
  isActive: boolean;
  isFrozen: boolean;
  // base data
  liquidityIndex: BigNumber;
  variableBorrowIndex: BigNumber;
  liquidityRate: BigNumber;
  variableBorrowRate: BigNumber;
  stableBorrowRate: BigNumber;
  lastUpdateTimestamp: number;
  aTokenAddress: string;
  stableDebtTokenAddress: string;
  variableDebtTokenAddress: string;
  interestRateStrategyAddress: string;
  //
  availableLiquidity: BigNumber;
  totalPrincipalStableDebt: BigNumber;
  totalStableDebt: BigNumber;
  averageStableRate: BigNumber;
  stableDebtLastUpdateTimestamp: BigNumber;
  totalScaledVariableDebt: BigNumber;
  totalVariableDebt: BigNumber;
  priceInNativeCurrency: BigNumber;
  variableRateSlope1: BigNumber;
  variableRateSlope2: BigNumber;
  stableRateSlope1: BigNumber;
  stableRateSlope2: BigNumber;
};

export type UserReserveData = {
  underlyingAsset: string;
  walletBalance: BigNumber;
  isBorrowing: boolean;
  aTokenBalance: BigNumber;
  scaledATokenBalance: BigNumber;
  variableBorrowRate: BigNumber;
  usageAsCollateralEnabledOnUser: boolean;
  stableBorrowRate: BigNumber;
  currentVariableDebt: BigNumber;
  scaledVariableDebt: BigNumber;
  currentStableDebt: BigNumber;
  principalStableDebt: BigNumber;
  stableBorrowLastUpdateTimestamp: BigNumber;
};

export type ReserveData = {
  assetId: AssetId;
  nativeCurrency: NativeCurrency;
  aggregatedReserveData: AggregatedReserveData;
  userData: UserReserveData | null;
  lendingPoolAddress: string;
};
