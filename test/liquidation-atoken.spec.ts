import {waffleChai} from '@ethereum-waffle/chai';
import {expect, use} from 'chai';
import {utils} from 'ethers';
import {WAD, WAD_DECIMALS} from '../constants';
import {Fixture, ProtocolErrors, RateMode} from '../types';
import convertToCurrencyDecimals from '../utils/convertToCurrencyDecimals';
import {getTxCostAndTimestamp, waitForTx} from '../utils/hhNetwork';
import {calcExpectedVariableDebtTokenBalance} from '../utils/protocolCalculator';
import {approve, borrow, deposit, getReserveData, getUserAccountData, getUserData, mint} from '../utils/protocolTx';
import setupFixture from '../utils/setupFixture';

const {Variable} = RateMode;
const {
  LPCM_HEALTH_FACTOR_NOT_BELOW_THRESHOLD,
  LPCM_SPECIFIED_CURRENCY_NOT_BORROWED_BY_USER,
  LPCM_COLLATERAL_CANNOT_BE_LIQUIDATED,
} = ProtocolErrors;

use(waffleChai);

describe('LendingPool: liquidationCall DAI-WETH (same decimals) with liquidator receiving aToken', () => {
  const fixture = {} as Fixture;
  const dashboardEnabled = false;
  let DAI_NATIVE: string; // DAI/NATIVE ratio

  before(async () => {
    Object.assign(fixture, await setupFixture());
    const {priceOracle, asset} = fixture;
    DAI_NATIVE = (await priceOracle.getAssetPrice(asset.WNATIVE.address))
      .div(await priceOracle.getAssetPrice(asset.DAI.address))
      .toString();
  });

  it('user1 deposits DAI, user2 deposits WETH as collateral and borrows up to 0.95 Health Factor', async () => {
    const {asset, user1, user2, lendingPool, priceOracle, marketConfig} = fixture;
    await mint(asset.DAI, DAI_NATIVE, user1);
    await deposit(asset.DAI, DAI_NATIVE, user1, user1);

    await mint(asset.WNATIVE, '1', user2);
    await deposit(asset.WNATIVE, '1', user2, user2);

    const {availableBorrowsInNativeCurrency} = await lendingPool.getUserAccountData(user2.address);
    const priceDAI = await priceOracle.getAssetPrice(asset.DAI.address);
    const expectedHealthFactor = utils.parseUnits('0.95', WAD_DECIMALS);
    const amountToBorrow = availableBorrowsInNativeCurrency.wadDiv(priceDAI).wadMul(expectedHealthFactor);
    await borrow(asset.DAI, amountToBorrow.toWadUnit(), user2, user2, Variable, {dashboardEnabled});

    const {currentLiquidationThreshold, healthFactor} = await lendingPool.getUserAccountData(user2.address);
    expect(currentLiquidationThreshold).to.be.eq(marketConfig.reserveConfig.WNATIVE.liquidationThreshold);
    expect(healthFactor).to.be.gt(WAD);
  });

  it('reverted: liquidationCall on collateral with more than 1 Health Factor', async () => {
    const {asset, user2, liquidator} = fixture;

    const debtToCover = await convertToCurrencyDecimals(asset.DAI, DAI_NATIVE);
    await expect(
      liquidator.lendingPool.liquidationCall(asset.WNATIVE.address, asset.DAI.address, user2.address, debtToCover, true)
    ).to.be.revertedWith(LPCM_HEALTH_FACTOR_NOT_BELOW_THRESHOLD);
  });

  it('Health Factor drops below 1 when either debt price increases or collateral price decreases', async () => {
    const {asset, priceOracle, mockPriceOracleSetter, lendingPool, user2} = fixture;

    //debt price increase
    const priceDAI = await priceOracle.getAssetPrice(asset.DAI.address);
    const priceDAIChange = utils.parseUnits('1.15', WAD_DECIMALS);
    await mockPriceOracleSetter.setAssetPrice(asset.DAI.address, priceDAI.wadMul(priceDAIChange));

    const {healthFactor} = await lendingPool.getUserAccountData(user2.address);
    expect(healthFactor).to.be.lte(WAD);
  });

  it('reverted: liquidationCall on different debt asset than that user2 borrowed', async () => {
    const {asset, user2, liquidator} = fixture;

    const debtToCover = await convertToCurrencyDecimals(asset.WNATIVE, '1');
    await expect(
      liquidator.lendingPool.liquidationCall(
        asset.WNATIVE.address,
        asset.WNATIVE.address,
        user2.address,
        debtToCover,
        true
      )
    ).to.be.revertedWith(LPCM_SPECIFIED_CURRENCY_NOT_BORROWED_BY_USER);
  });

  it('reverted: liquidationCall on different collateral asset than that user2 deposited', async () => {
    const {asset, user2, liquidator} = fixture;

    const debtToCover = await convertToCurrencyDecimals(asset.DAI, DAI_NATIVE);
    await expect(
      liquidator.lendingPool.liquidationCall(asset.DAI.address, asset.DAI.address, user2.address, debtToCover, true)
    ).to.be.revertedWith(LPCM_COLLATERAL_CANNOT_BE_LIQUIDATED);
  });

  it('liquidationCall and rewards paid to liquidator in AToken', async () => {
    const {asset, user2, liquidator, lendingPool} = fixture;

    //liquidator must approve lendingpool to use his DAI to exchange for WETH (user2's collateral)
    await mint(asset.DAI, DAI_NATIVE, liquidator);
    await approve(asset.DAI, liquidator, '1000000000', lendingPool.address);

    const reserveDataDAIBefore = await getReserveData(asset.DAI, user2);
    const reserveDataWETHBefore = await getReserveData(asset.WNATIVE, user2);
    const userDataDAIBefore = await getUserData(asset.DAI, user2);
    const liquidatorDataWETHBefore = await getUserData(asset.WNATIVE, liquidator);

    //max debt to cover is total debt/2
    const amountToLiquidate = userDataDAIBefore.currentVariableDebt.div(2);
    const txResult = await waitForTx(
      await liquidator.lendingPool.liquidationCall(
        asset.WNATIVE.address,
        asset.DAI.address,
        user2.address,
        amountToLiquidate,
        true
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
      reserveDataDAIBefore.availableLiquidity.add(amountToLiquidate)
    );
    expect(reserveDataDAIAfter.liquidityIndex).to.be.gte(reserveDataDAIBefore.liquidityIndex);
    expect(reserveDataDAIAfter.liquidityRate).to.be.lt(reserveDataDAIBefore.liquidityRate);

    //WETH
    expect(reserveDataWETHAfter.availableLiquidity).to.be.almostEqualOrEqual(reserveDataWETHBefore.availableLiquidity);
    expect(userDataWETHAfter.usageAsCollateralEnabled).to.be.true;
    expect(liquidatorDataWETHAfter.currentATokenBalance).to.be.gt(liquidatorDataWETHBefore.currentATokenBalance);
  });
});

describe('LendingPool: liquidationCall USDC-BTC (different decimals) with liquidator receiving aToken', () => {
  const fixture = {} as Fixture;
  const dashboardEnabled = false;
  let USDC_DECIMALS: number;
  let USDC_NATIVE: string;
  let BTC_DECIMAL: number;
  let BTC_NATIVE: string;

  before(async () => {
    Object.assign(fixture, await setupFixture());
    const {priceOracle, asset, marketConfig} = fixture;
    USDC_DECIMALS = marketConfig.reserveConfig.USDC.reserveDecimals;
    USDC_NATIVE = (await priceOracle.getAssetPrice(asset.WNATIVE.address))
      .wadDiv(await priceOracle.getAssetPrice(asset.DAI.address))
      .convertUnits(WAD_DECIMALS, USDC_DECIMALS)
      .toUnit(USDC_DECIMALS);

    BTC_DECIMAL = marketConfig.reserveConfig.BTC.reserveDecimals;
    BTC_NATIVE = (await priceOracle.getAssetPrice(asset.WNATIVE.address))
      .wadDiv(await priceOracle.getAssetPrice(asset.BTC.address))
      .convertUnits(WAD_DECIMALS, BTC_DECIMAL)
      .toUnit(BTC_DECIMAL);
  });

  it('user1 deposits USDC, user2 deposits BTC as collateral and borrows up to 0.95 Health Factor', async () => {
    const {asset, user1, user2, lendingPool, priceOracle, marketConfig} = fixture;
    await mint(asset.USDC, USDC_NATIVE, user1);
    await deposit(asset.USDC, USDC_NATIVE, user1, user1);

    await mint(asset.BTC, BTC_NATIVE, user2);
    await deposit(asset.BTC, BTC_NATIVE, user2, user2);

    const {availableBorrowsInNativeCurrency} = await lendingPool.getUserAccountData(user2.address);
    const priceUSDC = await priceOracle.getAssetPrice(asset.USDC.address);
    const expectedHealthFactor = utils.parseUnits('0.95', WAD_DECIMALS);

    //convert to debt decimals
    const amountToBorrow = availableBorrowsInNativeCurrency
      .wadDiv(priceUSDC)
      .wadMul(expectedHealthFactor)
      .convertUnits(WAD_DECIMALS, USDC_DECIMALS);
    await borrow(asset.USDC, amountToBorrow.toUnit(USDC_DECIMALS), user2, user2, Variable, {dashboardEnabled});

    const {currentLiquidationThreshold, healthFactor} = await lendingPool.getUserAccountData(user2.address);
    expect(currentLiquidationThreshold).to.be.eq(marketConfig.reserveConfig.BTC.liquidationThreshold);
    expect(healthFactor).to.be.gt(WAD);
  });

  it('reverted: liquidationCall on collateral with more than 1 Health Factor', async () => {
    const {asset, user2, liquidator} = fixture;

    const debtToCover = await convertToCurrencyDecimals(asset.USDC, USDC_NATIVE);
    await expect(
      liquidator.lendingPool.liquidationCall(asset.BTC.address, asset.USDC.address, user2.address, debtToCover, true)
    ).to.be.revertedWith(LPCM_HEALTH_FACTOR_NOT_BELOW_THRESHOLD);
  });

  it('Health Factor drops below 1 when either debt price increases or collateral price decreases', async () => {
    const {asset, priceOracle, mockPriceOracleSetter, lendingPool, user2} = fixture;

    //collateral price decreases
    const priceWBTC = await priceOracle.getAssetPrice(asset.BTC.address);
    const priceWBTCChange = utils.parseUnits('0.85', WAD_DECIMALS);
    await mockPriceOracleSetter.setAssetPrice(asset.BTC.address, priceWBTC.wadMul(priceWBTCChange));

    const {healthFactor} = await lendingPool.getUserAccountData(user2.address);
    expect(healthFactor).to.be.lte(WAD);
  });

  it('reverted: liquidationCall on different debt asset than that user2 borrowed', async () => {
    const {asset, user2, liquidator} = fixture;

    const debtToCover = await convertToCurrencyDecimals(asset.BTC, '1');
    await expect(
      liquidator.lendingPool.liquidationCall(asset.BTC.address, asset.BTC.address, user2.address, debtToCover, true)
    ).to.be.revertedWith(LPCM_SPECIFIED_CURRENCY_NOT_BORROWED_BY_USER);
  });

  it('reverted: liquidationCall on different collateral asset than that user2 deposited', async () => {
    const {asset, user2, liquidator} = fixture;

    const debtToCover = await convertToCurrencyDecimals(asset.USDC, USDC_NATIVE);
    await expect(
      liquidator.lendingPool.liquidationCall(asset.USDC.address, asset.USDC.address, user2.address, debtToCover, true)
    ).to.be.revertedWith(LPCM_COLLATERAL_CANNOT_BE_LIQUIDATED);
  });

  it('liquidationCall and rewards paid to liquidator in AToken', async () => {
    const {asset, user2, liquidator, lendingPool} = fixture;

    //liquidator must approve lendingpool to use his USDC to exchange for BTC (user2's collateral)
    await mint(asset.USDC, USDC_NATIVE, liquidator);
    await approve(asset.USDC, liquidator, '1000000000', lendingPool.address);

    const reserveDataUSDCBefore = await getReserveData(asset.USDC, user2);
    const reserveDataWBTCBefore = await getReserveData(asset.BTC, user2);
    const userDataUSDCBefore = await getUserData(asset.USDC, user2);
    const liquidatorDataWBTCBefore = await getUserData(asset.BTC, liquidator);

    //max debt to cover is total debt/2
    const amountToLiquidate = userDataUSDCBefore.currentVariableDebt.div(2);
    const txResult = await waitForTx(
      await liquidator.lendingPool.liquidationCall(
        asset.BTC.address,
        asset.USDC.address,
        user2.address,
        amountToLiquidate,
        true
      )
    );
    const {txTimestamp} = await getTxCostAndTimestamp(txResult);

    const reserveDataUSDCAfter = await getReserveData(asset.USDC, user2);
    const reserveDataWBTCAfter = await getReserveData(asset.BTC, user2);
    const userDataUSDCAfter = await getUserData(asset.USDC, user2);
    const userDataWBTCAfter = await getUserData(asset.BTC, user2);
    const accountDataAfter = await getUserAccountData(user2);
    const liquidatorDataWBTCAfter = await getUserData(asset.BTC, liquidator);

    const variableDebtBefore = calcExpectedVariableDebtTokenBalance(
      reserveDataUSDCBefore,
      userDataUSDCBefore,
      txTimestamp
    );

    //USDC
    expect(accountDataAfter.healthFactor).to.be.gte(WAD);
    expect(userDataUSDCAfter.currentVariableDebt).to.be.almostEqualOrEqual(variableDebtBefore.sub(amountToLiquidate));
    expect(reserveDataUSDCAfter.availableLiquidity).to.be.almostEqualOrEqual(
      reserveDataUSDCBefore.availableLiquidity.add(amountToLiquidate)
    );
    expect(reserveDataUSDCAfter.liquidityIndex).to.be.gte(reserveDataUSDCBefore.liquidityIndex);
    expect(reserveDataUSDCAfter.liquidityRate).to.be.lt(reserveDataUSDCBefore.liquidityRate);

    //BTC
    expect(reserveDataWBTCAfter.availableLiquidity).to.be.almostEqualOrEqual(reserveDataWBTCBefore.availableLiquidity);
    expect(userDataWBTCAfter.usageAsCollateralEnabled).to.be.true;
    expect(liquidatorDataWBTCAfter.currentATokenBalance).to.be.gt(liquidatorDataWBTCBefore.currentATokenBalance);
  });
});
