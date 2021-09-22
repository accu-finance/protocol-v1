import {waffleChai} from '@ethereum-waffle/chai';
import {TypedDataDomain} from '@ethersproject/abstract-signer';
import {expect, use} from 'chai';
import {BigNumber, constants, utils} from 'ethers';
import {_TypedDataEncoder} from 'ethers/lib/utils';
import {Fixture} from '../types';
import convertToCurrencyDecimals from '../utils/convertToCurrencyDecimals';
import {deposit, mint} from '../utils/protocolTx';
import setupFixture from '../utils/setupFixture';

const {Zero, MaxUint256, AddressZero} = constants;

use(waffleChai);

describe('AToken DAI: Permit', () => {
  const fixture = {} as Fixture;
  let domain: TypedDataDomain;
  const permitTypes = {
    Permit: [
      {name: 'owner', type: 'address'},
      {name: 'spender', type: 'address'},
      {name: 'value', type: 'uint256'},
      {name: 'nonce', type: 'uint256'},
      {name: 'deadline', type: 'uint256'},
    ],
  };
  const dashboardEnabled = false;

  before(async () => {
    Object.assign(fixture, await setupFixture());
    const {chainId, aToken} = fixture;
    domain = {
      name: await aToken.DAI.name(),
      version: '1',
      chainId: chainId,
      verifyingContract: aToken.DAI.address,
    };
  });

  it('checks the domain separator', async () => {
    const {aToken} = fixture;
    const separator = await aToken.DAI.DOMAIN_SEPARATOR();
    const domainSeparator = _TypedDataEncoder.hashDomain(domain);
    expect(separator).to.be.equal(domainSeparator, 'Invalid domain separator');
  });

  it('user1 deposits 1000 DAI; gets 1000 aDAI', async () => {
    const {asset, user1} = fixture;
    await mint(asset.DAI, '1000', user1);
    await deposit(asset.DAI, '1000', user1, user1, {dashboardEnabled});
  });

  it('reverted: spender submits a permit with 0 expiration', async () => {
    const {aToken, user1, user2} = fixture;
    const owner = user1.address;
    const spender = user2.address;
    const expiration = Zero;
    const nonce = await aToken.DAI._nonces(owner);
    const permitAmount = await convertToCurrencyDecimals(aToken.DAI, '2');
    const value = {
      owner,
      spender,
      value: permitAmount,
      nonce,
      deadline: expiration,
    };
    const sig = await user1.signer._signTypedData(domain, permitTypes, value);
    const {r, s, v} = utils.splitSignature(sig);

    expect(await aToken.DAI.allowance(owner, spender)).to.be.equal(Zero, 'INVALID_ALLOWANCE_BEFORE_PERMIT');
    await expect(user2.aToken.DAI.permit(owner, spender, permitAmount, expiration, v, r, s)).to.be.revertedWith(
      'INVALID_EXPIRATION'
    );
    expect(await aToken.DAI.allowance(owner, spender)).to.be.equal(Zero, 'INVALID_ALLOWANCE_AFTER_PERMIT');
  });

  it('spender submits a permit with max expiration', async () => {
    const {aToken, user1, user2} = fixture;
    const owner = user1.address;
    const spender = user2.address;
    const expiration = MaxUint256;
    const nonce = await aToken.DAI._nonces(owner);
    const permitAmount = await convertToCurrencyDecimals(aToken.DAI, '2');
    const value = {
      owner,
      spender,
      value: permitAmount,
      nonce,
      deadline: expiration,
    };
    const sig = await user1.signer._signTypedData(domain, permitTypes, value);
    const {r, s, v} = utils.splitSignature(sig);

    expect(await aToken.DAI.allowance(owner, spender)).to.be.equal(Zero, 'INVALID_ALLOWANCE_BEFORE_PERMIT');
    await expect(user2.aToken.DAI.permit(owner, spender, permitAmount, expiration, v, r, s)).not.to.be.reverted;
    expect(await aToken.DAI.allowance(owner, spender)).to.be.equal(permitAmount, 'INVALID_ALLOWANCE_AFTER_PERMIT');
    expect(await aToken.DAI._nonces(owner)).to.be.equal(BigNumber.from(1));
  });

  it('spender cancels the previus permit', async () => {
    const {aToken, user1, user2} = fixture;
    const owner = user1.address;
    const spender = user2.address;
    const expiration = MaxUint256;
    const nonce = await aToken.DAI._nonces(owner);
    const permitAmount = await convertToCurrencyDecimals(aToken.DAI, '0');
    const value = {
      owner,
      spender,
      value: permitAmount,
      nonce,
      deadline: expiration,
    };
    const sig = await user1.signer._signTypedData(domain, permitTypes, value);
    const {r, s, v} = utils.splitSignature(sig);

    expect(await aToken.DAI.allowance(owner, spender)).to.be.equal(
      await convertToCurrencyDecimals(aToken.DAI, '2'),
      'INVALID_ALLOWANCE_BEFORE_PERMIT'
    );
    await expect(user2.aToken.DAI.permit(owner, spender, permitAmount, expiration, v, r, s)).not.to.be.reverted;
    expect(await aToken.DAI.allowance(owner, spender)).to.be.equal(permitAmount, 'INVALID_ALLOWANCE_AFTER_PERMIT');
    expect(await aToken.DAI._nonces(owner)).to.be.equal(BigNumber.from(2));
  });

  it('reverted: spender submits a permit with invalid nonce', async () => {
    const {aToken, user1, user2} = fixture;
    const owner = user1.address;
    const spender = user2.address;
    const expiration = MaxUint256;
    const nonce = Zero;
    const permitAmount = await convertToCurrencyDecimals(aToken.DAI, '2');
    const value = {
      owner,
      spender,
      value: permitAmount,
      nonce,
      deadline: expiration,
    };
    const sig = await user1.signer._signTypedData(domain, permitTypes, value);
    const {r, s, v} = utils.splitSignature(sig);

    expect(await aToken.DAI.allowance(owner, spender)).to.be.equal(Zero, 'INVALID_ALLOWANCE_BEFORE_PERMIT');
    await expect(user2.aToken.DAI.permit(owner, spender, permitAmount, expiration, v, r, s)).to.be.revertedWith(
      'INVALID_SIGNATURE'
    );
    expect(await aToken.DAI.allowance(owner, spender)).to.be.equal(Zero, 'INVALID_ALLOWANCE_AFTER_PERMIT');
  });

  it('reverted: spender submits a permit with invalid expiration (previous block)', async () => {
    const {aToken, user1, user2} = fixture;
    const owner = user1.address;
    const spender = user2.address;
    const expiration = BigNumber.from(1);
    const nonce = await aToken.DAI._nonces(owner);
    const permitAmount = await convertToCurrencyDecimals(aToken.DAI, '2');
    const value = {
      owner,
      spender,
      value: permitAmount,
      nonce,
      deadline: expiration,
    };
    const sig = await user1.signer._signTypedData(domain, permitTypes, value);
    const {r, s, v} = utils.splitSignature(sig);

    expect(await aToken.DAI.allowance(owner, spender)).to.be.equal(Zero, 'INVALID_ALLOWANCE_BEFORE_PERMIT');
    await expect(user2.aToken.DAI.permit(owner, spender, permitAmount, expiration, v, r, s)).to.be.revertedWith(
      'INVALID_EXPIRATION'
    );
    expect(await aToken.DAI.allowance(owner, spender)).to.be.equal(Zero, 'INVALID_ALLOWANCE_AFTER_PERMIT');
  });

  it('reverted: spender submits a permit with invalid spender', async () => {
    const {aToken, user1, user2} = fixture;
    const owner = user1.address;
    const spender = user2.address;
    const expiration = MaxUint256;
    const nonce = await aToken.DAI._nonces(owner);
    const permitAmount = await convertToCurrencyDecimals(aToken.DAI, '2');
    const value = {
      owner,
      spender,
      value: permitAmount,
      nonce,
      deadline: expiration,
    };
    const sig = await user1.signer._signTypedData(domain, permitTypes, value);
    const {r, s, v} = utils.splitSignature(sig);

    expect(await aToken.DAI.allowance(owner, spender)).to.be.equal(Zero, 'INVALID_ALLOWANCE_BEFORE_PERMIT');
    await expect(user2.aToken.DAI.permit(owner, AddressZero, permitAmount, expiration, v, r, s)).to.be.revertedWith(
      'INVALID_SIGNATURE'
    );
    expect(await aToken.DAI.allowance(owner, spender)).to.be.equal(Zero, 'INVALID_ALLOWANCE_AFTER_PERMIT');
  });

  it('reverted: spender submits a permit with invalid owner', async () => {
    const {aToken, user1, user2} = fixture;
    const owner = user1.address;
    const spender = user2.address;
    const expiration = MaxUint256;
    const nonce = await aToken.DAI._nonces(owner);
    const permitAmount = await convertToCurrencyDecimals(aToken.DAI, '2');
    const value = {
      owner,
      spender,
      value: permitAmount,
      nonce,
      deadline: expiration,
    };
    const sig = await user1.signer._signTypedData(domain, permitTypes, value);
    const {r, s, v} = utils.splitSignature(sig);

    expect(await aToken.DAI.allowance(owner, spender)).to.be.equal(Zero, 'INVALID_ALLOWANCE_BEFORE_PERMIT');
    await expect(user2.aToken.DAI.permit(AddressZero, spender, permitAmount, expiration, v, r, s)).to.be.revertedWith(
      'INVALID_OWNER'
    );
    expect(await aToken.DAI.allowance(owner, spender)).to.be.equal(Zero, 'INVALID_ALLOWANCE_AFTER_PERMIT');
  });
});
