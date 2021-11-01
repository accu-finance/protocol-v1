import {utils} from 'ethers';
import {PERCENTAGE_DECIMALS} from '../../constants';
import {ContractId, ReserveConfig} from '../../types';
import {
  rateStrategyBNB,
  rateStrategyETH,
  rateStrategyStableThree,
  rateStrategyStableTwo,
  rateStrategyVolatileOne,
  rateStrategyVolatileTwo,
} from './rateStrategies';

export const reserveConfigDAI: ReserveConfig = {
  strategy: rateStrategyStableTwo,
  baseLTVAsCollateral: utils.parseUnits('75', PERCENTAGE_DECIMALS),
  liquidationThreshold: utils.parseUnits('80', PERCENTAGE_DECIMALS),
  liquidationBonus: utils.parseUnits('105', PERCENTAGE_DECIMALS),
  borrowingEnabled: true,
  stableBorrowRateEnabled: true,
  reserveDecimals: 18,
  aTokenImpl: ContractId.AToken,
  reserveFactor: utils.parseUnits('10', PERCENTAGE_DECIMALS),
};

export const reserveConfigETH: ReserveConfig = {
  strategy: rateStrategyETH,
  baseLTVAsCollateral: utils.parseUnits('80', PERCENTAGE_DECIMALS),
  liquidationThreshold: utils.parseUnits('82.5', PERCENTAGE_DECIMALS),
  liquidationBonus: utils.parseUnits('105', PERCENTAGE_DECIMALS),
  borrowingEnabled: true,
  stableBorrowRateEnabled: true,
  reserveDecimals: 18,
  aTokenImpl: ContractId.AToken,
  reserveFactor: utils.parseUnits('10', PERCENTAGE_DECIMALS),
};

export const reserveConfigBNB: ReserveConfig = {
  strategy: rateStrategyBNB,
  baseLTVAsCollateral: utils.parseUnits('80', PERCENTAGE_DECIMALS),
  liquidationThreshold: utils.parseUnits('82.5', PERCENTAGE_DECIMALS),
  liquidationBonus: utils.parseUnits('105', PERCENTAGE_DECIMALS),
  borrowingEnabled: true,
  stableBorrowRateEnabled: true,
  reserveDecimals: 18,
  aTokenImpl: ContractId.AToken,
  reserveFactor: utils.parseUnits('10', PERCENTAGE_DECIMALS),
};

export const reserveConfigUSDC: ReserveConfig = {
  strategy: rateStrategyStableThree,
  baseLTVAsCollateral: utils.parseUnits('80', PERCENTAGE_DECIMALS),
  liquidationThreshold: utils.parseUnits('85', PERCENTAGE_DECIMALS),
  liquidationBonus: utils.parseUnits('105', PERCENTAGE_DECIMALS),
  borrowingEnabled: true,
  stableBorrowRateEnabled: true,
  reserveDecimals: 6,
  aTokenImpl: ContractId.AToken,
  reserveFactor: utils.parseUnits('10', PERCENTAGE_DECIMALS),
};

export const reserveConfigBTC: ReserveConfig = {
  strategy: rateStrategyVolatileTwo,
  baseLTVAsCollateral: utils.parseUnits('70', PERCENTAGE_DECIMALS),
  liquidationThreshold: utils.parseUnits('75', PERCENTAGE_DECIMALS),
  liquidationBonus: utils.parseUnits('110', PERCENTAGE_DECIMALS),
  borrowingEnabled: true,
  stableBorrowRateEnabled: true,
  reserveDecimals: 8,
  aTokenImpl: ContractId.AToken,
  reserveFactor: utils.parseUnits('20', PERCENTAGE_DECIMALS),
};

export const reserveConfigLINK: ReserveConfig = {
  strategy: rateStrategyVolatileOne,
  baseLTVAsCollateral: utils.parseUnits('70', PERCENTAGE_DECIMALS),
  liquidationThreshold: utils.parseUnits('75', PERCENTAGE_DECIMALS),
  liquidationBonus: utils.parseUnits('110', PERCENTAGE_DECIMALS),
  borrowingEnabled: true,
  stableBorrowRateEnabled: true,
  reserveDecimals: 18,
  aTokenImpl: ContractId.AToken,
  reserveFactor: utils.parseUnits('20', PERCENTAGE_DECIMALS),
};
