import {waffleChai} from '@ethereum-waffle/chai';
import {expect, use} from 'chai';
import {constants, utils} from 'ethers';
import {REFERRAL_CODE} from '../constants';
import {Fixture, RateMode} from '../types';
import convertToCurrencyDecimals from '../utils/convertToCurrencyDecimals';
import {getTxCostAndTimestamp, waitForTx} from '../utils/hhNetwork';
import {borrow, buildRepayAdapterParams, deposit, getReserveData, getUserData, mint} from '../utils/protocolTx';
import setupFixture from '../utils/setupFixture';

const {HashZero, Zero} = constants;

use(waffleChai);

describe('UniswapAdapter: Repay', () => {
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

  const provideLiquidity = async () => {
    const {asset, user1, user2} = fixture;
    await mint(asset.DAI, DAI_NATIVE, user1);
    await deposit(asset.DAI, DAI_NATIVE, user1, user1);

    await mint(asset.USDC, DAI_NATIVE, user1);
    await deposit(asset.USDC, DAI_NATIVE, user1, user1);

    await mint(asset.WNATIVE, '1', user1);
    await deposit(asset.WNATIVE, '1', user1, user1);

    await mint(asset.WNATIVE, '1', user2);
    await deposit(asset.WNATIVE, '1', user2, user2);
  };

  it('user2 borrow DAI', async () => {
    await provideLiquidity();
    const {asset, user2, lendingPool, mockUniswapRouter, uniswapRepayAdapter, priceOracle} = fixture;

    const priceWETH = await priceOracle.getAssetPrice(asset.WNATIVE.address);
    const priceDAI = await priceOracle.getAssetPrice(asset.DAI.address);

    const amountWNATIVEToSwap = utils.parseEther('0.2');
    const expectedAmountDAI = await convertToCurrencyDecimals(asset.DAI, amountWNATIVEToSwap.div(priceDAI).toString());

    await borrow(asset.DAI, expectedAmountDAI.toWadUnit(), user2, user2, RateMode.Stable);

    await user2.aToken.WNATIVE.approve(uniswapRepayAdapter.address, amountWNATIVEToSwap);
    await mockUniswapRouter.setAmountToSwap(asset.WNATIVE.address, amountWNATIVEToSwap);

    const flashloanPremium = await lendingPool.FLASHLOAN_PREMIUM_TOTAL();
    const flashloanAmount = expectedAmountDAI.add(expectedAmountDAI.percentMul(flashloanPremium));
    await mockUniswapRouter.setAmountIn(flashloanAmount, asset.WNATIVE.address, asset.DAI.address, amountWNATIVEToSwap);

    const reserveDataDAIBefore = await getReserveData(asset.DAI, user2);
    const reserveDataWETHBefore = await getReserveData(asset.WNATIVE, user2);
    const userDataDAIBefore = await getUserData(asset.DAI, user2);
    const userDataWETHBefore = await getUserData(asset.WNATIVE, user2);

    const params = buildRepayAdapterParams(
      asset.WNATIVE.address,
      amountWNATIVEToSwap,
      RateMode.Stable,
      0,
      0,
      0,
      HashZero,
      HashZero,
      false
    );

    const txResult = await waitForTx(
      await user2.lendingPool.flashLoan(
        uniswapRepayAdapter.address,
        [asset.DAI.address],
        [expectedAmountDAI],
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

    const adapterWETHBalance = await asset.WNATIVE.balanceOf(uniswapRepayAdapter.address);
    const adapterDAIBalance = await asset.DAI.balanceOf(uniswapRepayAdapter.address);
    const adapterDAIAllowance = await asset.DAI.allowance(uniswapRepayAdapter.address, user2.address);

    expect(adapterWETHBalance).to.be.eq(Zero);
    expect(adapterDAIBalance).to.be.eq(Zero);
    expect(adapterDAIAllowance).to.be.eq(Zero);

    expect(userDataDAIAfter.walletBalance).to.be.eq(userDataDAIBefore.walletBalance);
    expect(reserveDataDAIAfter.availableLiquidity).to.be.gt(
      reserveDataDAIBefore.availableLiquidity.add(expectedAmountDAI)
    );

    expect(userDataWETHAfter.currentATokenBalance).to.be.gte(
      userDataWETHBefore.currentATokenBalance.sub(amountWNATIVEToSwap)
    );
    expect(reserveDataWETHAfter.availableLiquidity).to.be.gte(
      reserveDataWETHBefore.availableLiquidity.sub(amountWNATIVEToSwap)
    );
  });
});
