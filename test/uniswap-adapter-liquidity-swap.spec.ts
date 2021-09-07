import {waffleChai} from '@ethereum-waffle/chai';
import {expect, use} from 'chai';
import {constants, utils} from 'ethers';
import {REFERRAL_CODE} from '../constants';
import {Fixture, RateMode} from '../types';
import convertToCurrencyDecimals from '../utils/convertToCurrencyDecimals';
import {getTxCostAndTimestamp, waitForTx} from '../utils/hhNetwork';
import {buildLiquiditySwapParams, deposit, getReserveData, getUserData, mint} from '../utils/protocolTx';
import setupFixture from '../utils/setupFixture';

const {HashZero, Zero} = constants;

use(waffleChai);

describe('UniswapAdapter: Liquidity Swap', () => {
  const provideLiquidity = async (fixture: Fixture) => {
    const {asset, user1} = fixture;
    await mint(asset.DAI, '1000', user1);
    await deposit(asset.DAI, '1000', user1, user1);

    await mint(asset.USDC, '1000', user1);
    await deposit(asset.USDC, '1000', user1, user1);

    await mint(asset.WNATIVE, '1', user1);
    await deposit(asset.WNATIVE, '1', user1, user1);
  };

  it('user1 deposits WETH, gets aWETH, swaps aWETH for aDAI ', async () => {
    const fixture = await setupFixture();
    await provideLiquidity(fixture);
    const {asset, user1, lendingPool, mockUniswapRouter, uniswapLiquiditySwapAdapter, priceOracle} = fixture;

    const reserveDataDAIBefore = await getReserveData(asset.DAI, user1);
    const reserveDataWETHBefore = await getReserveData(asset.WNATIVE, user1);
    const userDataDAIBefore = await getUserData(asset.DAI, user1);
    const userDataWETHBefore = await getUserData(asset.WNATIVE, user1);

    const priceWETH = await priceOracle.getAssetPrice(asset.WNATIVE.address);
    const priceDAI = await priceOracle.getAssetPrice(asset.DAI.address);

    const amountWETHToSwap = utils.parseEther('0.5');
    const expectedAmountDAI = await convertToCurrencyDecimals(asset.DAI, amountWETHToSwap.div(priceDAI).toString());
    await waitForTx(await mockUniswapRouter.setAmountToReturn(asset.WNATIVE.address, expectedAmountDAI));

    await user1.aToken.WNATIVE.approve(uniswapLiquiditySwapAdapter.address, amountWETHToSwap);

    const flashloanPremium = await lendingPool.FLASHLOAN_PREMIUM_TOTAL();
    const flashloanAmount = amountWETHToSwap.sub(amountWETHToSwap.percentMul(flashloanPremium));

    const params = buildLiquiditySwapParams(
      [asset.DAI.address],
      [expectedAmountDAI],
      [0],
      [0],
      [0],
      [0],
      [HashZero],
      [HashZero],
      [false]
    );

    const txResult = await waitForTx(
      await user1.lendingPool.flashLoan(
        uniswapLiquiditySwapAdapter.address,
        [asset.WNATIVE.address],
        [flashloanAmount],
        [RateMode.None],
        user1.address,
        params,
        REFERRAL_CODE
      )
    );
    const {txTimestamp} = await getTxCostAndTimestamp(txResult);

    const reserveDataDAIAfter = await getReserveData(asset.DAI, user1);
    const reserveDataWETHAfter = await getReserveData(asset.WNATIVE, user1);
    const userDataDAIAfter = await getUserData(asset.DAI, user1);
    const userDataWETHAfter = await getUserData(asset.WNATIVE, user1);

    const adapterWETHBalance = await asset.WNATIVE.balanceOf(uniswapLiquiditySwapAdapter.address);
    const adapterDAIBalance = await asset.DAI.balanceOf(uniswapLiquiditySwapAdapter.address);
    const adapterDAIAllowance = await asset.DAI.allowance(uniswapLiquiditySwapAdapter.address, user1.address);

    expect(adapterWETHBalance).to.be.eq(Zero);
    expect(adapterDAIBalance).to.be.eq(Zero);
    expect(adapterDAIAllowance).to.be.eq(Zero);

    expect(userDataDAIAfter.currentATokenBalance).to.be.eq(
      userDataDAIBefore.currentATokenBalance.add(expectedAmountDAI)
    );
    expect(reserveDataDAIAfter.availableLiquidity).to.be.eq(
      reserveDataDAIBefore.availableLiquidity.add(expectedAmountDAI)
    );

    expect(userDataWETHAfter.currentATokenBalance).to.be.gte(
      userDataWETHBefore.currentATokenBalance.sub(amountWETHToSwap)
    );
    expect(reserveDataWETHAfter.availableLiquidity).to.be.gte(
      reserveDataWETHBefore.availableLiquidity.sub(amountWETHToSwap)
    );
  });
});
