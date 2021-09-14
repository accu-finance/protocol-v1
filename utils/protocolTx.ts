import {waffleChai} from '@ethereum-waffle/chai';
import {expect, use} from 'chai';
import {BigNumber, BigNumberish, constants, ContractReceipt, ContractTransaction, utils} from 'ethers';
import {parseEther} from 'ethers/lib/utils';
import hre, {ethers} from 'hardhat';
import {AToken, StableDebtToken, VariableDebtToken} from '../typechain';
import {
  Address,
  ContractId,
  ERC20Token,
  ExpectedTxResult,
  ProtocolErrors,
  RateMode,
  ReserveData,
  User,
  UserData,
} from '../types';
import {advanceTimeAndBlock, getLatestBlockTimestamp, getTxCostAndTimestamp, waitForTx} from '../utils/hhNetwork';
import {getContractAt} from './contractGetter';
import convertToCurrencyDecimals from './convertToCurrencyDecimals';
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

const {Zero, MaxUint256} = constants;

const {INVALID_FROM_BALANCE_AFTER_TRANSFER, INVALID_TO_BALANCE_AFTER_TRANSFER} = ProtocolErrors;

use(waffleChai);

export const mint = async (asset: ERC20Token, amount: string, to: User): Promise<ContractTransaction> => {
  const amountToMint = await convertToCurrencyDecimals(asset, amount);
  const token = asset.connect(await ethers.getSigner(to.address));
  return await token.mint(amountToMint);
};

export const approve = async (
  asset: ERC20Token,
  sender: User,
  amount: string,
  spender: Address
): Promise<ContractTransaction> => {
  const amountToApprove = await convertToCurrencyDecimals(asset, amount);
  const token = asset.connect(await ethers.getSigner(sender.address));
  return await token.approve(spender, amountToApprove);
};

export const transfer = async (
  asset: ERC20Token | AToken,
  sender: User,
  amount: string,
  recipient: Address,
  option?: {
    expectedResult?: ExpectedTxResult;
  }
): Promise<ContractReceipt> => {
  const amountToTransfer = await convertToCurrencyDecimals(asset, amount);
  const token = asset.connect(await ethers.getSigner(sender.address));

  const {expectedResult} = option || {};

  const senderBalanceBefore = await token.balanceOf(sender.address);
  const recipientBalanceBefore = await token.balanceOf(recipient);

  if (expectedResult?.revertMessage) {
    await expect(token.transfer(recipient, amountToTransfer)).to.be.revertedWith(expectedResult.revertMessage);
    return {} as ContractReceipt;
  }

  const txResult = await waitForTx(await token.transfer(recipient, amountToTransfer));

  const senderBalanceAfter = await token.balanceOf(sender.address);
  const recipientBalanceAfter = await token.balanceOf(recipient);

  expect(senderBalanceBefore.sub(senderBalanceAfter)).to.be.eq(amountToTransfer, INVALID_FROM_BALANCE_AFTER_TRANSFER);
  expect(recipientBalanceAfter.sub(recipientBalanceBefore)).to.be.eq(
    amountToTransfer,
    INVALID_TO_BALANCE_AFTER_TRANSFER
  );

  return txResult;
};

export const deposit = async (
  asset: ERC20Token,
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
  const amountToDeposit = await convertToCurrencyDecimals(asset, amount);
  await asset.connect(await ethers.getSigner(sender.address)).approve(sender.lendingPool.address, amountToDeposit);

  const reserveDataBefore = await getReserveData(asset, onBehalfOf);
  const userDataBefore = await getUserData(asset, onBehalfOf);

  const {referralCode, timeTravel, expectedResult, dashboardEnabled} = option || {
    referralCode: Zero,
    dashboardEnabled: false,
  };

  if (expectedResult?.revertMessage) {
    await expect(
      sender.lendingPool.deposit(asset.address, amountToDeposit, onBehalfOf.address, referralCode || 0)
    ).to.be.revertedWith(expectedResult.revertMessage);
    return {} as ContractReceipt;
  }

  const txResult = await waitForTx(
    await sender.lendingPool.deposit(asset.address, amountToDeposit, onBehalfOf.address, referralCode || 0)
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

  expect(expectedReserveData).to.almostEqualOrEqual(reserveDataAfter);
  expect(expectedUserData).to.almostEqualOrEqual(userDataAfter);

  return txResult;
};

export const depositETH = async (
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
      sender.wGateway.depositETH(sender.lendingPool.address, onBehalfOf.address, referralCode || 0, {
        value: amountToDeposit,
      })
    ).to.be.revertedWith(expectedResult.revertMessage);
    return {} as ContractReceipt;
  }

  const txResult = await waitForTx(
    await sender.wGateway.depositETH(sender.lendingPool.address, onBehalfOf.address, referralCode || 0, {
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

  //depositing ETH via gateway knows nothing about user's WETH balance, we simply ignore the check.
  expectedUserData.walletBalance = userDataAfter.walletBalance;

  expect(expectedReserveData).to.almostEqualOrEqual(reserveDataAfter);
  expect(expectedUserData).to.almostEqualOrEqual(userDataAfter);

  return txResult;
};

export const borrow = async (
  asset: ERC20Token,
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
  const amountToBorrow = await convertToCurrencyDecimals(asset, amount);

  const reserveDataBefore = await getReserveData(asset, onBehalfOf);
  const userDataBefore = await getUserData(asset, onBehalfOf);

  const {referralCode, timeTravel, expectedResult, dashboardEnabled} = option || {
    referralCode: Zero,
    dashboardEnabled: false,
  };

  if (expectedResult?.revertMessage) {
    await expect(
      sender.lendingPool.borrow(asset.address, amountToBorrow, rateMode, referralCode || 0, onBehalfOf.address)
    ).to.be.revertedWith(expectedResult.revertMessage);
    return {} as ContractReceipt;
  }

  const txResult = await waitForTx(
    await sender.lendingPool.borrow(asset.address, amountToBorrow, rateMode, referralCode || 0, onBehalfOf.address)
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

  expect(expectedReserveData).to.almostEqualOrEqual(reserveDataAfter);
  expect(expectedUserData).to.almostEqualOrEqual(userDataAfter);

  return txResult;
};

export const borrowETH = async (
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

  //delegates borrowing power of WETH to WETHGateway
  if (rateMode === RateMode.Stable) {
    await sender.sdToken.WNATIVE.approveDelegation(sender.wGateway.address, amountToBorrow);
  } else {
    await sender.vdToken.WNATIVE.approveDelegation(sender.wGateway.address, amountToBorrow);
  }

  if (expectedResult?.revertMessage) {
    await expect(
      sender.wGateway.borrowETH(sender.lendingPool.address, amountToBorrow, rateMode, referralCode || 0)
    ).to.be.revertedWith(expectedResult.revertMessage);
    return {} as ContractReceipt;
  }

  const txResult = await waitForTx(
    await sender.wGateway.borrowETH(sender.lendingPool.address, amountToBorrow, rateMode, referralCode || 0)
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

  //withdrawing ETH via gateway knows nothing about user's WETH balance, we simply ignore the check.
  expectedUserData.walletBalance = userDataAfter.walletBalance;

  expect(expectedReserveData).to.almostEqualOrEqual(reserveDataAfter);
  expect(expectedUserData).to.almostEqualOrEqual(userDataAfter);

  return txResult;
};

export const repay = async (
  asset: ERC20Token,
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
  let amountToRepay = await convertToCurrencyDecimals(asset, amount);
  if (amountToRepay.isNegative()) {
    amountToRepay = MaxUint256;
  }

  await asset.connect(await ethers.getSigner(sender.address)).approve(sender.lendingPool.address, amountToRepay);

  const reserveDataBefore = await getReserveData(asset, onBehalfOf);
  const userDataBefore = await getUserData(asset, onBehalfOf);

  const {timeTravel, expectedResult, dashboardEnabled} = option || {dashboardEnabled: false};

  if (expectedResult?.revertMessage) {
    await expect(
      sender.lendingPool.repay(asset.address, amountToRepay, rateMode, onBehalfOf.address)
    ).to.be.revertedWith(expectedResult.revertMessage);
    return {} as ContractReceipt;
  }

  const txResult = await waitForTx(
    await sender.lendingPool.repay(asset.address, amountToRepay, rateMode, onBehalfOf.address)
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

  expect(expectedReserveData).to.almostEqualOrEqual(reserveDataAfter);
  expect(expectedUserData).to.almostEqualOrEqual(userDataAfter);

  return txResult;
};

export const repayETH = async (
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
      sender.wGateway.repayETH(sender.lendingPool.address, amountToRepay, rateMode, onBehalfOf.address, {
        value,
      })
    ).to.be.revertedWith(expectedResult.revertMessage);
    return {} as ContractReceipt;
  }

  const txResult = await waitForTx(
    await sender.wGateway.repayETH(sender.lendingPool.address, amountToRepay, rateMode, onBehalfOf.address, {
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

  //withdrawing ETH via gateway knows nothing about user's WETH balance, we simply ignore the check.
  expectedUserData.walletBalance = userDataAfter.walletBalance;

  expect(expectedReserveData).to.almostEqualOrEqual(reserveDataAfter);
  expect(expectedUserData).to.almostEqualOrEqual(userDataAfter);

  return txResult;
};

export const withdraw = async (
  asset: ERC20Token,
  amount: string,
  sender: User,
  onBehalfOf: User,
  option?: {
    expectedResult?: ExpectedTxResult;
    dashboardEnabled?: boolean;
  }
): Promise<ContractReceipt> => {
  let amountToWithdraw = await convertToCurrencyDecimals(asset, amount);
  if (amountToWithdraw.isNegative()) {
    amountToWithdraw = MaxUint256;
  }

  const reserveDataBefore = await getReserveData(asset, onBehalfOf);
  const userDataBefore = await getUserData(asset, onBehalfOf);

  const {expectedResult, dashboardEnabled} = option || {dashboardEnabled: false};

  if (expectedResult?.revertMessage) {
    await expect(sender.lendingPool.withdraw(asset.address, amountToWithdraw, onBehalfOf.address)).to.be.revertedWith(
      expectedResult.revertMessage
    );
    return {} as ContractReceipt;
  }

  const txResult = await waitForTx(
    await sender.lendingPool.withdraw(asset.address, amountToWithdraw, onBehalfOf.address)
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

  expect(expectedReserveData).to.almostEqualOrEqual(reserveDataAfter);
  expect(expectedUserData).to.almostEqualOrEqual(userDataAfter);

  return txResult;
};

export const withdrawETH = async (
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
      sender.wGateway.withdrawETH(sender.lendingPool.address, amountToWithdraw, onBehalfOf.address)
    ).to.be.revertedWith(expectedResult.revertMessage);
    return {} as ContractReceipt;
  }

  const txResult = await waitForTx(
    await sender.wGateway.withdrawETH(sender.lendingPool.address, amountToWithdraw, onBehalfOf.address)
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

  //withdrawing ETH via gateway knows nothing about user's WETH balance, we simply ignore the check.
  expectedUserData.walletBalance = userDataAfter.walletBalance;

  expect(expectedReserveData).to.almostEqualOrEqual(reserveDataAfter);
  expect(expectedUserData).to.almostEqualOrEqual(userDataAfter);

  return txResult;
};

export const getReserveData = async (asset: ERC20Token, user: User): Promise<ReserveData> => {
  const {stableDebtTokenAddress, variableDebtTokenAddress} = await user.lendingPool.getReserveData(asset.address);

  const stableDebtToken = await getContractAt<StableDebtToken>(hre, ContractId.StableDebtToken, stableDebtTokenAddress);
  const {'0': principalStableDebt} = await stableDebtToken.getSupplyData();
  const totalStableDebtLastUpdated = await stableDebtToken.getTotalSupplyLastUpdated();

  const variableDebtToken = await getContractAt<VariableDebtToken>(
    hre,
    ContractId.VariableDebtToken,
    variableDebtTokenAddress
  );
  const scaledVariableDebt = await variableDebtToken.scaledTotalSupply();

  const marketStableRate = await user.lendingRateOracle.getMarketBorrowRate(asset.address);

  const {
    availableLiquidity,
    totalStableDebt,
    totalVariableDebt,
    liquidityRate,
    variableBorrowRate,
    stableBorrowRate,
    averageStableBorrowRate,
    liquidityIndex,
    variableBorrowIndex,
    lastUpdateTimestamp,
  } = await user.protocolDataProvider.getReserveData(asset.address);

  const totalLiquidity = availableLiquidity.add(totalStableDebt).add(totalVariableDebt);
  const utilizationRate = totalLiquidity.eq(0)
    ? BigNumber.from(0)
    : totalStableDebt.add(totalVariableDebt).rayDiv(totalLiquidity);

  const interestRateStrategy = await user.protocolDataProvider.getDefaultReserveInterestRateStrategy(asset.address);
  const reserveConfigData = await user.protocolDataProvider.getReserveConfigurationData(asset.address);

  return {
    totalLiquidity,
    utilizationRate,
    availableLiquidity,
    totalStableDebt,
    totalVariableDebt,
    liquidityRate,
    variableBorrowRate,
    stableBorrowRate,
    averageStableBorrowRate,
    marketStableRate,
    liquidityIndex,
    variableBorrowIndex,
    lastUpdateTimestamp,
    totalStableDebtLastUpdated,
    principalStableDebt,
    scaledVariableDebt,
    interestRateStrategy,
    reserveConfigData,
  };
};

export const getUserData = async (asset: ERC20Token, user: User): Promise<UserData> => {
  const {aTokenAddress} = await user.lendingPool.getReserveData(asset.address);
  const aToken = await getContractAt<AToken>(hre, ContractId.AToken, aTokenAddress);
  const scaledATokenBalance = await aToken.scaledBalanceOf(user.address);

  const {
    currentATokenBalance,
    currentStableDebt,
    currentVariableDebt,
    principalStableDebt,
    scaledVariableDebt,
    stableBorrowRate,
    liquidityRate,
    usageAsCollateralEnabled,
    stableRateLastUpdated,
  } = await user.protocolDataProvider.getUserReserveData(asset.address, user.address);

  const assetBalance = await asset.balanceOf(user.address);

  return {
    currentATokenBalance,
    currentStableDebt,
    currentVariableDebt,
    principalStableDebt,
    scaledVariableDebt,
    stableBorrowRate,
    liquidityRate,
    usageAsCollateralEnabled,
    stableRateLastUpdated,
    scaledATokenBalance,
    walletBalance: assetBalance,
  };
};

export const getUserAccountData = async (user: User) => {
  return await user.lendingPool.getUserAccountData(user.address);
};

export const getTreasuryBalance = async (asset: ERC20Token, user: User): Promise<BigNumber> => {
  const {aTokenAddress} = await user.lendingPool.getReserveData(asset.address);
  const aToken = await getContractAt<AToken>(hre, ContractId.AToken, aTokenAddress);
  return await aToken.balanceOf(await aToken.RESERVE_TREASURY_ADDRESS());
};

export const buildFlashLiquidationAdapterParams = (
  collateralAsset: Address,
  debtAsset: Address,
  user: Address,
  debtToCover: BigNumberish,
  useEthPath: boolean
) => {
  return utils.defaultAbiCoder.encode(
    ['address', 'address', 'address', 'uint256', 'bool'],
    [collateralAsset, debtAsset, user, debtToCover, useEthPath]
  );
};

export const buildLiquiditySwapParams = (
  assetToSwapToList: Address[],
  minAmountsToReceive: BigNumberish[],
  swapAllBalances: BigNumberish[],
  permitAmounts: BigNumberish[],
  deadlines: BigNumberish[],
  v: BigNumberish[],
  r: (string | Buffer)[],
  s: (string | Buffer)[],
  useEthPath: boolean[]
) => {
  return ethers.utils.defaultAbiCoder.encode(
    ['address[]', 'uint256[]', 'bool[]', 'uint256[]', 'uint256[]', 'uint8[]', 'bytes32[]', 'bytes32[]', 'bool[]'],
    [assetToSwapToList, minAmountsToReceive, swapAllBalances, permitAmounts, deadlines, v, r, s, useEthPath]
  );
};

export const buildRepayAdapterParams = (
  collateralAsset: Address,
  collateralAmount: BigNumberish,
  rateMode: BigNumberish,
  permitAmount: BigNumberish,
  deadline: BigNumberish,
  v: BigNumberish,
  r: string | Buffer,
  s: string | Buffer,
  useEthPath: boolean
) => {
  return ethers.utils.defaultAbiCoder.encode(
    ['address', 'uint256', 'uint256', 'uint256', 'uint256', 'uint8', 'bytes32', 'bytes32', 'bool'],
    [collateralAsset, collateralAmount, rateMode, permitAmount, deadline, v, r, s, useEthPath]
  );
};
