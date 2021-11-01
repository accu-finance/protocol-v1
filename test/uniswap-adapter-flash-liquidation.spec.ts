import {waffleChai} from '@ethereum-waffle/chai';
import {expect, use} from 'chai';
import {BigNumber, utils} from 'ethers';
import {REFERRAL_CODE, WAD, WAD_DECIMALS} from '../constants';
import {Fixture, RateMode} from '../types';
import {getTxCostAndTimestamp, waitForTx} from '../utils/hhNetwork';
import setupFixture from '../utils/setupFixture';
import {calcExpectedVariableDebtTokenBalance} from './helpers/protocolCalculator';
import {
  borrow,
  buildFlashLiquidationAdapterParams,
  deposit,
  getReserveData,
  getUserAccountData,
  getUserData,
  mint,
} from './helpers/protocolTx';

use(waffleChai);

describe('UniswapAdapter: Flash Liquidation', () => {
  const dashboardEnabled = false;

  const depositWETHBorrowDAI = async (fixture: Fixture) => {
    //user1 deposits DAI, user2 deposits WETH as collateral and borrows up to 0.95 Health Factor
    const {asset, user1, user2, lendingPool, priceOracle, mockPriceOracleSetter} = fixture;
    await mint(asset.DAI, '1000', user1);
    await deposit(asset.DAI, '1000', user1, user1);

    await mint(asset.WNATIVE, '1', user2);
    await deposit(asset.WNATIVE, '1', user2, user2);

    const {availableBorrowsInNativeCurrency} = await lendingPool.getUserAccountData(user2.address);
    const priceDAI = await priceOracle.getAssetPrice(asset.DAI.address);
    const expectedHealthFactor = utils.parseUnits('0.95', WAD_DECIMALS);
    const amountToBorrow = availableBorrowsInNativeCurrency.wadDiv(priceDAI).wadMul(expectedHealthFactor);
    await borrow(asset.DAI, amountToBorrow.toWadUnit(), user2, user2, RateMode.Variable, {dashboardEnabled});

    //debt price increase
    const priceDAIChange = utils.parseUnits('1.15', WAD_DECIMALS);
    await waitForTx(await mockPriceOracleSetter.setAssetPrice(asset.DAI.address, priceDAI.wadMul(priceDAIChange)));

    const {healthFactor} = await lendingPool.getUserAccountData(user2.address);
    expect(healthFactor).to.be.lte(WAD);
  };

  const depositWETHBorrowWETH = async (fixture: Fixture) => {
    //user1 deposits DAI, user2 deposits WETH as collateral and borrows up to 0.95 Health Factor
    const {asset, user1, user2, lendingPool, priceOracle, mockPriceOracleSetter} = fixture;
    await mint(asset.DAI, '1000', user1);
    await deposit(asset.DAI, '1000', user1, user1);

    await mint(asset.WNATIVE, '1', user2);
    await deposit(asset.WNATIVE, '1', user2, user2);

    const {availableBorrowsInNativeCurrency} = await lendingPool.getUserAccountData(user2.address);
    const priceDAI = await priceOracle.getAssetPrice(asset.DAI.address);
    const expectedHealthFactor = utils.parseUnits('0.8', WAD_DECIMALS);
    const amountToBorrow = availableBorrowsInNativeCurrency.wadDiv(priceDAI).wadMul(expectedHealthFactor);
    await borrow(asset.DAI, amountToBorrow.toWadUnit(), user2, user2, RateMode.Variable, {dashboardEnabled});

    //also borrow WETH
    const amountWETHToBorrow = (
      await lendingPool.getUserAccountData(user2.address)
    ).availableBorrowsInNativeCurrency.wadMul(utils.parseUnits('0.9', WAD_DECIMALS));
    await borrow(asset.WNATIVE, amountWETHToBorrow.toWadUnit(), user2, user2, RateMode.Variable, {dashboardEnabled});

    //debt price increase
    const priceDAIChange = utils.parseUnits('1.15', WAD_DECIMALS);
    await waitForTx(await mockPriceOracleSetter.setAssetPrice(asset.DAI.address, priceDAI.wadMul(priceDAIChange)));

    const {healthFactor} = await lendingPool.getUserAccountData(user2.address);
    expect(healthFactor).to.be.lte(WAD);
  };

  it('liquidator flash-borrows DAI, calls liquidationCall, swaps and repays flashloan', async () => {
    const fixture = await setupFixture();
    await depositWETHBorrowDAI(fixture);
    const {
      asset,
      user2,
      liquidator,
      lendingPool,
      mockUniswapRouter,
      flashLiquidationAdapter,
      priceOracle,
      marketConfig,
    } = fixture;

    const expectedSwap = utils.parseEther('0.4');
    await waitForTx(await mockUniswapRouter.setAmountToSwap(asset.WNATIVE.address, expectedSwap));

    const reserveDataDAIBefore = await getReserveData(asset.DAI, user2);
    const reserveDataWETHBefore = await getReserveData(asset.WNATIVE, user2);
    const userDataDAIBefore = await getUserData(asset.DAI, user2);
    const liquidatorDataWETHBefore = await getUserData(asset.WNATIVE, liquidator);

    const collateralPrice = await priceOracle.getAssetPrice(asset.WNATIVE.address);
    const debtPrice = await priceOracle.getAssetPrice(asset.DAI.address);
    const collateralDecimals = await asset.WNATIVE.decimals();
    const debtDecimals = await asset.DAI.decimals();
    const flashloanPremium = await lendingPool.FLASHLOAN_PREMIUM_TOTAL();
    const liquidationBonus = marketConfig.reserveConfig.WNATIVE.liquidationBonus;
    //max debt to cover is total debt/2
    const amountToLiquidate = userDataDAIBefore.currentVariableDebt.div(2);
    const expectedCollateraltLiquidated = debtPrice
      .mul(amountToLiquidate.percentMul(liquidationBonus))
      .mul(BigNumber.from(10).pow(collateralDecimals))
      .div(collateralPrice.mul(BigNumber.from(10).pow(debtDecimals)));
    const flashloanDebt = amountToLiquidate.add(amountToLiquidate.percentMul(flashloanPremium));
    const expectedProfit = expectedCollateraltLiquidated.sub(expectedSwap);
    const params = buildFlashLiquidationAdapterParams(
      asset.WNATIVE.address,
      asset.DAI.address,
      user2.address,
      amountToLiquidate,
      false
    );

    const txResult = await waitForTx(
      await liquidator.lendingPool.flashLoan(
        flashLiquidationAdapter.address,
        [asset.DAI.address],
        [amountToLiquidate],
        [RateMode.None],
        user2.address,
        params,
        REFERRAL_CODE
      )
    );
    const {txTimestamp} = await getTxCostAndTimestamp(txResult);

    const reserveDataDAIAfter = await getReserveData(asset.DAI, user2);
    const reserveDataWETHAfter = await getReserveData(asset.WNATIVE, user2);
    const userDataDAIAfter = await getUserData(asset.DAI, user2);
    const userDataWETHAfter = await getUserData(asset.WNATIVE, user2);
    const accountDataAfter = await getUserAccountData(user2);
    const liquidatorDataWETHAfter = await getUserData(asset.WNATIVE, liquidator);

    const variableDebtBefore = calcExpectedVariableDebtTokenBalance(
      reserveDataDAIBefore,
      userDataDAIBefore,
      txTimestamp
    );

    //DAI
    expect(accountDataAfter.healthFactor).to.be.gte(WAD);
    expect(userDataDAIAfter.currentVariableDebt).to.be.almostEqualOrEqual(variableDebtBefore.sub(amountToLiquidate));
    expect(reserveDataDAIAfter.availableLiquidity).to.be.almostEqualOrEqual(
      reserveDataDAIBefore.availableLiquidity.add(flashloanDebt)
    );
    expect(reserveDataDAIAfter.liquidityIndex).to.be.gte(reserveDataDAIBefore.liquidityIndex);
    expect(reserveDataDAIAfter.liquidityRate).to.be.lt(reserveDataDAIBefore.liquidityRate);

    //WETH
    expect(reserveDataWETHAfter.availableLiquidity).to.be.almostEqualOrEqual(
      reserveDataWETHBefore.availableLiquidity.sub(expectedCollateraltLiquidated)
    );
    expect(userDataWETHAfter.usageAsCollateralEnabled).to.be.true;
    expect(liquidatorDataWETHAfter.walletBalance).to.be.eq(liquidatorDataWETHBefore.walletBalance.add(expectedProfit));
  });

  it('liquidator flash-borrows WETH, calls liquidationCall on same the assets, no swap and repays flashloan', async () => {
    const fixture = await setupFixture();
    await depositWETHBorrowWETH(fixture);
    const {
      asset,
      user2,
      liquidator,
      lendingPool,
      flashLiquidationAdapter,
      priceOracle,
      marketConfig: poolConfig,
    } = fixture;

    const reserveDataWETHBefore = await getReserveData(asset.WNATIVE, user2);
    const userDataWETHBefore = await getUserData(asset.WNATIVE, user2);
    const liquidatorDataWETHBefore = await getUserData(asset.WNATIVE, liquidator);

    const collateralPrice = await priceOracle.getAssetPrice(asset.WNATIVE.address);
    const debtPrice = await priceOracle.getAssetPrice(asset.WNATIVE.address);
    const collateralDecimals = await asset.WNATIVE.decimals();
    const debtDecimals = await asset.WNATIVE.decimals();
    const flashloanPremium = await lendingPool.FLASHLOAN_PREMIUM_TOTAL();
    const liquidationBonus = poolConfig.reserveConfig.WNATIVE.liquidationBonus;
    //max debt to cover is total debt/2
    const amountToLiquidate = userDataWETHBefore.currentVariableDebt.div(2);
    const expectedCollateraltLiquidated = debtPrice
      .mul(amountToLiquidate.percentMul(liquidationBonus))
      .mul(BigNumber.from(10).pow(collateralDecimals))
      .div(collateralPrice.mul(BigNumber.from(10).pow(debtDecimals)));
    const flashloanDebt = amountToLiquidate.add(amountToLiquidate.percentMul(flashloanPremium));
    const params = buildFlashLiquidationAdapterParams(
      asset.WNATIVE.address,
      asset.WNATIVE.address,
      user2.address,
      amountToLiquidate,
      false
    );

    const txResult = await waitForTx(
      await liquidator.lendingPool.flashLoan(
        flashLiquidationAdapter.address,
        [asset.WNATIVE.address],
        [amountToLiquidate],
        [RateMode.None],
        user2.address,
        params,
        REFERRAL_CODE
      )
    );
    const {txTimestamp} = await getTxCostAndTimestamp(txResult);

    const reserveDataWETHAfter = await getReserveData(asset.WNATIVE, user2);
    const userDataWETHAfter = await getUserData(asset.WNATIVE, user2);
    const liquidatorDataWETHAfter = await getUserData(asset.WNATIVE, liquidator);

    const variableDebtBefore = calcExpectedVariableDebtTokenBalance(
      reserveDataWETHBefore,
      userDataWETHBefore,
      txTimestamp
    );

    //WETH
    expect(userDataWETHAfter.currentVariableDebt).to.be.almostEqualOrEqual(variableDebtBefore.sub(amountToLiquidate));
    expect(reserveDataWETHAfter.availableLiquidity).to.be.almostEqualOrEqual(
      reserveDataWETHBefore.availableLiquidity.sub(expectedCollateraltLiquidated.sub(flashloanDebt))
    );
    expect(userDataWETHAfter.usageAsCollateralEnabled).to.be.true;
    expect(liquidatorDataWETHAfter.walletBalance).to.be.eq(
      liquidatorDataWETHBefore.walletBalance.add(expectedCollateraltLiquidated.sub(flashloanDebt))
    );
  });
});
