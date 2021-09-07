import {waffleChai} from '@ethereum-waffle/chai';
import {expect, use} from 'chai';
import {constants} from 'ethers';
import {APPROVAL_AMOUNT_LENDING_POOL} from '../constants';
import {Fixture, ProtocolErrors, RateMode} from '../types';
import convertToCurrencyDecimals from '../utils/convertToCurrencyDecimals';
import {mint} from '../utils/protocolTx';
import setupFixture from '../utils/setupFixture';

const {Zero} = constants;

use(waffleChai);

describe('LendingPool: Deposit', () => {
  const {VL_INVALID_AMOUNT} = ProtocolErrors;
  const fixture = {} as Fixture;
  const referralCode = Zero;

  before(async () => {
    Object.assign(fixture, await setupFixture());
  });

  it('user1 deposits 1000 DAI to an empty reserve', async () => {
    const {asset, aToken, user1, lendingPool} = fixture;
    const amount = await convertToCurrencyDecimals(asset.DAI, '1000');

    await mint(asset.DAI, '1000', user1);

    await user1.asset.DAI.approve(lendingPool.address, APPROVAL_AMOUNT_LENDING_POOL);
    const beforeAmount = await aToken.DAI.balanceOf(user1.address);
    await expect(user1.lendingPool.deposit(asset.DAI.address, amount, user1.address, referralCode))
      .to.emit(lendingPool, 'Deposit')
      .withArgs(asset.DAI.address, user1.address, user1.address, amount, referralCode);
    const afterAmount = await aToken.DAI.balanceOf(user1.address);
    expect(afterAmount.sub(beforeAmount)).to.be.eq(amount);
  });

  it('user2 deposits 1000 DAI after user1', async () => {
    const {asset, aToken, user2, lendingPool} = fixture;
    const amount = await convertToCurrencyDecimals(asset.DAI, '1000');

    await mint(asset.DAI, '1000', user2);

    await user2.asset.DAI.approve(lendingPool.address, APPROVAL_AMOUNT_LENDING_POOL);
    const beforeAmount = await aToken.DAI.balanceOf(user2.address);
    await expect(user2.lendingPool.deposit(asset.DAI.address, amount, user2.address, referralCode))
      .to.emit(lendingPool, 'Deposit')
      .withArgs(asset.DAI.address, user2.address, user2.address, amount, referralCode);
    const afterAmount = await aToken.DAI.balanceOf(user2.address);
    expect(afterAmount.sub(beforeAmount)).to.be.eq(amount);
  });

  it('user1 deposits 1000 USDC to an empty reserve', async () => {
    const {asset, aToken, user1, lendingPool} = fixture;
    const amount = await convertToCurrencyDecimals(asset.USDC, '1000');

    await mint(asset.USDC, '1000', user1);

    await user1.asset.USDC.approve(lendingPool.address, APPROVAL_AMOUNT_LENDING_POOL);
    const beforeAmount = await aToken.USDC.balanceOf(user1.address);
    await expect(user1.lendingPool.deposit(asset.USDC.address, amount, user1.address, referralCode))
      .to.emit(lendingPool, 'Deposit')
      .withArgs(asset.USDC.address, user1.address, user1.address, amount, referralCode);
    const afterAmount = await aToken.USDC.balanceOf(user1.address);
    expect(afterAmount.sub(beforeAmount)).to.be.eq(amount);
  });

  it('user2 deposits 1000 USDC after user1', async () => {
    const {asset, aToken, user2, lendingPool} = fixture;
    const amount = await convertToCurrencyDecimals(asset.USDC, '1000');

    await mint(asset.USDC, '1000', user2);

    await user2.asset.USDC.approve(lendingPool.address, APPROVAL_AMOUNT_LENDING_POOL);
    const beforeAmount = await aToken.USDC.balanceOf(user2.address);
    await expect(user2.lendingPool.deposit(asset.USDC.address, amount, user2.address, referralCode))
      .to.emit(lendingPool, 'Deposit')
      .withArgs(asset.USDC.address, user2.address, user2.address, amount, referralCode);
    const afterAmount = await aToken.USDC.balanceOf(user2.address);
    expect(afterAmount.sub(beforeAmount)).to.be.eq(amount);
  });

  it('user1 deposits 1000 WETH to an empty reserve', async () => {
    const {asset, aToken, user1, lendingPool} = fixture;
    const amount = await convertToCurrencyDecimals(asset.WNATIVE, '1000');

    await mint(asset.WNATIVE, '1000', user1);

    await user1.asset.WNATIVE.approve(lendingPool.address, APPROVAL_AMOUNT_LENDING_POOL);
    const beforeAmount = await aToken.WNATIVE.balanceOf(user1.address);
    await expect(user1.lendingPool.deposit(asset.WNATIVE.address, amount, user1.address, referralCode))
      .to.emit(lendingPool, 'Deposit')
      .withArgs(asset.WNATIVE.address, user1.address, user1.address, amount, referralCode);
    const afterAmount = await aToken.WNATIVE.balanceOf(user1.address);
    expect(afterAmount.sub(beforeAmount)).to.be.eq(amount);
  });

  it('user2 deposits 1000 WETH after user1', async () => {
    const {asset, aToken, user2, lendingPool} = fixture;
    const amount = await convertToCurrencyDecimals(asset.WNATIVE, '1000');

    await mint(asset.WNATIVE, '1000', user2);

    await user2.asset.WNATIVE.approve(lendingPool.address, APPROVAL_AMOUNT_LENDING_POOL);
    const beforeAmount = await aToken.WNATIVE.balanceOf(user2.address);
    await expect(user2.lendingPool.deposit(asset.WNATIVE.address, amount, user2.address, referralCode))
      .to.emit(lendingPool, 'Deposit')
      .withArgs(asset.WNATIVE.address, user2.address, user2.address, amount, referralCode);
    const afterAmount = await aToken.WNATIVE.balanceOf(user2.address);
    expect(afterAmount.sub(beforeAmount)).to.be.eq(amount);
  });

  it('[reverted] user1 deposits 0 DAI', async () => {
    const {asset, user1, lendingPool} = fixture;

    await user1.asset.DAI.approve(lendingPool.address, APPROVAL_AMOUNT_LENDING_POOL);
    await expect(user1.lendingPool.deposit(asset.DAI.address, 0, user1.address, referralCode)).to.revertedWith(
      VL_INVALID_AMOUNT
    );
  });

  it('[reverted] user1 deposits 0 WETH', async () => {
    const {asset, user1, lendingPool} = fixture;

    await user1.asset.WNATIVE.approve(lendingPool.address, APPROVAL_AMOUNT_LENDING_POOL);
    await expect(user1.lendingPool.deposit(asset.WNATIVE.address, 0, user1.address, referralCode)).to.revertedWith(
      VL_INVALID_AMOUNT
    );
  });

  it('user1 deposits 1000 DAI on behalf of user2; user2 borrow 0.1 WETH', async () => {
    const {asset, aToken, user1, user2, lendingPool} = fixture;
    const amount = await convertToCurrencyDecimals(asset.DAI, '1000');

    await mint(asset.DAI, '1000', user1);

    await user1.asset.DAI.approve(lendingPool.address, APPROVAL_AMOUNT_LENDING_POOL);
    const beforeAmount = await aToken.DAI.balanceOf(user1.address);
    await expect(user1.lendingPool.deposit(asset.DAI.address, amount, user2.address, referralCode))
      .to.emit(lendingPool, 'Deposit')
      .withArgs(asset.DAI.address, user1.address, user2.address, amount, referralCode);
    const afterAmount = await aToken.DAI.balanceOf(user2.address);
    expect(afterAmount.sub(beforeAmount)).to.be.eq(amount);

    const amountWETH = await convertToCurrencyDecimals(asset.WNATIVE, '0.1');
    await expect(
      user2.lendingPool.borrow(asset.WNATIVE.address, amountWETH, RateMode.Variable, referralCode, user2.address)
    ).to.emit(lendingPool, 'Borrow');
    // .withArgs(asset.WNATIVE.address, user1.address, user2.address, amountWETH, RateMode.Variable, 0, referralCode)
  });
});
