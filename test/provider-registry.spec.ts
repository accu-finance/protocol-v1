import {waffleChai} from '@ethereum-waffle/chai';
import {expect, use} from 'chai';
import {constants} from 'ethers';
import {getUnnamedAccounts} from 'hardhat';
import {ProtocolErrors} from '../types';
import {waitForTx} from '../utils/hhNetwork';
import setupFixture from '../utils/setupFixture';

const {AddressZero} = constants;

use(waffleChai);

describe('ProviderRegistry', () => {
  it('Checks the address provider is added to the providerRegistry', async () => {
    const {addressProvider, providerRegistry} = await setupFixture();

    const providers = await providerRegistry.getAddressProvidersList();

    expect(providers.length).to.be.equal(1, 'Invalid length of the address providers list');
    expect(providers[0].toString()).to.be.equal(addressProvider.address, ' Invalid address provider added to the list');
  });

  it('tries to register an address provider with id 0', async () => {
    const {providerRegistry, user1} = await setupFixture();
    const {PR_INVALID_ADDRESSES_PROVIDER_ID} = ProtocolErrors;

    await expect(providerRegistry.registerAddressProvider(user1.address, '0')).to.be.revertedWith(
      PR_INVALID_ADDRESSES_PROVIDER_ID
    );
  });

  it('register and unregister new address', async () => {
    const {providerRegistry, addressProvider: addressProvider, user1} = await setupFixture();

    //simulating an address provider using the users[1] wallet address
    await providerRegistry.registerAddressProvider(user1.address, '2');

    let providers = await providerRegistry.getAddressProvidersList();

    expect(providers.length).to.be.equal(2, 'Invalid length of the address providers list');
    expect(providers[1].toString()).to.be.equal(user1.address, ' Invalid address provider added to the list');

    const id = await providerRegistry.getAddressProviderIdByAddress(user1.address);

    expect(id).to.be.equal('2', 'Invalid isRegistered return value');

    await providerRegistry.unregisterAddressProvider(user1.address);

    providers = await providerRegistry.getAddressProvidersList();

    expect(providers.length).to.be.equal(2, 'Invalid length of the address providers list');
    expect(providers[0].toString()).to.be.equal(addressProvider.address, ' Invalid address provider added to the list');
    expect(providers[1].toString()).to.be.equal(AddressZero, ' Invalid addresses');
  });

  it('Tries to remove a unregistered addressProvider', async () => {
    const {PR_PROVIDER_NOT_REGISTERED} = ProtocolErrors;

    const {user2, providerRegistry} = await setupFixture();

    await expect(providerRegistry.unregisterAddressProvider(user2.address)).to.be.revertedWith(
      PR_PROVIDER_NOT_REGISTERED
    );
  });

  it('Tries to remove a unregistered addressProvider', async () => {
    const {PR_PROVIDER_NOT_REGISTERED} = ProtocolErrors;

    const {providerRegistry, user2} = await setupFixture();

    await expect(providerRegistry.unregisterAddressProvider(user2.address)).to.be.revertedWith(
      PR_PROVIDER_NOT_REGISTERED
    );
  });

  it('Tries to add an already added addressProvider with a different id. Should overwrite the previous id', async () => {
    const {providerRegistry, addressProvider} = await setupFixture();

    await providerRegistry.registerAddressProvider(addressProvider.address, '2');

    let providers = await providerRegistry.getAddressProvidersList();
    const id = await providerRegistry.getAddressProviderIdByAddress(addressProvider.address);
    expect(id).to.be.equal(2, 'id should be updated to a newer version');
    expect(providers.length).to.be.equal(1, 'Invalid length of the address providers list');

    const anotherAddress = (await getUnnamedAccounts())[0];
    await waitForTx(await providerRegistry.registerAddressProvider(anotherAddress, '1'));
    await waitForTx(await providerRegistry.unregisterAddressProvider(anotherAddress));

    providers = await providerRegistry.getAddressProvidersList();
    expect(providers.length).to.be.equal(2, 'Invalid length of the address providers list');
    expect(providers[0].toString()).to.be.equal(addressProvider.address, ' Invalid address provider added to the list');
    expect(providers[1].toString()).to.be.equal(AddressZero, ' Invalid addresses');
  });
});
