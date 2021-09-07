import {waffleChai} from '@ethereum-waffle/chai';
import {expect, use} from 'chai';
import {Fixture, ProtocolErrors, RateMode} from '../types';
import convertToCurrencyDecimals from '../utils/convertToCurrencyDecimals';
import {borrow, deposit, mint, transfer} from '../utils/protocolTx';
import setupFixture from '../utils/setupFixture';

use(waffleChai);

describe('AToken: Transfer', () => {
  const {VL_TRANSFER_NOT_ALLOWED} = ProtocolErrors;
  const fixture = {} as Fixture;

  before(async () => {
    Object.assign(fixture, await setupFixture());
  });

  it('user1 deposits 1000 DAI, gets 1000 aDAI, transfers 1000 aDAI to user2', async () => {
    const {asset, aToken, user1, user2} = fixture;

    await mint(asset.DAI, '1000', user1);
    await deposit(asset.DAI, '1000', user1, user1);
    await transfer(aToken.DAI, user1, '1000', user2.address);
  });

  it('user1 deposits 1 WETH, user2 borrows the WETH with the received DAI as collateral', async () => {
    const {asset, sdToken, user1, user2, protocolDataProvider} = fixture;

    await mint(asset.WNATIVE, '1', user1);
    await deposit(asset.WNATIVE, '1', user1, user1);

    await borrow(asset.WNATIVE, '0.1', user2, user2, RateMode.Stable);

    const amountToBorrow = await convertToCurrencyDecimals(asset.WNATIVE, '0.1');
    const {currentStableDebt} = await protocolDataProvider.getUserReserveData(asset.WNATIVE.address, user2.address);

    expect(currentStableDebt).to.be.eq(amountToBorrow);
    expect(await sdToken.WNATIVE.balanceOf(user2.address)).to.be.eq(amountToBorrow);
    expect(await asset.WNATIVE.balanceOf(user2.address)).to.be.eq(amountToBorrow);
  });

  it('reverted: user2 transfers ALL the aDAI used as collateral back to user1', async () => {
    const {aToken, user1, user2} = fixture;

    await transfer(aToken.DAI, user2, '1000', user1.address, {
      expectedResult: {revertMessage: VL_TRANSFER_NOT_ALLOWED},
    });
  });

  it('User2 transfers SOME amount of DAI used as collateral back to user1', async () => {
    const {aToken, user1, user2} = fixture;

    await transfer(aToken.DAI, user2, '100', user1.address);
  });
});
