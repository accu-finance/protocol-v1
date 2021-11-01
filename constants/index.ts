import {BigNumber} from 'ethers';
import {parseEther, parseUnits} from 'ethers/lib/utils';

// ----------------
// UNIT
// ----------------
export const WAD_DECIMALS = 18;
export const RAY_DECIMALS = 27;
export const PERCENTAGE_DECIMALS = 2;
export const WAD = BigNumber.from(10).pow(WAD_DECIMALS);
export const HALF_WAD = BigNumber.from(10).pow(WAD_DECIMALS).div(2);
export const RAY = BigNumber.from(10).pow(RAY_DECIMALS);
export const HALF_RAY = BigNumber.from(10).pow(RAY_DECIMALS).div(2);
export const PERCENTAGE = BigNumber.from(100).pow(PERCENTAGE_DECIMALS); // 100.00 %
export const HALF_PERCENTAGE = BigNumber.from(100).pow(PERCENTAGE_DECIMALS).div(2);
export const WAD_TO_RAY = BigNumber.from(10).pow(RAY_DECIMALS - WAD_DECIMALS);

// ----------------
// TIME
// ----------------
export const SECOND = 1;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
export const YEAR = 365 * DAY;

// ----------------
// PROTOCOL GLOBAL PARAMS
// ----------------
export const OPTIMAL_UTILIZATION_RATE = parseUnits('0.8', RAY_DECIMALS);
export const EXCESS_UTILIZATION_RATE = parseUnits('0.2', RAY_DECIMALS);
export const APPROVAL_AMOUNT_LENDING_POOL = parseEther('1000000000');
export const TOKEN_DISTRIBUTOR_PERCENTAGE_BASE = '10000';
export const REFERRAL_CODE = '0';
