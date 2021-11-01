import {constants, utils} from 'ethers';
import {RAY_DECIMALS} from '../../constants';
import {InterestRateStrategyConfig, InterestRateStrategyName} from '../../types';

const {Zero} = constants;

// BUSD SUSD
export const rateStrategyStableOne: InterestRateStrategyConfig = {
  name: InterestRateStrategyName.rateStrategyStableOne,
  optimalUtilizationRate: utils.parseUnits('0.8', RAY_DECIMALS),
  baseVariableBorrowRate: Zero,
  variableRateSlope1: utils.parseUnits('0.04', RAY_DECIMALS),
  variableRateSlope2: utils.parseUnits('1', RAY_DECIMALS),
  stableRateSlope1: Zero,
  stableRateSlope2: Zero,
};

// DAI TUSD
export const rateStrategyStableTwo: InterestRateStrategyConfig = {
  name: InterestRateStrategyName.rateStrategyStableTwo,
  optimalUtilizationRate: utils.parseUnits('0.8', RAY_DECIMALS),
  baseVariableBorrowRate: Zero,
  variableRateSlope1: utils.parseUnits('0.04', RAY_DECIMALS),
  variableRateSlope2: utils.parseUnits('0.75', RAY_DECIMALS),
  stableRateSlope1: utils.parseUnits('0.02', RAY_DECIMALS),
  stableRateSlope2: utils.parseUnits('0.75', RAY_DECIMALS),
};

// USDC USDT
export const rateStrategyStableThree: InterestRateStrategyConfig = {
  name: InterestRateStrategyName.rateStrategyStableThree,
  optimalUtilizationRate: utils.parseUnits('0.9', RAY_DECIMALS),
  baseVariableBorrowRate: Zero,
  variableRateSlope1: utils.parseUnits('0.04', RAY_DECIMALS),
  variableRateSlope2: utils.parseUnits('0.6', RAY_DECIMALS),
  stableRateSlope1: utils.parseUnits('0.02', RAY_DECIMALS),
  stableRateSlope2: utils.parseUnits('0.6', RAY_DECIMALS),
};

// WETH
export const rateStrategyETH: InterestRateStrategyConfig = {
  name: InterestRateStrategyName.rateStrategyETH,
  optimalUtilizationRate: utils.parseUnits('0.65', RAY_DECIMALS),
  baseVariableBorrowRate: Zero,
  variableRateSlope1: utils.parseUnits('0.08', RAY_DECIMALS),
  variableRateSlope2: utils.parseUnits('1', RAY_DECIMALS),
  stableRateSlope1: utils.parseUnits('0.1', RAY_DECIMALS),
  stableRateSlope2: utils.parseUnits('1', RAY_DECIMALS),
};

// BNB
export const rateStrategyBNB: InterestRateStrategyConfig = {
  name: InterestRateStrategyName.rateStrategyBNB,
  optimalUtilizationRate: utils.parseUnits('0.65', RAY_DECIMALS),
  baseVariableBorrowRate: Zero,
  variableRateSlope1: utils.parseUnits('0.08', RAY_DECIMALS),
  variableRateSlope2: utils.parseUnits('1', RAY_DECIMALS),
  stableRateSlope1: utils.parseUnits('0.1', RAY_DECIMALS),
  stableRateSlope2: utils.parseUnits('1', RAY_DECIMALS),
};

// LINK
export const rateStrategyVolatileOne: InterestRateStrategyConfig = {
  name: InterestRateStrategyName.rateStrategyVolatileOne,
  optimalUtilizationRate: utils.parseUnits('0.45', RAY_DECIMALS),
  baseVariableBorrowRate: Zero,
  variableRateSlope1: utils.parseUnits('0.07', RAY_DECIMALS),
  variableRateSlope2: utils.parseUnits('3', RAY_DECIMALS),
  stableRateSlope1: utils.parseUnits('0.1', RAY_DECIMALS),
  stableRateSlope2: utils.parseUnits('3', RAY_DECIMALS),
};

// WBTC
export const rateStrategyVolatileTwo: InterestRateStrategyConfig = {
  name: InterestRateStrategyName.rateStrategyVolatileTwo,
  optimalUtilizationRate: utils.parseUnits('0.65', RAY_DECIMALS),
  baseVariableBorrowRate: Zero,
  variableRateSlope1: utils.parseUnits('0.08', RAY_DECIMALS),
  variableRateSlope2: utils.parseUnits('3', RAY_DECIMALS),
  stableRateSlope1: utils.parseUnits('0.1', RAY_DECIMALS),
  stableRateSlope2: utils.parseUnits('3', RAY_DECIMALS),
};
