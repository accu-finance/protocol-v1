import {waffleChai} from '@ethereum-waffle/chai';
import {expect, use} from 'chai';
import {utils} from 'ethers';
import {APPROVAL_AMOUNT_LENDING_POOL, RAY_DECIMALS} from '../constants';
import {ProtocolErrors} from '../types';
import convertToCurrencyDecimals from '../utils/convertToCurrencyDecimals';
import setupFixture from '../utils/setupFixture';

use(waffleChai);

describe('LendingPoolConfigurator', () => {
  const {CALLER_NOT_POOL_ADMIN, LPC_RESERVE_LIQUIDITY_NOT_0, RC_INVALID_RESERVE_FACTOR} = ProtocolErrors;

  it('reverted: set an invalid reserve factor', async () => {
    const {configurator, asset} = await setupFixture();

    const invalidReserveFactor = 65536;

    await expect(configurator.setReserveFactor(asset.WNATIVE.address, invalidReserveFactor)).to.be.revertedWith(
      RC_INVALID_RESERVE_FACTOR
    );
  });

  it('deactivate/reactivate the ETH reserve', async () => {
    const {configurator, asset, protocolDataProvider} = await setupFixture();
    await configurator.deactivateReserve(asset.WNATIVE.address);
    {
      const {isActive} = await protocolDataProvider.getReserveConfigurationData(asset.WNATIVE.address);
      expect(isActive).to.be.equal(false);
    }

    await configurator.activateReserve(asset.WNATIVE.address);
    {
      const {isActive} = await protocolDataProvider.getReserveConfigurationData(asset.WNATIVE.address);
      expect(isActive).to.be.equal(true);
    }
  });

  it('reverted: only pool admin can call deactivateReserve ', async () => {
    const {user2, asset} = await setupFixture();
    await expect(user2.configurator.deactivateReserve(asset.WNATIVE.address), CALLER_NOT_POOL_ADMIN).to.be.revertedWith(
      CALLER_NOT_POOL_ADMIN
    );
  });

  it('reverted: only pool admin can call  activateReserve ', async () => {
    const {user2, asset} = await setupFixture();
    await expect(user2.configurator.activateReserve(asset.WNATIVE.address), CALLER_NOT_POOL_ADMIN).to.be.revertedWith(
      CALLER_NOT_POOL_ADMIN
    );
  });

  it('freezes/unfreezes the ETH reserve', async () => {
    const {configurator, asset, protocolDataProvider, marketConfig} = await setupFixture();
    const {reserveConfig} = marketConfig;

    await configurator.freezeReserve(asset.WNATIVE.address);
    {
      const {
        decimals,
        ltv,
        liquidationBonus,
        liquidationThreshold,
        reserveFactor,
        stableBorrowRateEnabled,
        borrowingEnabled,
        isActive,
        isFrozen,
      } = await protocolDataProvider.getReserveConfigurationData(asset.WNATIVE.address);

      expect(borrowingEnabled).to.be.equal(true);
      expect(isActive).to.be.equal(true);
      expect(isFrozen).to.be.equal(true);
      expect(decimals).to.be.equal(reserveConfig.WNATIVE.reserveDecimals);
      expect(ltv).to.be.equal(reserveConfig.WNATIVE.baseLTVAsCollateral);
      expect(liquidationThreshold).to.be.equal(reserveConfig.WNATIVE.liquidationThreshold);
      expect(liquidationBonus).to.be.equal(reserveConfig.WNATIVE.liquidationBonus);
      expect(stableBorrowRateEnabled).to.be.equal(reserveConfig.WNATIVE.stableBorrowRateEnabled);
      expect(reserveFactor).to.be.equal(reserveConfig.WNATIVE.reserveFactor);
    }

    await configurator.unfreezeReserve(asset.WNATIVE.address);
    {
      const {
        decimals,
        ltv,
        liquidationBonus,
        liquidationThreshold,
        reserveFactor,
        stableBorrowRateEnabled,
        borrowingEnabled,
        isActive,
        isFrozen,
      } = await protocolDataProvider.getReserveConfigurationData(asset.WNATIVE.address);

      expect(borrowingEnabled).to.be.equal(true);
      expect(isActive).to.be.equal(true);
      expect(isFrozen).to.be.equal(false);
      expect(decimals).to.be.equal(reserveConfig.WNATIVE.reserveDecimals);
      expect(ltv).to.be.equal(reserveConfig.WNATIVE.baseLTVAsCollateral);
      expect(liquidationThreshold).to.be.equal(reserveConfig.WNATIVE.liquidationThreshold);
      expect(liquidationBonus).to.be.equal(reserveConfig.WNATIVE.liquidationBonus);
      expect(stableBorrowRateEnabled).to.be.equal(reserveConfig.WNATIVE.stableBorrowRateEnabled);
      expect(reserveFactor).to.be.equal(reserveConfig.WNATIVE.reserveFactor);
    }
  });

  it('reverted: only admin can call freezeReserve ', async () => {
    const {user2, asset} = await setupFixture();
    await expect(user2.configurator.freezeReserve(asset.WNATIVE.address), CALLER_NOT_POOL_ADMIN).to.be.revertedWith(
      CALLER_NOT_POOL_ADMIN
    );
  });

  it('reverted: only admin can call unfreezeReserve ', async () => {
    const {user2, asset} = await setupFixture();
    await expect(user2.configurator.unfreezeReserve(asset.WNATIVE.address), CALLER_NOT_POOL_ADMIN).to.be.revertedWith(
      CALLER_NOT_POOL_ADMIN
    );
  });

  it('deactivates/activates the ETH reserve for borrowing', async () => {
    const {configurator, protocolDataProvider, asset, marketConfig} = await setupFixture();
    const {reserveConfig} = marketConfig;

    await configurator.disableBorrowingOnReserve(asset.WNATIVE.address);
    {
      const {
        decimals,
        ltv,
        liquidationBonus,
        liquidationThreshold,
        reserveFactor,
        stableBorrowRateEnabled,
        borrowingEnabled,
        isActive,
        isFrozen,
      } = await protocolDataProvider.getReserveConfigurationData(asset.WNATIVE.address);

      expect(borrowingEnabled).to.be.equal(false);
      expect(isActive).to.be.equal(true);
      expect(isFrozen).to.be.equal(false);
      expect(decimals).to.be.equal(reserveConfig.WNATIVE.reserveDecimals);
      expect(ltv).to.be.equal(reserveConfig.WNATIVE.baseLTVAsCollateral);
      expect(liquidationThreshold).to.be.equal(reserveConfig.WNATIVE.liquidationThreshold);
      expect(liquidationBonus).to.be.equal(reserveConfig.WNATIVE.liquidationBonus);
      expect(stableBorrowRateEnabled).to.be.equal(reserveConfig.WNATIVE.stableBorrowRateEnabled);
      expect(reserveFactor).to.be.equal(reserveConfig.WNATIVE.reserveFactor);
    }

    await configurator.enableBorrowingOnReserve(asset.WNATIVE.address, true);
    {
      const {variableBorrowIndex} = await protocolDataProvider.getReserveData(asset.WNATIVE.address);

      const {
        decimals,
        ltv,
        liquidationBonus,
        liquidationThreshold,
        reserveFactor,
        stableBorrowRateEnabled,
        borrowingEnabled,
        isActive,
        isFrozen,
      } = await protocolDataProvider.getReserveConfigurationData(asset.WNATIVE.address);

      expect(borrowingEnabled).to.be.equal(true);
      expect(isActive).to.be.equal(true);
      expect(isFrozen).to.be.equal(false);
      expect(decimals).to.be.equal(reserveConfig.WNATIVE.reserveDecimals);
      expect(ltv).to.be.equal(reserveConfig.WNATIVE.baseLTVAsCollateral);
      expect(liquidationThreshold).to.be.equal(reserveConfig.WNATIVE.liquidationThreshold);
      expect(liquidationBonus).to.be.equal(reserveConfig.WNATIVE.liquidationBonus);
      expect(stableBorrowRateEnabled).to.be.equal(reserveConfig.WNATIVE.stableBorrowRateEnabled);
      expect(reserveFactor).to.be.equal(reserveConfig.WNATIVE.reserveFactor);

      expect(variableBorrowIndex.toString()).to.be.equal(utils.parseUnits('1', RAY_DECIMALS));
    }
  });

  it('reverted: only admin can call disableBorrowingOnReserve ', async () => {
    const {user2, asset} = await setupFixture();
    await expect(
      user2.configurator.disableBorrowingOnReserve(asset.WNATIVE.address),
      CALLER_NOT_POOL_ADMIN
    ).to.be.revertedWith(CALLER_NOT_POOL_ADMIN);
  });

  it('reverted: only admin can call enableBorrowingOnReserve ', async () => {
    const {user2, asset} = await setupFixture();
    await expect(
      user2.configurator.enableBorrowingOnReserve(asset.WNATIVE.address, true),
      CALLER_NOT_POOL_ADMIN
    ).to.be.revertedWith(CALLER_NOT_POOL_ADMIN);
  });

  it('deactivates/activates the ETH reserve as collateral', async () => {
    const {configurator, protocolDataProvider, asset, marketConfig: poolConfig} = await setupFixture();
    const {reserveConfig} = poolConfig;

    await configurator.configureReserveAsCollateral(asset.WNATIVE.address, 0, 0, 0);
    {
      const {
        decimals,
        ltv,
        liquidationBonus,
        liquidationThreshold,
        reserveFactor,
        stableBorrowRateEnabled,
        borrowingEnabled,
        isActive,
        isFrozen,
      } = await protocolDataProvider.getReserveConfigurationData(asset.WNATIVE.address);

      expect(borrowingEnabled).to.be.equal(true);
      expect(isActive).to.be.equal(true);
      expect(isFrozen).to.be.equal(false);
      expect(decimals).to.be.equal(18);
      expect(ltv).to.be.equal(0);
      expect(liquidationThreshold).to.be.equal(0);
      expect(liquidationBonus).to.be.equal(0);
      expect(stableBorrowRateEnabled).to.be.equal(true);
      expect(reserveFactor).to.be.equal(reserveConfig.WNATIVE.reserveFactor);
    }

    await configurator.configureReserveAsCollateral(asset.WNATIVE.address, '8000', '8250', '10500');
    {
      const {
        decimals,
        ltv,
        liquidationBonus,
        liquidationThreshold,
        reserveFactor,
        stableBorrowRateEnabled,
        borrowingEnabled,
        isActive,
        isFrozen,
      } = await protocolDataProvider.getReserveConfigurationData(asset.WNATIVE.address);

      expect(borrowingEnabled).to.be.equal(true);
      expect(isActive).to.be.equal(true);
      expect(isFrozen).to.be.equal(false);
      expect(decimals).to.be.equal(reserveConfig.WNATIVE.reserveDecimals);
      expect(ltv).to.be.equal(reserveConfig.WNATIVE.baseLTVAsCollateral);
      expect(liquidationThreshold).to.be.equal(reserveConfig.WNATIVE.liquidationThreshold);
      expect(liquidationBonus).to.be.equal(reserveConfig.WNATIVE.liquidationBonus);
      expect(stableBorrowRateEnabled).to.be.equal(reserveConfig.WNATIVE.stableBorrowRateEnabled);
      expect(reserveFactor).to.be.equal(reserveConfig.WNATIVE.reserveFactor);
    }
  });

  it('reverted: only admin can call configureReserveAsCollateral ', async () => {
    const {user2, asset} = await setupFixture();
    await expect(
      user2.configurator.configureReserveAsCollateral(asset.WNATIVE.address, '7500', '8000', '10500'),
      CALLER_NOT_POOL_ADMIN
    ).to.be.revertedWith(CALLER_NOT_POOL_ADMIN);
  });

  it('disable/enables stable borrow rate on the ETH reserve', async () => {
    const {configurator, protocolDataProvider, asset, marketConfig} = await setupFixture();
    const {reserveConfig} = marketConfig;

    await configurator.disableReserveStableRate(asset.WNATIVE.address);
    {
      const {
        decimals,
        ltv,
        liquidationBonus,
        liquidationThreshold,
        reserveFactor,
        stableBorrowRateEnabled,
        borrowingEnabled,
        isActive,
        isFrozen,
      } = await protocolDataProvider.getReserveConfigurationData(asset.WNATIVE.address);

      expect(borrowingEnabled).to.be.equal(true);
      expect(isActive).to.be.equal(true);
      expect(isFrozen).to.be.equal(false);
      expect(decimals).to.be.equal(reserveConfig.WNATIVE.reserveDecimals);
      expect(ltv).to.be.equal(reserveConfig.WNATIVE.baseLTVAsCollateral);
      expect(liquidationThreshold).to.be.equal(reserveConfig.WNATIVE.liquidationThreshold);
      expect(liquidationBonus).to.be.equal(reserveConfig.WNATIVE.liquidationBonus);
      expect(stableBorrowRateEnabled).to.be.equal(false);
      expect(reserveFactor).to.be.equal(reserveConfig.WNATIVE.reserveFactor);
    }

    await configurator.enableReserveStableRate(asset.WNATIVE.address);
    {
      const {
        decimals,
        ltv,
        liquidationBonus,
        liquidationThreshold,
        reserveFactor,
        stableBorrowRateEnabled,
        borrowingEnabled,
        isActive,
        isFrozen,
      } = await protocolDataProvider.getReserveConfigurationData(asset.WNATIVE.address);

      expect(borrowingEnabled).to.be.equal(true);
      expect(isActive).to.be.equal(true);
      expect(isFrozen).to.be.equal(false);
      expect(decimals).to.be.equal(reserveConfig.WNATIVE.reserveDecimals);
      expect(ltv).to.be.equal(reserveConfig.WNATIVE.baseLTVAsCollateral);
      expect(liquidationThreshold).to.be.equal(reserveConfig.WNATIVE.liquidationThreshold);
      expect(liquidationBonus).to.be.equal(reserveConfig.WNATIVE.liquidationBonus);
      expect(stableBorrowRateEnabled).to.be.equal(true);
      expect(reserveFactor).to.be.equal(reserveConfig.WNATIVE.reserveFactor);
    }
  });

  it('reverted: only admin can call disableReserveStableRate', async () => {
    const {user2, asset} = await setupFixture();
    await expect(
      user2.configurator.disableReserveStableRate(asset.WNATIVE.address),
      CALLER_NOT_POOL_ADMIN
    ).to.be.revertedWith(CALLER_NOT_POOL_ADMIN);
  });

  it('reverted: only admin can call enableReserveStableRate', async () => {
    const {user2, asset} = await setupFixture();
    await expect(
      user2.configurator.enableReserveStableRate(asset.WNATIVE.address),
      CALLER_NOT_POOL_ADMIN
    ).to.be.revertedWith(CALLER_NOT_POOL_ADMIN);
  });

  it('changes the reserve factor of WETH', async () => {
    const {configurator, protocolDataProvider, asset, marketConfig} = await setupFixture();
    const {reserveConfig} = marketConfig;
    await configurator.setReserveFactor(asset.WNATIVE.address, '1000');
    const {
      decimals,
      ltv,
      liquidationBonus,
      liquidationThreshold,
      reserveFactor,
      stableBorrowRateEnabled,
      borrowingEnabled,
      isActive,
      isFrozen,
    } = await protocolDataProvider.getReserveConfigurationData(asset.WNATIVE.address);

    expect(borrowingEnabled).to.be.equal(true);
    expect(isActive).to.be.equal(true);
    expect(isFrozen).to.be.equal(false);
    expect(decimals).to.be.equal(reserveConfig.WNATIVE.reserveDecimals);
    expect(ltv).to.be.equal(reserveConfig.WNATIVE.baseLTVAsCollateral);
    expect(liquidationThreshold).to.be.equal(reserveConfig.WNATIVE.liquidationThreshold);
    expect(liquidationBonus).to.be.equal(reserveConfig.WNATIVE.liquidationBonus);
    expect(stableBorrowRateEnabled).to.be.equal(reserveConfig.WNATIVE.stableBorrowRateEnabled);
    expect(reserveFactor).to.be.equal(1000);
  });

  it('reverted: only LendingPoolManager can call setReserveFactor', async () => {
    const {user2, asset} = await setupFixture();
    await expect(
      user2.configurator.setReserveFactor(asset.WNATIVE.address, '2000'),
      CALLER_NOT_POOL_ADMIN
    ).to.be.revertedWith(CALLER_NOT_POOL_ADMIN);
  });

  it('reverted: when trying to disable the DAI reserve with liquidity on it', async () => {
    const {asset, lendingPool, configurator} = await setupFixture();
    const userAddress = await lendingPool.signer.getAddress();
    await asset.DAI.mint(await convertToCurrencyDecimals(asset.DAI, '1000'));

    //approve protocol to access depositor wallet
    await asset.DAI.approve(lendingPool.address, APPROVAL_AMOUNT_LENDING_POOL);
    const amountDAItoDeposit = await convertToCurrencyDecimals(asset.DAI, '1000');

    //user 1 deposits 1000 DAI
    await lendingPool.deposit(asset.DAI.address, amountDAItoDeposit, userAddress, '0');

    await expect(configurator.deactivateReserve(asset.DAI.address), LPC_RESERVE_LIQUIDITY_NOT_0).to.be.revertedWith(
      LPC_RESERVE_LIQUIDITY_NOT_0
    );
  });
});
