import {BigNumber, constants} from 'ethers';
import {PERCENTAGE, RAY, YEAR} from '../constants';
import {DefaultInterestRateStrategy, RateMode, ReserveData, User, UserData} from '../types';

const {Zero, MaxUint256} = constants;

export const calcExpectedReserveDataAfterDeposit = (
  amount: BigNumber,
  reserveDataBefore: ReserveData,
  txTimestamp: number
): ReserveData => {
  const totalLiquidity = reserveDataBefore.totalLiquidity.add(amount);
  const availableLiquidity = reserveDataBefore.availableLiquidity.add(amount);
  const averageStableBorrowRate = reserveDataBefore.averageStableBorrowRate;

  const liquidityIndex = calcExpectedLiquidityIndex(reserveDataBefore, txTimestamp);
  const variableBorrowIndex = calcExpectedVariableBorrowIndex(reserveDataBefore, txTimestamp);

  const totalStableDebt = calcExpectedTotalStableDebt(
    reserveDataBefore.principalStableDebt,
    reserveDataBefore.averageStableBorrowRate,
    reserveDataBefore.totalStableDebtLastUpdated,
    txTimestamp
  );
  const totalVariableDebt = calcExpectedTotalVariableDebt(reserveDataBefore.scaledVariableDebt, variableBorrowIndex);
  const scaledVariableDebt = reserveDataBefore.scaledVariableDebt;
  const principalStableDebt = reserveDataBefore.principalStableDebt;
  const utilizationRate = calcExpectedUtilizationRate(totalStableDebt, totalVariableDebt, totalLiquidity);

  const {reserveConfigData, interestRateStrategy, marketStableRate, totalStableDebtLastUpdated} = reserveDataBefore;

  const {liquidityRate, stableBorrowRate, variableBorrowRate} = calcExpectedInterestRates(
    marketStableRate,
    utilizationRate,
    totalStableDebt,
    totalVariableDebt,
    averageStableBorrowRate,
    reserveConfigData.reserveFactor,
    interestRateStrategy
  );

  return {
    totalLiquidity,
    availableLiquidity,
    averageStableBorrowRate,
    liquidityIndex,
    variableBorrowIndex,
    totalStableDebt,
    totalVariableDebt,
    scaledVariableDebt,
    principalStableDebt,
    utilizationRate,
    liquidityRate,
    stableBorrowRate,
    variableBorrowRate,
    marketStableRate,
    interestRateStrategy,
    reserveConfigData,
    totalStableDebtLastUpdated,
    lastUpdateTimestamp: txTimestamp,
  };
};

export const calcExpectedReserveDataAfterWithdraw = (
  amount: BigNumber,
  reserveDataBefore: ReserveData,
  userDataBefore: UserData,
  txTimestamp: number
): ReserveData => {
  const amountToWithdraw = amount.eq(MaxUint256)
    ? calcExpectedATokenBalance(reserveDataBefore, userDataBefore, txTimestamp)
    : amount;

  const availableLiquidity = reserveDataBefore.availableLiquidity.sub(amountToWithdraw);
  const averageStableBorrowRate = reserveDataBefore.averageStableBorrowRate;

  const liquidityIndex = calcExpectedLiquidityIndex(reserveDataBefore, txTimestamp);
  const variableBorrowIndex = calcExpectedVariableBorrowIndex(reserveDataBefore, txTimestamp);

  const totalStableDebt = calcExpectedTotalStableDebt(
    reserveDataBefore.principalStableDebt,
    reserveDataBefore.averageStableBorrowRate,
    reserveDataBefore.totalStableDebtLastUpdated,
    txTimestamp
  );
  const totalVariableDebt = calcExpectedTotalVariableDebt(reserveDataBefore.scaledVariableDebt, variableBorrowIndex);
  const scaledVariableDebt = reserveDataBefore.scaledVariableDebt;
  const principalStableDebt = reserveDataBefore.principalStableDebt;

  const totalLiquidity = reserveDataBefore.availableLiquidity
    .sub(amountToWithdraw)
    .add(totalVariableDebt)
    .add(totalStableDebt);

  const utilizationRate = calcExpectedUtilizationRate(totalStableDebt, totalVariableDebt, totalLiquidity);

  const {reserveConfigData, interestRateStrategy, marketStableRate, totalStableDebtLastUpdated} = reserveDataBefore;

  const {liquidityRate, stableBorrowRate, variableBorrowRate} = calcExpectedInterestRates(
    marketStableRate,
    utilizationRate,
    totalStableDebt,
    totalVariableDebt,
    averageStableBorrowRate,
    reserveConfigData.reserveFactor,
    interestRateStrategy
  );

  return {
    totalLiquidity,
    availableLiquidity,
    averageStableBorrowRate,
    liquidityIndex,
    variableBorrowIndex,
    totalStableDebt,
    totalVariableDebt,
    scaledVariableDebt,
    principalStableDebt,
    utilizationRate,
    liquidityRate,
    stableBorrowRate,
    variableBorrowRate,
    marketStableRate,
    interestRateStrategy,
    reserveConfigData,
    totalStableDebtLastUpdated,
    lastUpdateTimestamp: txTimestamp,
  };
};

export const calcExpectedReserveDataAfterBorrow = (
  amount: BigNumber,
  rateMode: RateMode,
  reserveDataBefore: ReserveData,
  txTimestamp: number,
  currentTimestamp: number
): ReserveData => {
  const availableLiquidity = reserveDataBefore.availableLiquidity.sub(amount);
  const liquidityIndex = calcExpectedLiquidityIndex(reserveDataBefore, txTimestamp);
  const variableBorrowIndex = calcExpectedVariableBorrowIndex(reserveDataBefore, txTimestamp);
  const {reserveConfigData, interestRateStrategy, marketStableRate} = reserveDataBefore;

  const expectedReserveData = {
    availableLiquidity,
    liquidityIndex,
    variableBorrowIndex,
    reserveConfigData,
    interestRateStrategy,
    marketStableRate,
    lastUpdateTimestamp: txTimestamp,
  } as ReserveData;

  if (rateMode === RateMode.Stable) {
    expectedReserveData.totalStableDebtLastUpdated = txTimestamp;
    expectedReserveData.scaledVariableDebt = reserveDataBefore.scaledVariableDebt;
    const expectedVariableDebtAfterTx = expectedReserveData.scaledVariableDebt.rayMul(
      expectedReserveData.variableBorrowIndex
    );
    const expectedStableDebtUntilTx = calcExpectedTotalStableDebt(
      reserveDataBefore.principalStableDebt,
      reserveDataBefore.averageStableBorrowRate,
      reserveDataBefore.totalStableDebtLastUpdated,
      txTimestamp
    );
    expectedReserveData.principalStableDebt = expectedStableDebtUntilTx.add(amount);

    expectedReserveData.averageStableBorrowRate = calcExpectedAverageStableBorrowRate(
      reserveDataBefore.averageStableBorrowRate,
      expectedStableDebtUntilTx,
      amount,
      reserveDataBefore.stableBorrowRate
    );

    const totalLiquidityAfterTx = expectedReserveData.availableLiquidity
      .add(expectedReserveData.principalStableDebt)
      .add(expectedVariableDebtAfterTx);

    const utilizationRateAfterTx = calcExpectedUtilizationRate(
      expectedReserveData.principalStableDebt, //the expected principal debt is the total debt immediately after the tx
      expectedVariableDebtAfterTx,
      totalLiquidityAfterTx
    );

    const {liquidityRate, stableBorrowRate, variableBorrowRate} = calcExpectedInterestRates(
      marketStableRate,
      utilizationRateAfterTx,
      expectedReserveData.principalStableDebt,
      expectedVariableDebtAfterTx,
      expectedReserveData.averageStableBorrowRate,
      reserveConfigData.reserveFactor,
      interestRateStrategy
    );

    expectedReserveData.liquidityRate = liquidityRate;
    expectedReserveData.stableBorrowRate = stableBorrowRate;
    expectedReserveData.variableBorrowRate = variableBorrowRate;

    expectedReserveData.totalStableDebt = calcExpectedTotalStableDebt(
      expectedReserveData.principalStableDebt,
      expectedReserveData.averageStableBorrowRate,
      txTimestamp,
      currentTimestamp
    );

    expectedReserveData.totalVariableDebt = reserveDataBefore.scaledVariableDebt.rayMul(
      calcExpectedReserveNormalizedDebt(
        expectedReserveData.variableBorrowRate,
        expectedReserveData.variableBorrowIndex,
        txTimestamp,
        currentTimestamp
      )
    );

    expectedReserveData.totalLiquidity = expectedReserveData.availableLiquidity
      .add(expectedReserveData.totalVariableDebt)
      .add(expectedReserveData.totalStableDebt);

    expectedReserveData.utilizationRate = calcExpectedUtilizationRate(
      expectedReserveData.totalStableDebt,
      expectedReserveData.totalVariableDebt,
      expectedReserveData.totalLiquidity
    );
  } else {
    expectedReserveData.principalStableDebt = reserveDataBefore.principalStableDebt;
    const totalStableDebtAfterTx = calcExpectedStableDebtTokenBalance(
      reserveDataBefore.principalStableDebt,
      reserveDataBefore.averageStableBorrowRate,
      reserveDataBefore.totalStableDebtLastUpdated,
      txTimestamp
    );
    expectedReserveData.totalStableDebt = calcExpectedTotalStableDebt(
      reserveDataBefore.principalStableDebt,
      reserveDataBefore.averageStableBorrowRate,
      reserveDataBefore.totalStableDebtLastUpdated,
      currentTimestamp
    );

    expectedReserveData.averageStableBorrowRate = reserveDataBefore.averageStableBorrowRate;

    expectedReserveData.scaledVariableDebt = reserveDataBefore.scaledVariableDebt.add(
      amount.rayDiv(variableBorrowIndex)
    );
    const totalVariableDebtAfterTx = expectedReserveData.scaledVariableDebt.rayMul(variableBorrowIndex);
    const utilizationRateAfterTx = calcExpectedUtilizationRate(
      totalStableDebtAfterTx,
      totalVariableDebtAfterTx,
      availableLiquidity.add(totalStableDebtAfterTx).add(totalVariableDebtAfterTx)
    );
    const {liquidityRate, stableBorrowRate, variableBorrowRate} = calcExpectedInterestRates(
      marketStableRate,
      utilizationRateAfterTx,
      totalStableDebtAfterTx,
      totalVariableDebtAfterTx,
      expectedReserveData.averageStableBorrowRate,
      reserveConfigData.reserveFactor,
      interestRateStrategy
    );
    expectedReserveData.liquidityRate = liquidityRate;
    expectedReserveData.stableBorrowRate = stableBorrowRate;
    expectedReserveData.variableBorrowRate = variableBorrowRate;
    expectedReserveData.totalVariableDebt = expectedReserveData.scaledVariableDebt.rayMul(
      calcExpectedReserveNormalizedDebt(
        expectedReserveData.variableBorrowRate,
        expectedReserveData.variableBorrowIndex,
        txTimestamp,
        currentTimestamp
      )
    );
    expectedReserveData.totalLiquidity = expectedReserveData.availableLiquidity
      .add(expectedReserveData.totalStableDebt)
      .add(expectedReserveData.totalVariableDebt);

    expectedReserveData.utilizationRate = calcExpectedUtilizationRate(
      expectedReserveData.totalStableDebt,
      expectedReserveData.totalVariableDebt,
      expectedReserveData.totalLiquidity
    );
  }

  return expectedReserveData;
};

export const calcExpectedReserveDataAfterRepay = (
  amount: BigNumber,
  rateMode: RateMode,
  reserveDataBefore: ReserveData,
  userDataBefore: UserData,
  txTimestamp: number,
  currentTimestamp: number
): ReserveData => {
  const liquidityIndex = calcExpectedLiquidityIndex(reserveDataBefore, txTimestamp);
  const variableBorrowIndex = calcExpectedVariableBorrowIndex(reserveDataBefore, txTimestamp);
  const {reserveConfigData, interestRateStrategy, marketStableRate} = reserveDataBefore;

  const expectedReserveData = {
    liquidityIndex,
    variableBorrowIndex,
    reserveConfigData,
    interestRateStrategy,
    marketStableRate,
    lastUpdateTimestamp: txTimestamp,
  } as ReserveData;

  const userStableDebt = calcExpectedStableDebtTokenBalance(
    userDataBefore.principalStableDebt,
    userDataBefore.stableBorrowRate,
    userDataBefore.stableRateLastUpdated,
    txTimestamp
  );

  const userVariableDebt = calcExpectedVariableDebtTokenBalance(reserveDataBefore, userDataBefore, txTimestamp);

  let amountToRepay = BigNumber.from(amount);
  if (amountToRepay.abs().eq(MaxUint256)) {
    amountToRepay = rateMode === RateMode.Stable ? userStableDebt : userVariableDebt;
  }
  if (rateMode === RateMode.Stable) {
    if (amountToRepay.gt(userStableDebt)) {
      amountToRepay = userStableDebt;
    }
  } else {
    if (amountToRepay.gt(userVariableDebt)) {
      amountToRepay = userVariableDebt;
    }
  }

  if (rateMode === RateMode.Stable) {
    const expectedStableDebt = calcExpectedTotalStableDebt(
      reserveDataBefore.principalStableDebt,
      reserveDataBefore.averageStableBorrowRate,
      reserveDataBefore.totalStableDebtLastUpdated,
      txTimestamp
    );

    expectedReserveData.principalStableDebt = expectedReserveData.totalStableDebt =
      expectedStableDebt.sub(amountToRepay);

    //due to accumulation errors, the total stable debt might be smaller than the last user debt.
    //in this case we simply set the total supply and avg stable rate to 0.
    if (expectedReserveData.totalStableDebt.isNegative()) {
      expectedReserveData.principalStableDebt =
        expectedReserveData.totalStableDebt =
        expectedReserveData.averageStableBorrowRate =
          Zero;
    } else {
      expectedReserveData.averageStableBorrowRate = calcExpectedAverageStableBorrowRate(
        reserveDataBefore.averageStableBorrowRate,
        expectedStableDebt,
        amountToRepay.mul(-1),
        userDataBefore.stableBorrowRate
      );

      //also due to accumulation errors, the final avg stable rate when the last user repays might be negative.
      //if that is the case, it means a small leftover of total stable debt is left, which can be erased.
      if (expectedReserveData.averageStableBorrowRate.isNegative()) {
        expectedReserveData.principalStableDebt =
          expectedReserveData.totalStableDebt =
          expectedReserveData.averageStableBorrowRate =
            Zero;
      }
    }

    expectedReserveData.scaledVariableDebt = reserveDataBefore.scaledVariableDebt;
    expectedReserveData.totalVariableDebt = expectedReserveData.scaledVariableDebt.rayMul(
      expectedReserveData.variableBorrowIndex
    );
  } else {
    expectedReserveData.scaledVariableDebt = reserveDataBefore.scaledVariableDebt.sub(
      amountToRepay.rayDiv(expectedReserveData.variableBorrowIndex)
    );
    expectedReserveData.totalVariableDebt = expectedReserveData.scaledVariableDebt.rayMul(
      expectedReserveData.variableBorrowIndex
    );
    expectedReserveData.principalStableDebt = reserveDataBefore.principalStableDebt;

    expectedReserveData.totalStableDebt = calcExpectedTotalStableDebt(
      reserveDataBefore.principalStableDebt,
      reserveDataBefore.averageStableBorrowRate,
      reserveDataBefore.totalStableDebtLastUpdated,
      txTimestamp
    );
    expectedReserveData.averageStableBorrowRate = reserveDataBefore.averageStableBorrowRate;
  }

  expectedReserveData.availableLiquidity = reserveDataBefore.availableLiquidity.add(amountToRepay);

  expectedReserveData.totalLiquidity = expectedReserveData.availableLiquidity
    .add(expectedReserveData.totalStableDebt)
    .add(expectedReserveData.totalVariableDebt);

  expectedReserveData.utilizationRate = calcExpectedUtilizationRate(
    expectedReserveData.totalStableDebt,
    expectedReserveData.totalVariableDebt,
    expectedReserveData.totalLiquidity
  );

  const {liquidityRate, stableBorrowRate, variableBorrowRate} = calcExpectedInterestRates(
    marketStableRate,
    expectedReserveData.utilizationRate,
    expectedReserveData.totalStableDebt,
    expectedReserveData.totalVariableDebt,
    expectedReserveData.averageStableBorrowRate,
    reserveConfigData.reserveFactor,
    interestRateStrategy
  );

  expectedReserveData.liquidityRate = liquidityRate;
  expectedReserveData.stableBorrowRate = stableBorrowRate;
  expectedReserveData.variableBorrowRate = variableBorrowRate;

  return expectedReserveData;
};

export const calcExpectedUserDataAfterDeposit = (
  amount: BigNumber,
  reserveDataBefore: ReserveData,
  reserveDataAfter: ReserveData,
  userDataBefore: UserData,
  txTimestamp: number
): UserData => {
  const currentStableDebt = calcExpectedStableDebtTokenBalance(
    userDataBefore.principalStableDebt,
    userDataBefore.stableBorrowRate,
    userDataBefore.stableRateLastUpdated,
    txTimestamp
  );
  const currentVariableDebt = calcExpectedVariableDebtTokenBalance(reserveDataBefore, userDataBefore, txTimestamp);
  const {principalStableDebt, scaledVariableDebt, stableBorrowRate, stableRateLastUpdated} = userDataBefore;
  const {liquidityRate} = userDataBefore;

  const scaledATokenBalance = calcExpectedScaledATokenBalance(
    userDataBefore.scaledATokenBalance,
    reserveDataAfter.liquidityIndex,
    amount,
    Zero
  );

  const currentATokenBalance = calcExpectedATokenBalance(reserveDataBefore, userDataBefore, txTimestamp).add(amount);
  const usageAsCollateralEnabled = userDataBefore.currentATokenBalance.eq(0)
    ? true
    : userDataBefore.usageAsCollateralEnabled;
  const walletBalance = userDataBefore.walletBalance.sub(amount);

  return {
    liquidityRate,
    currentStableDebt,
    currentVariableDebt,
    principalStableDebt,
    scaledVariableDebt,
    stableBorrowRate,
    stableRateLastUpdated,
    scaledATokenBalance,
    currentATokenBalance,
    usageAsCollateralEnabled,
    walletBalance,
  };
};

export const calcExpectedUserDataAfterWithdraw = (
  amount: BigNumber,
  reserveDataBefore: ReserveData,
  reserveDataAfter: ReserveData,
  userDataBefore: UserData,
  txTimestamp: number
): UserData => {
  const amountToWithdraw = amount.eq(MaxUint256)
    ? calcExpectedATokenBalance(reserveDataBefore, userDataBefore, txTimestamp)
    : amount;

  const currentATokenBalance = calcExpectedATokenBalance(reserveDataBefore, userDataBefore, txTimestamp).sub(
    amountToWithdraw
  );

  const scaledATokenBalance = calcExpectedScaledATokenBalance(
    userDataBefore.scaledATokenBalance,
    reserveDataAfter.liquidityIndex,
    Zero,
    amountToWithdraw
  );

  const currentStableDebt = calcExpectedStableDebtTokenBalance(
    userDataBefore.principalStableDebt,
    userDataBefore.stableBorrowRate,
    userDataBefore.stableRateLastUpdated,
    txTimestamp
  );
  const currentVariableDebt = calcExpectedVariableDebtTokenBalance(reserveDataBefore, userDataBefore, txTimestamp);
  const {principalStableDebt, scaledVariableDebt, stableBorrowRate, stableRateLastUpdated, liquidityRate} =
    userDataBefore;

  let usageAsCollateralEnabled = userDataBefore.usageAsCollateralEnabled;
  if (userDataBefore.currentATokenBalance.eq(0)) {
    usageAsCollateralEnabled = true;
  } else {
    //if the user is withdrawing everything, usageAsCollateralEnabled must be false
    if (currentATokenBalance.eq(0)) {
      usageAsCollateralEnabled = false;
    }
  }
  const walletBalance = userDataBefore.walletBalance.add(amountToWithdraw);

  return {
    liquidityRate,
    currentStableDebt,
    currentVariableDebt,
    principalStableDebt,
    scaledVariableDebt,
    stableBorrowRate,
    stableRateLastUpdated,
    scaledATokenBalance,
    currentATokenBalance,
    usageAsCollateralEnabled,
    walletBalance,
  };
};

export const calcExpectedUserDataAfterBorrow = (
  amount: BigNumber,
  rateMode: RateMode,
  reserveDataBefore: ReserveData,
  reserveDataAfter: ReserveData,
  userDataBefore: UserData,
  txTimestamp: number,
  currentTimestamp: number
): UserData => {
  const {principalStableDebt, scaledVariableDebt, stableBorrowRate, stableRateLastUpdated} = userDataBefore;
  const {usageAsCollateralEnabled, scaledATokenBalance} = userDataBefore;
  const {liquidityRate} = reserveDataAfter;
  const currentATokenBalance = calcExpectedATokenBalance(reserveDataAfter, userDataBefore, currentTimestamp);
  const assetBalance = userDataBefore.walletBalance.add(amount);

  const expectedUserData = {
    liquidityRate,
    principalStableDebt,
    scaledVariableDebt,
    stableBorrowRate,
    stableRateLastUpdated,
    scaledATokenBalance,
    currentATokenBalance,
    usageAsCollateralEnabled,
    walletBalance: assetBalance,
  } as UserData;

  if (rateMode === RateMode.Stable) {
    const stableDebtUntilTx = calcExpectedStableDebtTokenBalance(
      userDataBefore.principalStableDebt,
      userDataBefore.stableBorrowRate,
      userDataBefore.stableRateLastUpdated,
      txTimestamp
    );

    expectedUserData.principalStableDebt = stableDebtUntilTx.add(amount);
    expectedUserData.stableRateLastUpdated = txTimestamp;

    expectedUserData.stableBorrowRate = calcExpectedUserStableRate(
      stableDebtUntilTx,
      userDataBefore.stableBorrowRate,
      amount,
      reserveDataBefore.stableBorrowRate
    );

    expectedUserData.currentStableDebt = calcExpectedStableDebtTokenBalance(
      expectedUserData.principalStableDebt,
      expectedUserData.stableBorrowRate,
      txTimestamp,
      currentTimestamp
    );

    expectedUserData.scaledVariableDebt = userDataBefore.scaledVariableDebt;
  } else {
    expectedUserData.scaledVariableDebt = reserveDataBefore.scaledVariableDebt.add(
      amount.rayDiv(reserveDataAfter.variableBorrowIndex)
    );

    expectedUserData.principalStableDebt = userDataBefore.principalStableDebt;

    expectedUserData.stableBorrowRate = userDataBefore.stableBorrowRate;

    expectedUserData.stableRateLastUpdated = userDataBefore.stableRateLastUpdated;

    expectedUserData.currentStableDebt = calcExpectedStableDebtTokenBalance(
      userDataBefore.principalStableDebt,
      userDataBefore.stableBorrowRate,
      userDataBefore.stableRateLastUpdated,
      currentTimestamp
    );
  }

  expectedUserData.currentVariableDebt = calcExpectedVariableDebtTokenBalance(
    reserveDataAfter,
    expectedUserData,
    currentTimestamp
  );

  return expectedUserData;
};

export const calcExpectedUserDataAfterRepay = (
  amount: BigNumber,
  rateMode: RateMode,
  reserveDataBefore: ReserveData,
  reserveDataAfter: ReserveData,
  userDataBefore: UserData,
  user: User,
  onBehalfOf: User,
  txTimestamp: number,
  currentTimestamp: number
): UserData => {
  const {
    principalStableDebt,
    scaledVariableDebt,
    stableBorrowRate,
    stableRateLastUpdated,
    usageAsCollateralEnabled,
    scaledATokenBalance,
  } = userDataBefore;
  const {liquidityRate} = reserveDataAfter;
  const currentATokenBalance = calcExpectedATokenBalance(reserveDataAfter, userDataBefore, currentTimestamp);

  const expectedUserData = {
    liquidityRate,
    principalStableDebt,
    scaledVariableDebt,
    stableBorrowRate,
    stableRateLastUpdated,
    scaledATokenBalance,
    currentATokenBalance,
    usageAsCollateralEnabled,
  } as UserData;

  const stableDebt = calcExpectedStableDebtTokenBalance(
    userDataBefore.principalStableDebt,
    userDataBefore.stableBorrowRate,
    userDataBefore.stableRateLastUpdated,
    txTimestamp
  );
  const variableDebt = calcExpectedVariableDebtTokenBalance(reserveDataBefore, userDataBefore, currentTimestamp);

  let amountToRepay = BigNumber.from(amount);
  if (amountToRepay.abs().eq(MaxUint256)) {
    amountToRepay = rateMode === RateMode.Stable ? stableDebt : variableDebt;
  }
  if (rateMode === RateMode.Stable) {
    if (amountToRepay.gt(stableDebt)) {
      amountToRepay = stableDebt;
    }
  } else {
    if (amountToRepay.gt(variableDebt)) {
      amountToRepay = variableDebt;
    }
  }

  if (rateMode === RateMode.Stable) {
    expectedUserData.scaledVariableDebt = userDataBefore.scaledVariableDebt;
    expectedUserData.currentVariableDebt = variableDebt;
    expectedUserData.principalStableDebt = expectedUserData.currentStableDebt = stableDebt.sub(amountToRepay);
    //user repaid everything
    if (expectedUserData.currentStableDebt.isZero()) {
      expectedUserData.stableBorrowRate = Zero;
      expectedUserData.stableRateLastUpdated = 0;
    } else {
      expectedUserData.stableBorrowRate = userDataBefore.stableBorrowRate;
      expectedUserData.stableRateLastUpdated = txTimestamp;
    }
  } else {
    expectedUserData.currentStableDebt = stableDebt;
    expectedUserData.principalStableDebt = userDataBefore.principalStableDebt;
    expectedUserData.stableBorrowRate = userDataBefore.stableBorrowRate;
    expectedUserData.stableRateLastUpdated = userDataBefore.stableRateLastUpdated;
    expectedUserData.scaledVariableDebt = userDataBefore.scaledVariableDebt.sub(
      amountToRepay.rayDiv(reserveDataAfter.variableBorrowIndex)
    );
    expectedUserData.currentVariableDebt = expectedUserData.scaledVariableDebt.rayMul(
      reserveDataAfter.variableBorrowIndex
    );

    expectedUserData.walletBalance =
      user.address === onBehalfOf.address
        ? userDataBefore.walletBalance.sub(amountToRepay)
        : userDataBefore.walletBalance;
  }

  return expectedUserData;
};

const calcExpectedLiquidityIndex = (reserveData: ReserveData, timestamp: number): BigNumber => {
  // if utilization rate is 0, nothing to compound
  if (reserveData.utilizationRate.eq(0)) {
    return reserveData.liquidityIndex;
  }

  const cumulatedInterest = calcLinearInterest(reserveData.liquidityRate, timestamp, reserveData.lastUpdateTimestamp);

  return cumulatedInterest.rayMul(reserveData.liquidityIndex);
};

const calcExpectedVariableBorrowIndex = (reserveData: ReserveData, timestamp: number): BigNumber => {
  // if totalVariableDebt is 0, nothing to compound
  if (reserveData.totalVariableDebt.eq(0)) {
    return reserveData.variableBorrowIndex;
  }

  const cumulatedInterest = calcCompoundedInterest(
    reserveData.variableBorrowRate,
    timestamp,
    reserveData.lastUpdateTimestamp
  );

  return cumulatedInterest.rayMul(reserveData.variableBorrowIndex);
};

const calcLinearInterest = (rate: BigNumber, currentTimestamp: number, lastUpdateTimestamp: number): BigNumber => {
  const timeDifference = currentTimestamp - lastUpdateTimestamp;
  return rate.mul(timeDifference).div(YEAR).add(RAY);
};

const calcCompoundedInterest = (rate: BigNumber, currentTimestamp: number, lastUpdateTimestamp: number): BigNumber => {
  const timeDifference = currentTimestamp - lastUpdateTimestamp;

  if (timeDifference === 0) {
    return RAY;
  }

  const expMinusOne = timeDifference - 1;
  const expMinusTwo = timeDifference > 2 ? timeDifference - 2 : 0;

  const ratePerSecond = rate.div(YEAR);

  const basePowerTwo = ratePerSecond.rayMul(ratePerSecond);
  const basePowerThree = basePowerTwo.rayMul(ratePerSecond);

  const secondTerm = BigNumber.from(timeDifference).mul(expMinusOne).mul(basePowerTwo).div(2);
  const thirdTerm = BigNumber.from(timeDifference).mul(expMinusOne).mul(expMinusTwo).mul(basePowerThree).div(6);

  return RAY.add(ratePerSecond.mul(timeDifference)).add(secondTerm).add(thirdTerm);
};

// calcExpectedTotalStableDebt = principalStableDebt * cumulatedInterest
const calcExpectedTotalStableDebt = (
  principalStableDebt: BigNumber,
  averageStableBorrowRate: BigNumber,
  lastUpdateTimestamp: number,
  currentTimestamp: number
): BigNumber => {
  const cumulatedInterest = calcCompoundedInterest(averageStableBorrowRate, currentTimestamp, lastUpdateTimestamp);

  return principalStableDebt.rayMul(cumulatedInterest);
};

// calcExpectedTotalVariableDebt = scaledVariableDebt * expectedVariableDebtIndex
const calcExpectedTotalVariableDebt = (
  scaledVariableDebt: BigNumber,
  expectedVariableDebtIndex: BigNumber
): BigNumber => {
  return scaledVariableDebt.rayMul(expectedVariableDebtIndex);
};

// calcExpectedUtilizationRate =  (totalStableDebt + totalVariableDebt) / totalLiquidity
export const calcExpectedUtilizationRate = (
  totalStableDebt: BigNumber,
  totalVariableDebt: BigNumber,
  totalLiquidity: BigNumber
): BigNumber => {
  if (totalStableDebt.eq(0) && totalVariableDebt.eq(0)) {
    return Zero;
  }

  return totalStableDebt.add(totalVariableDebt).rayDiv(totalLiquidity);
};

export const calcExpectedInterestRates = (
  marketStableRate: BigNumber,
  utilizationRate: BigNumber,
  totalStableDebt: BigNumber,
  totalVariableDebt: BigNumber,
  averageStableBorrowRate: BigNumber,
  reserveFactor: BigNumber,
  {
    optimalUtilizationRate,
    excessUtilizationRate,
    baseVariableBorrowRate,
    stableRateSlope1,
    stableRateSlope2,
    variableRateSlope1,
    variableRateSlope2,
  }: DefaultInterestRateStrategy
): {liquidityRate: BigNumber; stableBorrowRate: BigNumber; variableBorrowRate: BigNumber} => {
  let stableBorrowRate = marketStableRate;
  let variableBorrowRate = baseVariableBorrowRate;

  if (utilizationRate.gt(optimalUtilizationRate)) {
    const excessUtilizationRateRatio = utilizationRate.sub(optimalUtilizationRate).rayDiv(excessUtilizationRate);
    stableBorrowRate = stableBorrowRate.add(stableRateSlope1).add(excessUtilizationRateRatio.rayMul(stableRateSlope2));
    variableBorrowRate = variableBorrowRate
      .add(variableRateSlope1)
      .add(excessUtilizationRateRatio.rayMul(variableRateSlope2));
  } else {
    stableBorrowRate = stableBorrowRate.add(stableRateSlope1.rayMul(utilizationRate.rayDiv(optimalUtilizationRate)));
    variableBorrowRate = variableBorrowRate.add(
      variableRateSlope1.rayMul(utilizationRate.rayDiv(optimalUtilizationRate))
    );
  }

  const expectedOverallRate = calcExpectedOverallBorrowRate(
    totalStableDebt,
    totalVariableDebt,
    variableBorrowRate,
    averageStableBorrowRate
  );
  const liquidityRate = expectedOverallRate.rayMul(utilizationRate).percentMul(PERCENTAGE.sub(reserveFactor));

  return {liquidityRate, stableBorrowRate, variableBorrowRate};
};

export const calcExpectedOverallBorrowRate = (
  totalStableDebt: BigNumber,
  totalVariableDebt: BigNumber,
  currentVariableBorrowRate: BigNumber,
  currentAverageStableBorrowRate: BigNumber
): BigNumber => {
  const totalBorrows = totalStableDebt.add(totalVariableDebt);

  if (totalBorrows.eq(0)) {
    return Zero;
  }

  const weightedVariableRate = totalVariableDebt.wadToRay().rayMul(currentVariableBorrowRate);

  const weightedStableRate = totalStableDebt.wadToRay().rayMul(currentAverageStableBorrowRate);

  const overallBorrowRate = weightedVariableRate.add(weightedStableRate).rayDiv(totalBorrows.wadToRay());

  return overallBorrowRate;
};

export const calcExpectedStableDebtTokenBalance = (
  principalStableDebt: BigNumber,
  stableBorrowRate: BigNumber,
  stableRateLastUpdated: number,
  currentTimestamp: number
) => {
  if (stableBorrowRate.eq(0) || currentTimestamp === stableRateLastUpdated || stableRateLastUpdated === 0) {
    return principalStableDebt;
  }

  const cumulatedInterest = calcCompoundedInterest(stableBorrowRate, currentTimestamp, stableRateLastUpdated);

  return principalStableDebt.rayMul(cumulatedInterest);
};

export const calcExpectedVariableDebtTokenBalance = (
  {variableBorrowRate, variableBorrowIndex, lastUpdateTimestamp}: ReserveData,
  userData: UserData,
  currentTimestamp: number
) => {
  const normalizedDebt = calcExpectedReserveNormalizedDebt(
    variableBorrowRate,
    variableBorrowIndex,
    lastUpdateTimestamp,
    currentTimestamp
  );

  const {scaledVariableDebt} = userData;

  return scaledVariableDebt.rayMul(normalizedDebt);
};

const calcExpectedReserveNormalizedDebt = (
  variableBorrowRate: BigNumber,
  variableBorrowIndex: BigNumber,
  lastUpdateTimestamp: number,
  currentTimestamp: number
) => {
  //if utilization rate is 0, nothing to compound
  if (variableBorrowRate.eq(0)) {
    return variableBorrowIndex;
  }

  const cumulatedInterest = calcCompoundedInterest(variableBorrowRate, currentTimestamp, lastUpdateTimestamp);

  return cumulatedInterest.rayMul(variableBorrowIndex);
};

const calcExpectedScaledATokenBalance = (
  scaledATokenBalance: BigNumber,
  index: BigNumber,
  amountAdded: BigNumber,
  amountTaken: BigNumber
) => {
  return scaledATokenBalance.add(amountAdded.rayDiv(index)).sub(amountTaken.rayDiv(index));
};

export const calcExpectedATokenBalance = (
  reserveData: ReserveData,
  {scaledATokenBalance}: UserData,
  currentTimestamp: number
) => {
  const index = calcExpectedReserveNormalizedIncome(reserveData, currentTimestamp);

  return scaledATokenBalance.rayMul(index);
};

const calcExpectedReserveNormalizedIncome = (
  {liquidityRate, liquidityIndex, lastUpdateTimestamp}: ReserveData,
  currentTimestamp: number
) => {
  //if utilization rate is 0, nothing to compound
  if (liquidityRate.eq(0)) {
    return liquidityIndex;
  }

  const cumulatedInterest = calcLinearInterest(liquidityRate, currentTimestamp, lastUpdateTimestamp);

  return cumulatedInterest.rayMul(liquidityIndex);
};

const calcExpectedAverageStableBorrowRate = (
  avgStableRateBefore: BigNumber,
  totalStableDebtBefore: BigNumber,
  amountChanged: BigNumber,
  rate: BigNumber
) => {
  const weightedTotalBorrows = avgStableRateBefore.mul(totalStableDebtBefore);
  const weightedAmountBorrowed = rate.mul(amountChanged);
  const totalBorrowedStable = totalStableDebtBefore.add(amountChanged);

  if (totalBorrowedStable.eq(0)) {
    return Zero;
  }

  return weightedTotalBorrows.add(weightedAmountBorrowed).div(totalBorrowedStable);
};

const calcExpectedUserStableRate = (
  balanceBefore: BigNumber,
  rateBefore: BigNumber,
  amount: BigNumber,
  rateNew: BigNumber
) => {
  return balanceBefore.mul(rateBefore).add(amount.mul(rateNew)).div(balanceBefore.add(amount));
};
