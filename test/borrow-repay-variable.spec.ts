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

describe('LendingPool: borrow and repay with variable rate [DAI,WETH]', () => {
  const fixture = {} as Fixture;
  const dashboardEnabled = false;

  before(async () => {
    Object.assign(fixture, await setupFixture());
  });

  it('user3 deposits 1 DAI to account for rounding errors', async () => {
    const {asset, user3} = fixture;
    await mint(asset.DAI, '1', user3);
    await deposit(asset.DAI, '1', user3, user3, {dashboardEnabled});
  });

  it('user1 deposits 1000 DAI, user2 deposits 1 WETH as collateral and borrows 100 DAI at variable rate', async () => {
    const {asset, user1, user2} = fixture;
    await mint(asset.DAI, '1000', user1);
    await deposit(asset.DAI, '1000', user1, user1, {dashboardEnabled});

    await mint(asset.WNATIVE, '1', user2);
    await deposit(asset.WNATIVE, '1', user2, user2, {dashboardEnabled});

    await borrow(asset.DAI, '100', user2, user2, Variable, {timeTravel: 1 * YEAR, dashboardEnabled});
  });

  it('reverted: user1 borrow the rest', async () => {
    const {asset, user1} = fixture;
    await borrow(asset.DAI, '900', user1, user1, Variable, {
      expectedResult: {revertMessage: VL_COLLATERAL_CANNOT_COVER_NEW_BORROW},
    });
  });

  it('reverted: user2 repays 0 DAI', async () => {
    const {asset, user2} = fixture;
    await repay(asset.DAI, '0', user2, user2, Variable, {
      expectedResult: {revertMessage: VL_INVALID_AMOUNT},
    });
  });

  it('reverted: user1 who has no debt repays 1 DAI', async () => {
    const {asset, user1} = fixture;
    await mint(asset.DAI, '1', user1);
    await repay(asset.DAI, '1', user1, user1, Variable, {
      expectedResult: {revertMessage: VL_NO_DEBT_OF_SELECTED_TYPE},
    });
  });

  it('user2 repays a small amount of DAI, enough to cover a small part of the interest', async () => {
    const {asset, user2} = fixture;
    await repay(asset.DAI, '1.25', user2, user2, Variable, {dashboardEnabled});
  });

  it('user2 repays full borrowed amount after one year', async () => {
    const {asset, user2} = fixture;
    await mint(asset.DAI, '10', user2);
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

describe('LendingPool: borrow and repay with variable rate [LINK,WETH]', () => {
  const fixture = {} as Fixture;
  const dashboardEnabled = false;

  before(async () => {
    Object.assign(fixture, await setupFixture());
  });

  it('user1 deposits 1 WETH, user2 deposits 100 LINK as collateral and borrows 0.5 WETH at variable rate', async () => {
    const {asset, user1, user2} = fixture;
    await mint(asset.WNATIVE, '1', user1);
    await deposit(asset.WNATIVE, '1', user1, user1, {dashboardEnabled});

    await mint(asset.LINK, '100', user2);
    await deposit(asset.LINK, '100', user2, user2, {dashboardEnabled});

    await borrow(asset.WNATIVE, '0.5', user2, user2, Variable, {dashboardEnabled, timeTravel: 1 * YEAR});
  });

  it('reverted: user3 repays MAX WETH on behalf of user1', async () => {
    const {asset, user2, user3} = fixture;
    await mint(asset.WNATIVE, '1', user3);
    await repay(asset.WNATIVE, '-1', user3, user2, Variable, {
      dashboardEnabled,
      expectedResult: {revertMessage: VL_NO_EXPLICIT_AMOUNT_TO_REPAY_ON_BEHALF},
    });
  });

  it('user3 repays a small amount of WETH on behalf of user1', async () => {
    const {asset, user2, user3} = fixture;
    await repay(asset.WNATIVE, '0.2', user3, user2, Variable, {dashboardEnabled});
  });

  it('user2 repays full amount of borrowed WETH', async () => {
    const {asset, user2} = fixture;
    await mint(asset.WNATIVE, '1', user2);
    await repay(asset.WNATIVE, '-1', user2, user2, Variable, {dashboardEnabled});
  });

  it('user1 withdraws deposited WETH + interest', async () => {
    const {asset, user1} = fixture;
    await withdraw(asset.WNATIVE, '-1', user1, user1, {dashboardEnabled});
  });

  it('user2 withdraws deposited LINK', async () => {
    const {asset, user2} = fixture;
    await withdraw(asset.LINK, '-1', user2, user2, {dashboardEnabled});
  });
});

describe('LendingPool: borrow and repay with variable rate [USDC,WETH]', () => {
  const fixture = {} as Fixture;
  const dashboardEnabled = false;

  before(async () => {
    Object.assign(fixture, await setupFixture());
  });

  it('user3 deposits 1 USDC to account for rounding errors', async () => {
    const {asset, user3} = fixture;
    await mint(asset.USDC, '1', user3);
    await deposit(asset.USDC, '1', user3, user3);
  });

  it('user1 deposits 1000 USDC, user2 deposits 1 WETH as collateral and borrows 100 USDC at variable rate', async () => {
    const {asset, user1, user2} = fixture;
    await mint(asset.USDC, '1000', user1);
    await deposit(asset.USDC, '1000', user1, user1);

    await mint(asset.WNATIVE, '1', user2);
    await deposit(asset.WNATIVE, '1', user2, user2);

    await borrow(asset.USDC, '100', user2, user2, Variable, {timeTravel: 1 * YEAR});
  });

  it('reverted: user2 borrows the rest of USDC', async () => {
    const {asset, user2} = fixture;
    await borrow(asset.USDC, '900', user2, user2, Variable, {
      expectedResult: {revertMessage: VL_COLLATERAL_CANNOT_COVER_NEW_BORROW},
    });
  });

  it('user2 repays full borrowed amount after one year', async () => {
    const {asset, user2} = fixture;
    await mint(asset.USDC, '10', user2);
    await repay(asset.USDC, '-1', user2, user2, Variable, {dashboardEnabled});
  });

  it('user1 withdraws deposited USDC + interest', async () => {
    const {asset, user1} = fixture;
    await withdraw(asset.USDC, '-1', user1, user1, {dashboardEnabled});
  });

  it('user2 withdraws deposited WETH', async () => {
    const {asset, user2} = fixture;
    await withdraw(asset.WNATIVE, '-1', user2, user2, {dashboardEnabled});
  });
});

describe('LendingPool: borrow and repay with variable rate [MIX]', () => {
  const fixture = {} as Fixture;
  const dashboardEnabled = false;

  before(async () => {
    Object.assign(fixture, await setupFixture());
  });

  it('reverted: user1 deposits 1000 DAI, user3 borrows 100 DAI without collateral', async () => {
    const {asset, user1, user3} = fixture;
    await mint(asset.DAI, '1000', user1);
    await deposit(asset.DAI, '1000', user1, user1);

    await borrow(asset.DAI, '100', user3, user3, Variable, {
      expectedResult: {revertMessage: VL_COLLATERAL_BALANCE_IS_0},
    });
  });

  it('reverted: user3 deposits 0.1 WETH, user3 borrows 100 DAI which his 0.1 WETH cannot cover as collateral', async () => {
    const {asset, user3} = fixture;
    await mint(asset.WNATIVE, '0.1', user3);
    await deposit(asset.WNATIVE, '0.1', user3, user3);

    await borrow(asset.DAI, '100', user3, user3, Variable, {
      expectedResult: {revertMessage: VL_COLLATERAL_CANNOT_COVER_NEW_BORROW},
    });
  });

  it('user3 withdraws deposited WETH', async () => {
    const {asset, user3} = fixture;
    await withdraw(asset.WNATIVE, '-1', user3, user3, {dashboardEnabled});
  });

  it('reverted: user1 deposits 1000 USDC, user3 borrows 1000 USDC without collateral', async () => {
    const {asset, user1, user3} = fixture;
    await mint(asset.USDC, '1000', user1);
    await deposit(asset.USDC, '1000', user1, user1);

    await borrow(asset.USDC, '100', user3, user3, Variable, {
      expectedResult: {revertMessage: VL_COLLATERAL_BALANCE_IS_0},
    });
  });

  it('reverted: user3 deposits 0.1 WETH, user3 borrows 100 USDC which his 0.1 WETH cannot cover as collateral', async () => {
    const {asset, user3} = fixture;
    await mint(asset.WNATIVE, '0.1', user3);
    await deposit(asset.WNATIVE, '0.1', user3, user3);

    await borrow(asset.USDC, '100', user3, user3, Variable, {
      expectedResult: {revertMessage: VL_COLLATERAL_CANNOT_COVER_NEW_BORROW},
    });
  });

  it('user3 withdraws deposited WETH', async () => {
    const {asset, user3} = fixture;
    await withdraw(asset.WNATIVE, '-1', user3, user3, {dashboardEnabled});
  });
});

describe('LendingPool: borrow and repay with variable rate [DAI,WETH]', () => {
  const fixture = {} as Fixture;
  const dashboardEnabled = false;

  before(async () => {
    Object.assign(fixture, await setupFixture());
  });

  it('user1 deposits 1000 DAI, user2 deposits 2 WETH as collateral and borrows 100 DAI at variable rate, 100 DAI at stable rate', async () => {
    const {asset, user1, user2} = fixture;
    await mint(asset.DAI, '1000', user1);
    await deposit(asset.DAI, '1000', user1, user1);

    await mint(asset.WNATIVE, '2', user2);
    await deposit(asset.WNATIVE, '2', user2, user2);

    await borrow(asset.DAI, '100', user2, user2, Variable, {timeTravel: 1 * YEAR});
    await borrow(asset.DAI, '100', user2, user2, Stable, {timeTravel: 1 * YEAR});
  });

  it('user2 repays full borrowed amount after one year', async () => {
    const {asset, user2} = fixture;
    await mint(asset.DAI, '50', user2);

    await repay(asset.DAI, '-1', user2, user2, Variable, {dashboardEnabled});
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
