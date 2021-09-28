import {waffleChai} from '@ethereum-waffle/chai';
import {use} from 'chai';
import {ProtocolErrors, RateMode} from '../types';
import setupFixture from '../utils/setupFixture';
import {borrow, deposit, mint} from './helpers/protocolTx';

const {None} = RateMode;
const {VL_INVALID_INTEREST_RATE_MODE_SELECTED} = ProtocolErrors;

use(waffleChai);

describe('LendingPool: Reverted', () => {
  it('reverted: invalid interest rate', async () => {
    const {asset, user1, user2} = await setupFixture();
    await mint(asset.DAI, '1000', user1);
    await deposit(asset.DAI, '1000', user1, user1);

    await mint(asset.WNATIVE, '1', user2);
    await deposit(asset.WNATIVE, '1', user2, user2);

    await borrow(asset.DAI, '100', user2, user2, None, {
      expectedResult: {revertMessage: VL_INVALID_INTEREST_RATE_MODE_SELECTED},
    });
  });
});
