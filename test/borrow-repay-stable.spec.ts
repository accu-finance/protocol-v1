import {waffleChai} from '@ethereum-waffle/chai';
import {use} from 'chai';
import {YEAR} from '../constants';
import {Fixture, ProtocolErrors, RateMode} from '../types';
import setupFixture from '../utils/setupFixture';
import {borrow, deposit, mint, repay, withdraw} from './helpers/protocolTx';

const {Variable, Stable} = RateMode;
const {
  VL_COLLATERAL_CANNOT_COVER_NEW_BORROW,
  VL_INVALID_AMOUNT,
  VL_NO_DEBT_OF_SELECTED_TYPE,
  VL_NO_EXPLICIT_AMOUNT_TO_REPAY_ON_BEHALF,
  VL_COLLATERAL_BALANCE_IS_0,
} = ProtocolErrors;

use(waffleChai);

describe('LendingPool: borrow and repay with stable rate', () => {
  const fixture = {} as Fixture;
  const dashboardEnabled = false;

  before(async () => {
    Object.assign(fixture, await setupFixture());
  });

  it('user1 deposits 1000 DAI, user2 deposits 1 WETH as collateral and borrows 100 DAI at stable rate', async () => {
    const {asset, user1, user2} = fixture;
    await mint(asset.DAI, '1000', user1);
    await deposit(asset.DAI, '1000', user1, user1);

    await mint(asset.WNATIVE, '1', user2);
    await deposit(asset.WNATIVE, '1', user2, user2);

    await borrow(asset.DAI, '100', user2, user2, Stable, {timeTravel: 1 * YEAR});
  });

  it('reverted: user1 borrow the rest', async () => {
    const {asset, user1} = fixture;
    await borrow(asset.DAI, '900', user1, user1, Stable, {
      expectedResult: {revertMessage: VL_COLLATERAL_CANNOT_COVER_NEW_BORROW},
    });
  });

  it('reverted: user2 repays 0 DAI', async () => {
    const {asset, user2} = fixture;
    await repay(asset.DAI, '0', user2, user2, Stable, {
      expectedResult: {revertMessage: VL_INVALID_AMOUNT},
    });
  });

  it('reverted: user1 who has no debt repays 1 DAI', async () => {
    const {asset, user1} = fixture;
    await mint(asset.DAI, '1', user1);
    await repay(asset.DAI, '1', user1, user1, Stable, {
      expectedResult: {revertMessage: VL_NO_DEBT_OF_SELECTED_TYPE},
    });
  });

  it('user2 repays half of borrowed amount after one year', async () => {
    const {asset, user2} = fixture;
    await repay(asset.DAI, '50', user2, user2, Stable, {dashboardEnabled});
  });

  it('user2 repays half of borrowed amount after one year', async () => {
    const {asset, user2} = fixture;
    await repay(asset.DAI, '50', user2, user2, Stable, {dashboardEnabled});
  });

  it('user2 repays the rest of borrowed amount after one year', async () => {
    const {asset, user2} = fixture;
    await mint(asset.DAI, '15', user2);
    await repay(asset.DAI, '-1', user2, user2, Stable, {dashboardEnabled});
  });

  it('user1 withdraws deposited DAI + interest', async () => {
    const {asset, user1} = fixture;
    await withdraw(asset.DAI, '-1', user1, user1, {dashboardEnabled});
  });

  it('user2 withdraws deposited WETH', async () => {
    const {asset, user2} = fixture;
    await withdraw(asset.WNATIVE, '-1', user2, user2, {dashboardEnabled});
  });
});

describe('LendingPool: borrow and repay with stable rate', () => {
  const fixture = {} as Fixture;
  const dashboardEnabled = false;

  before(async () => {
    Object.assign(fixture, await setupFixture());
  });

  it('user1 deposits 1000 DAI', async () => {
    const {asset, user1, user2} = fixture;
    await mint(asset.DAI, '1000', user1);
    await deposit(asset.DAI, '1000', user1, user1);

    await mint(asset.WNATIVE, '1', user2);
    await deposit(asset.WNATIVE, '1', user2, user2);
  });

  it('reverted: user2 borrow 1000 DAI at stable rate without any collateral', async () => {
    const {asset, user2} = fixture;
    await borrow(asset.DAI, '1000', user2, user2, Stable, {
      expectedResult: {revertMessage: VL_COLLATERAL_CANNOT_COVER_NEW_BORROW},
    });
  });

  it('user1 withdraws deposited DAI', async () => {
    const {asset, user1} = fixture;
    await withdraw(asset.DAI, '1000', user1, user1, {dashboardEnabled});
  });
});

describe('LendingPool: borrow and repay with stable rate', () => {
  const fixture = {} as Fixture;
  const dashboardEnabled = false;

  before(async () => {
    Object.assign(fixture, await setupFixture());
  });

  it('user1 deposits 1000 DAI, user2,3,4,5 deposits 1 WETH as collateral and borrows 100 DAI at stable rate', async () => {
    const {asset, user1, user2, user3, user4, user5} = fixture;
    await mint(asset.DAI, '1000', user1);
    await deposit(asset.DAI, '1000', user1, user1);

    await mint(asset.WNATIVE, '1', user2);
    await deposit(asset.WNATIVE, '1', user2, user2);
    await borrow(asset.DAI, '100', user2, user2, Stable, {timeTravel: 1 * YEAR});

    await mint(asset.WNATIVE, '1', user3);
    await deposit(asset.WNATIVE, '1', user3, user3);
    await borrow(asset.DAI, '100', user3, user3, Stable, {timeTravel: 1 * YEAR});

    await mint(asset.WNATIVE, '1', user4);
    await deposit(asset.WNATIVE, '1', user4, user4);
    await borrow(asset.DAI, '100', user4, user4, Stable, {timeTravel: 1 * YEAR});

    await mint(asset.WNATIVE, '1', user5);
    await deposit(asset.WNATIVE, '1', user5, user5);
    await borrow(asset.DAI, '100', user5, user5, Stable, {timeTravel: 1 * YEAR});
  });

  it('user2,3,4,5 repays borrowed DAI + interest', async () => {
    const {asset, user2, user3, user4, user5} = fixture;
    await mint(asset.DAI, '30', user2);
    await repay(asset.DAI, '-1', user2, user2, Stable);

    await mint(asset.DAI, '30', user3);
    await repay(asset.DAI, '-1', user3, user3, Stable);

    await mint(asset.DAI, '30', user4);
    await repay(asset.DAI, '-1', user4, user4, Stable);

    await mint(asset.DAI, '30', user5);
    await repay(asset.DAI, '-1', user5, user5, Stable);
  });

  it('user1 withdraws deposited DAI + interest', async () => {
    const {asset, user1} = fixture;
    await withdraw(asset.DAI, '-1', user1, user1, {dashboardEnabled});
  });
});

describe('LendingPool: borrow and repay with stable rate', () => {
  const fixture = {} as Fixture;
  const dashboardEnabled = false;

  before(async () => {
    Object.assign(fixture, await setupFixture());
  });

  it('user1 deposits 1000 DAI, user2 deposits 2 WETH as collateral and borrows 100 DAI at stable rate, 100 DAI at variable rate', async () => {
    const {asset, user1, user2} = fixture;
    await mint(asset.DAI, '1000', user1);
    await deposit(asset.DAI, '1000', user1, user1);

    await mint(asset.WNATIVE, '2', user2);
    await deposit(asset.WNATIVE, '2', user2, user2);

    await borrow(asset.DAI, '100', user2, user2, Stable, {timeTravel: 1 * YEAR, dashboardEnabled});
    await borrow(asset.DAI, '100', user2, user2, Variable, {timeTravel: 1 * YEAR, dashboardEnabled});
  });

  it('user2 repays full borrowed amount after one year', async () => {
    const {asset, user2} = fixture;
    await mint(asset.DAI, '50', user2);

    await repay(asset.DAI, '-1', user2, user2, Stable, {dashboardEnabled});
    await repay(asset.DAI, '-1', user2, user2, Variable, {dashboardEnabled});
  });

  it('user1 withdraws deposited DAI + interest', async () => {
    const {asset, user1} = fixture;
    await withdraw(asset.DAI, '-1', user1, user1, {dashboardEnabled});
  });

  it('user2 withdraws deposited WETH', async () => {
    const {asset, user2} = fixture;
    await withdraw(asset.WNATIVE, '-1', user2, user2, {dashboardEnabled});
  });
});
