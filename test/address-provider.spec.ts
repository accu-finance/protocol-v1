import {waffleChai} from '@ethereum-waffle/chai';
import {expect, use} from 'chai';
import {utils} from 'ethers';
import hre, {getUnnamedAccounts} from 'hardhat';
import {ProtocolErrors} from '../types';
import {deployLendingPool} from '../utils/contractDeployer';
import {waitForTx} from '../utils/hhNetwork';
import setupFixture from '../utils/setupFixture';

use(waffleChai);

describe('AddressProvider', () => {
  it('Test the accessibility of the AddressProvider', async () => {
    const {addressProvider, user1} = await setupFixture();
    const mockAddress = (await getUnnamedAccounts())[0];
    const {INVALID_OWNER_REVERT_MSG} = ProtocolErrors;

    await addressProvider.transferOwnership(user1.address);

    for (const contractFunction of [
      addressProvider.setMarketId,
      addressProvider.setLendingPoolImpl,
      addressProvider.setLendingPoolConfiguratorImpl,
      addressProvider.setLendingPoolCollateralManager,
      addressProvider.setPoolAdmin,
      addressProvider.setPriceOracle,
      addressProvider.setLendingRateOracle,
    ]) {
      await expect(contractFunction(mockAddress)).to.be.revertedWith(INVALID_OWNER_REVERT_MSG);
    }

    await expect(
      addressProvider.setAddress(utils.keccak256(utils.toUtf8Bytes('RANDOM_ID')), mockAddress)
    ).to.be.revertedWith(INVALID_OWNER_REVERT_MSG);

    await expect(
      addressProvider.setAddressAsProxy(utils.keccak256(utils.toUtf8Bytes('RANDOM_ID')), mockAddress)
    ).to.be.revertedWith(INVALID_OWNER_REVERT_MSG);
  });

  it('Tests adding  a proxied address with `setAddressAsProxy()`', async () => {
    const {admin} = await setupFixture();
    const {INVALID_OWNER_REVERT_MSG} = ProtocolErrors;

    const mockLendingPool = await deployLendingPool(hre, 'mockLendingPool');
    const proxiedAddressId = utils.keccak256(utils.toUtf8Bytes('RANDOM_PROXIED'));

    const proxiedAddressSetReceipt = await waitForTx(
      await admin.addressProvider.setAddressAsProxy(proxiedAddressId, mockLendingPool.address)
    );

    if (!proxiedAddressSetReceipt.events || proxiedAddressSetReceipt.events?.length < 1) {
      throw new Error('INVALID_EVENT_EMMITED');
    }

    expect(proxiedAddressSetReceipt.events[0].event).to.be.equal('ProxyCreated');
    expect(proxiedAddressSetReceipt.events[1].event).to.be.equal('AddressSet');
    expect(proxiedAddressSetReceipt.events[1].args?.id).to.be.equal(proxiedAddressId);
    expect(proxiedAddressSetReceipt.events[1].args?.newAddress).to.be.equal(mockLendingPool.address);
    expect(proxiedAddressSetReceipt.events[1].args?.hasProxy).to.be.equal(true);
  });

  it('Tests adding a non proxied address with `setAddress()`', async () => {
    const {addressProvider, admin} = await setupFixture();
    const {INVALID_OWNER_REVERT_MSG} = ProtocolErrors;

    const mockNonProxiedAddress = (await getUnnamedAccounts())[0];
    const nonProxiedAddressId = utils.keccak256(utils.toUtf8Bytes('RANDOM_NON_PROXIED'));

    const nonProxiedAddressSetReceipt = await waitForTx(
      await admin.addressProvider.setAddress(nonProxiedAddressId, mockNonProxiedAddress)
    );

    expect(mockNonProxiedAddress.toLowerCase()).to.be.equal(
      (await addressProvider.getAddress(nonProxiedAddressId)).toLowerCase()
    );

    if (!nonProxiedAddressSetReceipt.events || nonProxiedAddressSetReceipt.events?.length < 1) {
      throw new Error('INVALID_EVENT_EMMITED');
    }

    expect(nonProxiedAddressSetReceipt.events[0].event).to.be.equal('AddressSet');
    expect(nonProxiedAddressSetReceipt.events[0].args?.id).to.be.equal(nonProxiedAddressId);
    expect(nonProxiedAddressSetReceipt.events[0].args?.newAddress).to.be.equal(mockNonProxiedAddress);
    expect(nonProxiedAddressSetReceipt.events[0].args?.hasProxy).to.be.equal(false);
  });
});
