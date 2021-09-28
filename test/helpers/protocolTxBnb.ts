import {waffleChai} from '@ethereum-waffle/chai';
import {expect, use} from 'chai';
import {BigNumberish, constants, ContractReceipt} from 'ethers';
import {parseEther} from 'ethers/lib/utils';
import {ethers} from 'hardhat';
import {ExpectedTxResult, RateMode, User} from '../../types';
import convertToCurrencyDecimals from '../../utils/convertToCurrencyDecimals';
import {advanceTimeAndBlock, getLatestBlockTimestamp, getTxCostAndTimestamp, waitForTx} from '../../utils/hhNetwork';
import printDashboard from './printDashboard';
import {
  calcExpectedReserveDataAfterBorrow,
  calcExpectedReserveDataAfterDeposit,
  calcExpectedReserveDataAfterRepay,
  calcExpectedReserveDataAfterWithdraw,
  calcExpectedUserDataAfterBorrow,
  calcExpectedUserDataAfterDeposit,
  calcExpectedUserDataAfterRepay,
  calcExpectedUserDataAfterWithdraw,
} from './protocolCalculator';
import {getReserveData, getUserData} from './protocolTx';

const {Zero, MaxUint256} = constants;

use(waffleChai);

export const depositBNB = async (
  amount: string,
  sender: User,
  onBehalfOf: User,
  option?: {
    referralCode?: BigNumberish;
    timeTravel?: number;
    expectedResult?: ExpectedTxResult;
    dashboardEnabled?: boolean;
  }
): Promise<ContractReceipt> => {
  const amountToDeposit = parseEther(amount);
  const asset = sender.asset.WNATIVE;
  const reserveDataBefore = await getReserveData(asset, onBehalfOf);
  const userDataBefore = await getUserData(asset, onBehalfOf);
  const {referralCode, timeTravel, expectedResult, dashboardEnabled} = option || {
    referralCode: Zero,
    dashboardEnabled: false,
  };

  if (expectedResult?.revertMessage) {
    await expect(
      sender.wGateway.depositBNB(sender.lendingPool.address, onBehalfOf.address, referralCode || 0, {
        value: amountToDeposit,
      })
    ).to.be.revertedWith(expectedResult.revertMessage);
    return {} as ContractReceipt;
  }

  const txResult = await waitForTx(
    await sender.wGateway.depositBNB(sender.lendingPool.address, onBehalfOf.address, referralCode || 0, {
      value: amountToDeposit,
    })
  );

  if (timeTravel) {
    await advanceTimeAndBlock(timeTravel);
  }

  if (dashboardEnabled) {
    await printDashboard(asset, sender, `${sender.name} deposits ${amount} ${await asset.name()}`);
  }

  const {txTimestamp} = await getTxCostAndTimestamp(txResult);

  const expectedReserveData = calcExpectedReserveDataAfterDeposit(amountToDeposit, reserveDataBefore, txTimestamp);
  const expectedUserData = calcExpectedUserDataAfterDeposit(
    amountToDeposit,
    reserveDataBefore,
    expectedReserveData,
    userDataBefore,
    txTimestamp
  );

  const reserveDataAfter = await getReserveData(asset, onBehalfOf);
  const userDataAfter = await getUserData(asset, onBehalfOf);

  //depositing BNB via gateway knows nothing about user's WBNB balance, we simply ignore the check.
  expectedUserData.walletBalance = userDataAfter.walletBalance;

  expect(expectedReserveData).to.almostEqualOrEqual(reserveDataAfter);
  expect(expectedUserData).to.almostEqualOrEqual(userDataAfter);

  return txResult;
};

export const borrowBNB = async (
  amount: string,
  sender: User,
  onBehalfOf: User,
  rateMode: RateMode,
  option?: {
    referralCode?: BigNumberish;
    timeTravel?: number;
    expectedResult?: ExpectedTxResult;
    dashboardEnabled?: boolean;
  }
): Promise<ContractReceipt> => {
  const asset = sender.asset.WNATIVE;
  const amountToBorrow = await convertToCurrencyDecimals(asset, amount);

  const reserveDataBefore = await getReserveData(asset, onBehalfOf);
  const userDataBefore = await getUserData(asset, onBehalfOf);

  const {referralCode, timeTravel, expectedResult, dashboardEnabled} = option || {
    referralCode: Zero,
    dashboardEnabled: false,
  };

  //delegates borrowing power of WBNB to WBNBGateway
  if (rateMode === RateMode.Stable) {
    await sender.sdToken.WNATIVE.approveDelegation(sender.wGateway.address, amountToBorrow);
  } else {
    await sender.vdToken.WNATIVE.approveDelegation(sender.wGateway.address, amountToBorrow);
  }

  if (expectedResult?.revertMessage) {
    await expect(
      sender.wGateway.borrowBNB(sender.lendingPool.address, amountToBorrow, rateMode, referralCode || 0)
    ).to.be.revertedWith(expectedResult.revertMessage);
    return {} as ContractReceipt;
  }

  const txResult = await waitForTx(
    await sender.wGateway.borrowBNB(sender.lendingPool.address, amountToBorrow, rateMode, referralCode || 0)
  );

  if (timeTravel) {
    await advanceTimeAndBlock(timeTravel);
  }

  if (dashboardEnabled) {
    await printDashboard(asset, sender, `${sender.name} borrows ${amount} ${await asset.name()}`);
  }

  const {txTimestamp} = await getTxCostAndTimestamp(txResult);
  const latestBlockTimestamp = await getLatestBlockTimestamp();

  const expectedReserveData = calcExpectedReserveDataAfterBorrow(
    amountToBorrow,
    rateMode,
    reserveDataBefore,
    txTimestamp,
    latestBlockTimestamp
  );
  const expectedUserData = calcExpectedUserDataAfterBorrow(
    amountToBorrow,
    rateMode,
    reserveDataBefore,
    expectedReserveData,
    userDataBefore,
    txTimestamp,
    latestBlockTimestamp
  );

  const reserveDataAfter = await getReserveData(asset, onBehalfOf);
  const userDataAfter = await getUserData(asset, onBehalfOf);

  //withdrawing BNB via gateway knows nothing about user's WBNB balance, we simply ignore the check.
  expectedUserData.walletBalance = userDataAfter.walletBalance;

  expect(expectedReserveData).to.almostEqualOrEqual(reserveDataAfter);
  expect(expectedUserData).to.almostEqualOrEqual(userDataAfter);

  return txResult;
};

export const repayBNB = async (
  amount: string,
  sender: User,
  onBehalfOf: User,
  rateMode: RateMode,
  option?: {
    timeTravel?: number;
    expectedResult?: ExpectedTxResult;
    dashboardEnabled?: boolean;
  }
): Promise<ContractReceipt> => {
  const asset = sender.asset.WNATIVE;
  let amountToRepay = await convertToCurrencyDecimals(asset, amount);
  if (amountToRepay.isNegative()) {
    amountToRepay = MaxUint256;
  }

  await asset.connect(await ethers.getSigner(sender.address)).approve(sender.lendingPool.address, amountToRepay);

  const reserveDataBefore = await getReserveData(asset, onBehalfOf);
  const userDataBefore = await getUserData(asset, onBehalfOf);

  const {timeTravel, expectedResult, dashboardEnabled} = option || {dashboardEnabled: false};

  const debtAmount =
    rateMode === RateMode.Stable
      ? await sender.sdToken.WNATIVE.balanceOf(sender.address)
      : await sender.vdToken.WNATIVE.balanceOf(sender.address);
  const value = debtAmount.mul(2);

  if (expectedResult?.revertMessage) {
    await expect(
      sender.wGateway.repayBNB(sender.lendingPool.address, amountToRepay, rateMode, onBehalfOf.address, {
        value,
      })
    ).to.be.revertedWith(expectedResult.revertMessage);
    return {} as ContractReceipt;
  }

  const txResult = await waitForTx(
    await sender.wGateway.repayBNB(sender.lendingPool.address, amountToRepay, rateMode, onBehalfOf.address, {
      value,
    })
  );

  if (timeTravel) {
    await advanceTimeAndBlock(timeTravel);
  }

  if (dashboardEnabled) {
    await printDashboard(asset, sender, `${sender.name} repays ${amount} ${await asset.name()}`);
  }

  const {txTimestamp} = await getTxCostAndTimestamp(txResult);
  const latestBlockTimestamp = await getLatestBlockTimestamp();

  const expectedReserveData = calcExpectedReserveDataAfterRepay(
    amountToRepay,
    rateMode,
    reserveDataBefore,
    userDataBefore,
    txTimestamp,
    latestBlockTimestamp
  );
  const expectedUserData = calcExpectedUserDataAfterRepay(
    amountToRepay,
    rateMode,
    reserveDataBefore,
    expectedReserveData,
    userDataBefore,
    sender,
    onBehalfOf,
    txTimestamp,
    latestBlockTimestamp
  );

  const reserveDataAfter = await getReserveData(asset, onBehalfOf);
  const userDataAfter = await getUserData(asset, onBehalfOf);

  //withdrawing BNB via gateway knows nothing about user's WBNB balance, we simply ignore the check.
  expectedUserData.walletBalance = userDataAfter.walletBalance;

  expect(expectedReserveData).to.almostEqualOrEqual(reserveDataAfter);
  expect(expectedUserData).to.almostEqualOrEqual(userDataAfter);

  return txResult;
};

export const withdrawBNB = async (
  amount: string,
  sender: User,
  onBehalfOf: User,
  option?: {
    expectedResult?: ExpectedTxResult;
    dashboardEnabled?: boolean;
  }
): Promise<ContractReceipt> => {
  const asset = sender.asset.WNATIVE;
  let amountToWithdraw = await convertToCurrencyDecimals(asset, amount);
  if (amountToWithdraw.isNegative()) {
    amountToWithdraw = MaxUint256;
  }

  //approve aToken to gateway address
  await sender.aToken.WNATIVE.approve(sender.wGateway.address, amountToWithdraw);

  const reserveDataBefore = await getReserveData(asset, onBehalfOf);
  const userDataBefore = await getUserData(asset, onBehalfOf);

  const {expectedResult, dashboardEnabled} = option || {dashboardEnabled: false};

  if (expectedResult?.revertMessage) {
    await expect(
      sender.wGateway.withdrawBNB(sender.lendingPool.address, amountToWithdraw, onBehalfOf.address)
    ).to.be.revertedWith(expectedResult.revertMessage);
    return {} as ContractReceipt;
  }

  const txResult = await waitForTx(
    await sender.wGateway.withdrawBNB(sender.lendingPool.address, amountToWithdraw, onBehalfOf.address)
  );

  if (dashboardEnabled) {
    await printDashboard(
      asset,
      sender,
      `${sender.name} withdraws ${amountToWithdraw.eq(MaxUint256) ? 'MAX' : amount} ${await asset.name()}`
    );
  }

  const {txTimestamp} = await getTxCostAndTimestamp(txResult);

  const expectedReserveData = calcExpectedReserveDataAfterWithdraw(
    amountToWithdraw,
    reserveDataBefore,
    userDataBefore,
    txTimestamp
  );
  const expectedUserData = calcExpectedUserDataAfterWithdraw(
    amountToWithdraw,
    reserveDataBefore,
    expectedReserveData,
    userDataBefore,
    txTimestamp
  );

  const reserveDataAfter = await getReserveData(asset, onBehalfOf);
  const userDataAfter = await getUserData(asset, onBehalfOf);

  //withdrawing BNB via gateway knows nothing about user's WBNB balance, we simply ignore the check.
  expectedUserData.walletBalance = userDataAfter.walletBalance;

  expect(expectedReserveData).to.almostEqualOrEqual(reserveDataAfter);
  expect(expectedUserData).to.almostEqualOrEqual(userDataAfter);

  return txResult;
};
