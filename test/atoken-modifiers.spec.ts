import {waffleChai} from '@ethereum-waffle/chai';
import {expect, use} from 'chai';
import {ProtocolErrors} from '../types';
import setupFixture from '../utils/setupFixture';
use(waffleChai);

describe('AToken: Modifiers', () => {
  const {CT_CALLER_MUST_BE_LENDING_POOL} = ProtocolErrors;

  it('reverted: only lending pool allowed to mint', async () => {
    const {deployer, aToken} = await setupFixture();

    await expect(aToken.DAI.mint(deployer.address, '1', '1')).to.be.revertedWith(CT_CALLER_MUST_BE_LENDING_POOL);
  });

  it('reverted: only lending pool allowed to burn', async () => {
    const {deployer, aToken} = await setupFixture();

    await expect(aToken.DAI.burn(deployer.address, deployer.address, '1', '1')).to.be.revertedWith(
      CT_CALLER_MUST_BE_LENDING_POOL
    );
  });

  it('reverted: only lending pool allowed to transferOnLiquidation', async () => {
    const {deployer, user1, aToken} = await setupFixture();

    await expect(aToken.DAI.transferOnLiquidation(deployer.address, user1.address, '1')).to.be.revertedWith(
      CT_CALLER_MUST_BE_LENDING_POOL
    );
  });

  it('reverted: only lending pool allowed to transferUnderlyingTo', async () => {
    const {deployer, aToken} = await setupFixture();

    await expect(aToken.DAI.transferUnderlyingTo(deployer.address, '1')).to.be.revertedWith(
      CT_CALLER_MUST_BE_LENDING_POOL
    );
  });
});
