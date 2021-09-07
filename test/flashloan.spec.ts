import {waffleChai} from '@ethereum-waffle/chai';
import {expect, use} from 'chai';
import {utils} from 'ethers';
import {Fixture, ProtocolErrors, RateMode} from '../types';
import {deposit, getReserveData, getUserData, mint} from '../utils/protocolTx';
import setupFixture from '../utils/setupFixture';

const {None, Variable, Stable} = RateMode;
const {SAFEERC20_LOWLEVEL_CALL, LP_INVALID_FLASH_LOAN_EXECUTOR_RETURN, VL_COLLATERAL_BALANCE_IS_0} = ProtocolErrors;

use(waffleChai);

describe('LendingPool: Flashloan', () => {
  const fixture = {} as Fixture;

  before(async () => {
    Object.assign(fixture, await setupFixture());
  });

  it('user1 deposits WETH', async () => {
    const {asset, user1} = fixture;
    await mint(asset.WNATIVE, '1', user1);
    await deposit(asset.WNATIVE, '1', user1, user1);
  });

  it('user2 flash-borrows with none rate mode', async () => {
    const {mockFlashloanReceiver, asset, user2, lendingPool} = fixture;
    const amountWETH = utils.parseEther('0.8');

    const reserveDataBefore = await getReserveData(asset.WNATIVE, user2);

    await user2.lendingPool.flashLoan(
      mockFlashloanReceiver.address,
      [asset.WNATIVE.address],
      [amountWETH],
      [None],
      mockFlashloanReceiver.address,
      '0x10',
      0
    );

    //calculate premium
    const flashloanPremium = await lendingPool.FLASHLOAN_PREMIUM_TOTAL();
    const totalPremium = amountWETH.percentMul(flashloanPremium);
    const reserveDataAfter = await getReserveData(asset.WNATIVE, user2);

    expect(reserveDataAfter.totalLiquidity).to.be.eq(reserveDataBefore.totalLiquidity.add(totalPremium));
  });

  it('reverted: user2 flash-borrows but does not return the funds', async () => {
    const {mockFlashloanReceiver, asset, user2} = fixture;
    const amountWETH = utils.parseEther('0.8');

    await mockFlashloanReceiver.setFailExecutionTransfer(true);

    await expect(
      user2.lendingPool.flashLoan(
        mockFlashloanReceiver.address,
        [asset.WNATIVE.address],
        [amountWETH],
        [None],
        mockFlashloanReceiver.address,
        '0x10',
        0
      )
    ).to.be.revertedWith(SAFEERC20_LOWLEVEL_CALL);
  });

  it('reverted: user2 flash-borrows amount bigger than the available liquidity', async () => {
    const {mockFlashloanReceiver, asset, user2} = fixture;
    const amountWETH = utils.parseEther('2');

    await expect(
      user2.lendingPool.flashLoan(
        mockFlashloanReceiver.address,
        [asset.WNATIVE.address],
        [amountWETH],
        [None],
        mockFlashloanReceiver.address,
        '0x10',
        0
      )
    ).to.be.revertedWith(SAFEERC20_LOWLEVEL_CALL);
  });

  it('reverted: user2 borrows using flashloan with a receiver as EOA', async () => {
    const {mockFlashloanReceiver, asset, user2} = fixture;
    const amountWETH = utils.parseEther('0.1');

    await mockFlashloanReceiver.setSimulateEOA(true);
    await mockFlashloanReceiver.setFailExecutionTransfer(true);

    await expect(
      user2.lendingPool.flashLoan(
        mockFlashloanReceiver.address,
        [asset.WNATIVE.address],
        [amountWETH],
        [None],
        mockFlashloanReceiver.address,
        '0x10',
        0
      )
    ).to.be.revertedWith(LP_INVALID_FLASH_LOAN_EXECUTOR_RETURN);

    // reset the mock state
    await mockFlashloanReceiver.setSimulateEOA(false);
    await mockFlashloanReceiver.setFailExecutionTransfer(false);
  });

  it('user2 deposits DAI, flash-borrows WETH with vaiable rate mode, does not return the funds, normal borrowing should be created', async () => {
    const {asset, mockFlashloanReceiver, user2} = fixture;

    await mint(asset.DAI, '1000', user2);
    await deposit(asset.DAI, '1000', user2, user2);

    const amountWETH = utils.parseEther('0.1');
    const reserveDataBefore = await getReserveData(asset.WNATIVE, user2);
    const userDataBefore = await getUserData(asset.WNATIVE, user2);

    await user2.lendingPool.flashLoan(
      mockFlashloanReceiver.address,
      [asset.WNATIVE.address],
      [amountWETH],
      [Variable],
      user2.address,
      '0x10',
      0
    );

    const reserveDataAfter = await getReserveData(asset.WNATIVE, user2);
    const userDataAfter = await getUserData(asset.WNATIVE, user2);

    expect(reserveDataAfter.availableLiquidity).to.be.eq(reserveDataBefore.availableLiquidity.sub(amountWETH));
    expect(userDataAfter.currentVariableDebt).to.be.eq(userDataBefore.currentVariableDebt.add(amountWETH));
  });

  it('user3 deposits USDC, flash-borrows WETH with stable rate mode, does not return the funds, normal borrowing should be created', async () => {
    const {asset, mockFlashloanReceiver, user3} = fixture;

    await mint(asset.USDC, '1000', user3);
    await deposit(asset.USDC, '1000', user3, user3);

    const amountWETH = utils.parseEther('0.1');
    const reserveDataBefore = await getReserveData(asset.WNATIVE, user3);
    const userDataBefore = await getUserData(asset.WNATIVE, user3);

    await user3.lendingPool.flashLoan(
      mockFlashloanReceiver.address,
      [asset.WNATIVE.address],
      [amountWETH],
      [Stable],
      user3.address,
      '0x10',
      0
    );

    const reserveDataAfter = await getReserveData(asset.WNATIVE, user3);
    const userDataAfter = await getUserData(asset.WNATIVE, user3);

    expect(reserveDataAfter.availableLiquidity).to.be.eq(reserveDataBefore.availableLiquidity.sub(amountWETH));
    expect(userDataAfter.currentStableDebt).to.be.eq(userDataBefore.currentStableDebt.add(amountWETH));
  });

  it('user4 flash-borrows WETH with variable rate mode without collateral', async () => {
    const {asset, mockFlashloanReceiver, user4} = fixture;

    const amountWETH = utils.parseEther('0.1');

    await expect(
      user4.lendingPool.flashLoan(
        mockFlashloanReceiver.address,
        [asset.WNATIVE.address],
        [amountWETH],
        [Variable],
        user4.address,
        '0x10',
        0
      )
    ).to.be.revertedWith(VL_COLLATERAL_BALANCE_IS_0);
  });
});
