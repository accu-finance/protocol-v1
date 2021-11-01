import {constants, utils} from 'ethers';
import {PERCENTAGE_DECIMALS} from '../../constants';
import {ContractId, ReserveConfig} from '../../types';
import {
  rateStrategyAAVE,
  rateStrategyETH,
  rateStrategyStableOne,
  rateStrategyStableThree,
  rateStrategyStableTwo,
  rateStrategyVolatileFour,
  rateStrategyVolatileOne,
  rateStrategyVolatileThree,
  rateStrategyVolatileTwo,
} from './rateStrategies';

const {Zero} = constants;

export const reserveConfigBUSD: ReserveConfig = {
  strategy: rateStrategyStableOne,
  baseLTVAsCollateral: Zero,
  liquidationThreshold: Zero,
  liquidationBonus: Zero,
  borrowingEnabled: true,
  stableBorrowRateEnabled: false,
  reserveDecimals: 18,
  aTokenImpl: ContractId.AToken,
  reserveFactor: utils.parseUnits('10', PERCENTAGE_DECIMALS),
};

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

export const reserveConfigSUSD: ReserveConfig = {
  strategy: rateStrategyStableOne,
  baseLTVAsCollateral: Zero,
  liquidationThreshold: Zero,
  liquidationBonus: Zero,
  borrowingEnabled: true,
  stableBorrowRateEnabled: false,
  reserveDecimals: 18,
  aTokenImpl: ContractId.AToken,
  reserveFactor: utils.parseUnits('20', PERCENTAGE_DECIMALS),
};

export const reserveConfigTUSD: ReserveConfig = {
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

export const reserveConfigUSDT: ReserveConfig = {
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

export const reserveConfigAAVE: ReserveConfig = {
  strategy: rateStrategyAAVE,
  baseLTVAsCollateral: utils.parseUnits('50', PERCENTAGE_DECIMALS),
  liquidationThreshold: utils.parseUnits('65', PERCENTAGE_DECIMALS),
  liquidationBonus: utils.parseUnits('110', PERCENTAGE_DECIMALS),
  borrowingEnabled: false,
  stableBorrowRateEnabled: false,
  reserveDecimals: 18,
  aTokenImpl: ContractId.AToken,
  reserveFactor: utils.parseUnits('0', PERCENTAGE_DECIMALS),
};

export const reserveConfigBAT: ReserveConfig = {
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

export const reserveConfigENJ: ReserveConfig = {
  strategy: rateStrategyVolatileOne,
  baseLTVAsCollateral: utils.parseUnits('55', PERCENTAGE_DECIMALS),
  liquidationThreshold: utils.parseUnits('60', PERCENTAGE_DECIMALS),
  liquidationBonus: utils.parseUnits('110', PERCENTAGE_DECIMALS),
  borrowingEnabled: true,
  stableBorrowRateEnabled: true,
  reserveDecimals: 18,
  aTokenImpl: ContractId.AToken,
  reserveFactor: utils.parseUnits('20', PERCENTAGE_DECIMALS),
};

export const reserveConfigWETH: ReserveConfig = {
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

export const reserveConfigKNC: ReserveConfig = {
  strategy: rateStrategyVolatileTwo,
  baseLTVAsCollateral: utils.parseUnits('60', PERCENTAGE_DECIMALS),
  liquidationThreshold: utils.parseUnits('65', PERCENTAGE_DECIMALS),
  liquidationBonus: utils.parseUnits('110', PERCENTAGE_DECIMALS),
  borrowingEnabled: true,
  stableBorrowRateEnabled: true,
  reserveDecimals: 18,
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

export const reserveConfigMANA: ReserveConfig = {
  strategy: rateStrategyVolatileOne,
  baseLTVAsCollateral: utils.parseUnits('60', PERCENTAGE_DECIMALS),
  liquidationThreshold: utils.parseUnits('65', PERCENTAGE_DECIMALS),
  liquidationBonus: utils.parseUnits('110', PERCENTAGE_DECIMALS),
  borrowingEnabled: true,
  stableBorrowRateEnabled: true,
  reserveDecimals: 18,
  aTokenImpl: ContractId.AToken,
  reserveFactor: utils.parseUnits('35', PERCENTAGE_DECIMALS),
};

export const reserveConfigMKR: ReserveConfig = {
  strategy: rateStrategyVolatileOne,
  baseLTVAsCollateral: utils.parseUnits('60', PERCENTAGE_DECIMALS),
  liquidationThreshold: utils.parseUnits('65', PERCENTAGE_DECIMALS),
  liquidationBonus: utils.parseUnits('110', PERCENTAGE_DECIMALS),
  borrowingEnabled: true,
  stableBorrowRateEnabled: true,
  reserveDecimals: 18,
  aTokenImpl: ContractId.AToken,
  reserveFactor: utils.parseUnits('20', PERCENTAGE_DECIMALS),
};

export const reserveConfigREN: ReserveConfig = {
  strategy: rateStrategyVolatileOne,
  baseLTVAsCollateral: utils.parseUnits('55', PERCENTAGE_DECIMALS),
  liquidationThreshold: utils.parseUnits('60', PERCENTAGE_DECIMALS),
  liquidationBonus: utils.parseUnits('110', PERCENTAGE_DECIMALS),
  borrowingEnabled: true,
  stableBorrowRateEnabled: true,
  reserveDecimals: 18,
  aTokenImpl: ContractId.AToken,
  reserveFactor: utils.parseUnits('20', PERCENTAGE_DECIMALS),
};

export const reserveConfigSNX: ReserveConfig = {
  strategy: rateStrategyVolatileThree,
  baseLTVAsCollateral: utils.parseUnits('15', PERCENTAGE_DECIMALS),
  liquidationThreshold: utils.parseUnits('40', PERCENTAGE_DECIMALS),
  liquidationBonus: utils.parseUnits('110', PERCENTAGE_DECIMALS),
  borrowingEnabled: true,
  stableBorrowRateEnabled: false,
  reserveDecimals: 18,
  aTokenImpl: ContractId.AToken,
  reserveFactor: utils.parseUnits('35', PERCENTAGE_DECIMALS),
};

// Invalid borrow rates in params currently, replaced with snx params
export const reserveConfigUNI: ReserveConfig = {
  strategy: rateStrategyVolatileThree,
  baseLTVAsCollateral: utils.parseUnits('60', PERCENTAGE_DECIMALS),
  liquidationThreshold: utils.parseUnits('65', PERCENTAGE_DECIMALS),
  liquidationBonus: utils.parseUnits('110', PERCENTAGE_DECIMALS),
  borrowingEnabled: false,
  stableBorrowRateEnabled: false,
  reserveDecimals: 18,
  aTokenImpl: ContractId.DelegationAwareAToken,
  reserveFactor: utils.parseUnits('20', PERCENTAGE_DECIMALS),
};

export const reserveConfigWBTC: ReserveConfig = {
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

export const reserveConfigYFI: ReserveConfig = {
  strategy: rateStrategyVolatileOne,
  baseLTVAsCollateral: utils.parseUnits('40', PERCENTAGE_DECIMALS),
  liquidationThreshold: utils.parseUnits('55', PERCENTAGE_DECIMALS),
  liquidationBonus: utils.parseUnits('115', PERCENTAGE_DECIMALS),
  borrowingEnabled: true,
  stableBorrowRateEnabled: true,
  reserveDecimals: 18,
  aTokenImpl: ContractId.AToken,
  reserveFactor: utils.parseUnits('20', PERCENTAGE_DECIMALS),
};

export const reserveConfigZRX: ReserveConfig = {
  strategy: rateStrategyVolatileOne,
  baseLTVAsCollateral: utils.parseUnits('60', PERCENTAGE_DECIMALS),
  liquidationThreshold: utils.parseUnits('65', PERCENTAGE_DECIMALS),
  liquidationBonus: utils.parseUnits('110', PERCENTAGE_DECIMALS),
  borrowingEnabled: true,
  stableBorrowRateEnabled: true,
  reserveDecimals: 18,
  aTokenImpl: ContractId.AToken,
  reserveFactor: utils.parseUnits('20', PERCENTAGE_DECIMALS),
};

export const reserveConfigXSUSHI: ReserveConfig = {
  strategy: rateStrategyVolatileFour,
  baseLTVAsCollateral: utils.parseUnits('25', PERCENTAGE_DECIMALS),
  liquidationThreshold: utils.parseUnits('45', PERCENTAGE_DECIMALS),
  liquidationBonus: utils.parseUnits('115', PERCENTAGE_DECIMALS),
  borrowingEnabled: true,
  stableBorrowRateEnabled: false,
  reserveDecimals: 18,
  aTokenImpl: ContractId.AToken,
  reserveFactor: utils.parseUnits('35', PERCENTAGE_DECIMALS),
};
