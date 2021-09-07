// import {expect, use} from 'chai';
// import {waffleChai} from '@ethereum-waffle/chai';
// import {setupFixture} from '../helpers/test-helpers';
// import {_TypedDataEncoder, parseEther} from 'ethers/lib/utils'
// import hre, {ethers} from 'hardhat'
// import {MAX_UINT_AMOUNT, ZERO_ADDRESS} from '../helpers/constants';
// import {waitForTx} from '../utils/hhNetwork';

// use(waffleChai);

// describe('AToken: Permit', () => {
//   it('Checks the domain separator', async () => {
//     const {aToken} = await setupFixture();
//     const separator = await aToken.DAI.DOMAIN_SEPARATOR();

//     const domain = {
//       name: await aToken.DAI.name(),
//       version: '1',
//       chainId: hre.network.config.chainId,
//       verifyingContract: aToken.DAI.address,
//     };
//     const domainSeparator = _TypedDataEncoder.hashDomain(domain);

//     expect(separator).to.be.equal(domainSeparator, 'Invalid domain separator');
//   });

//   it('Get aDAI for tests', async () => {
//     const {DAI, lendingPool, deployer} = await setupFixture();

//     await DAI.mint(parseEther('20000'));
//     await DAI.approve(lendingPool.address, parseEther('20000'));

//     await lendingPool.deposit(DAI.address, parseEther('20000'), deployer.address, 0);
//   });

//   it('Reverts submitting a permit with 0 expiration', async () => {
//     const {aToken, deployer, user1} = await setupFixture();
//     const owner = deployer;
//     const spender = user1;

//     const tokenName = await aToken.DAI.name();

//     const chainId = hre.network.config.chainId || BUIDLEREVM_CHAINID;
//     const expiration = 0;
//     const nonce = (await aToken.DAI._nonces(owner.address)).toNumber();
//     const permitAmount = parseEther('2').toString();
//     const msgParams = buildPermitParams(
//       chainId,
//       aToken.DAI.address,
//       '1',
//       tokenName,
//       owner.address,
//       spender.address,
//       nonce,
//       permitAmount,
//       expiration.toFixed()
//     );

//     const ownerPrivateKey = require('../../test-wallets.js').accounts[0].secretKey;
//     if (!ownerPrivateKey) {
//       throw new Error('INVALID_OWNER_PK');
//     }

//     expect((await aToken.DAI.allowance(owner.address, spender.address)).toString()).to.be.equal(
//       '0',
//       'INVALID_ALLOWANCE_BEFORE_PERMIT'
//     );

//     const {v, r, s} = getSignatureFromTypedData(ownerPrivateKey, msgParams);

//     await expect(
//       aToken.DAI
//         .connect(await ethers.getSigner(spender.address))
//         .permit(owner.address, spender.address, permitAmount, expiration, v, r, s)
//     ).to.be.revertedWith('INVALID_EXPIRATION');

//     expect((await aToken.DAI.allowance(owner.address, spender.address)).toString()).to.be.equal(
//       '0',
//       'INVALID_ALLOWANCE_AFTER_PERMIT'
//     );
//   });

//   it('Submits a permit with maximum expiration length', async () => {
//     const {aToken, deployer, user1} = await setupFixture();
//     const owner = deployer;
//     const spender = user1;

//     const chainId = hre.network.config.chainId || BUIDLEREVM_CHAINID;
//     const deadline = MAX_UINT_AMOUNT;
//     const nonce = (await aToken.DAI._nonces(owner.address)).toNumber();
//     const permitAmount = parseEther('2').toString();
//     const msgParams = buildPermitParams(
//       chainId,
//       aToken.DAI.address,
//       '1',
//       await aToken.DAI.name(),
//       owner.address,
//       spender.address,
//       nonce,
//       deadline,
//       permitAmount
//     );

//     const ownerPrivateKey = require('../../test-wallets.js').accounts[0].secretKey;
//     if (!ownerPrivateKey) {
//       throw new Error('INVALID_OWNER_PK');
//     }

//     expect((await aToken.DAI.allowance(owner.address, spender.address)).toString()).to.be.equal(
//       '0',
//       'INVALID_ALLOWANCE_BEFORE_PERMIT'
//     );

//     const {v, r, s} = getSignatureFromTypedData(ownerPrivateKey, msgParams);

//     await waitForTx(
//       await aToken.DAI
//         .connect(await ethers.getSigner(spender.address))
//         .permit(owner.address, spender.address, permitAmount, deadline, v, r, s)
//     );

//     expect((await aToken.DAI._nonces(owner.address)).toNumber()).to.be.equal(1);
//   });

//   it('Cancels the previous permit', async () => {
//     const {aToken, deployer, user1} = await setupFixture();
//     const owner = deployer;
//     const spender = user1;

//     const chainId = hre.network.config.chainId || BUIDLEREVM_CHAINID;
//     const deadline = MAX_UINT_AMOUNT;
//     const nonce = (await aToken.DAI._nonces(owner.address)).toNumber();
//     const permitAmount = '0';
//     const msgParams = buildPermitParams(
//       chainId,
//       aToken.DAI.address,
//       '1',
//       await aToken.DAI.name(),
//       owner.address,
//       spender.address,
//       nonce,
//       deadline,
//       permitAmount
//     );

//     const ownerPrivateKey = require('../../test-wallets.js').accounts[0].secretKey;
//     if (!ownerPrivateKey) {
//       throw new Error('INVALID_OWNER_PK');
//     }

//     const {v, r, s} = getSignatureFromTypedData(ownerPrivateKey, msgParams);

//     expect((await aToken.DAI.allowance(owner.address, spender.address)).toString()).to.be.equal(
//       ethers.utils.parseEther('2'),
//       'INVALID_ALLOWANCE_BEFORE_PERMIT'
//     );

//     await waitForTx(
//       await aToken.DAI
//         .connect(await ethers.getSigner(spender.address))
//         .permit(owner.address, spender.address, permitAmount, deadline, v, r, s)
//     );
//     expect((await aToken.DAI.allowance(owner.address, spender.address)).toString()).to.be.equal(
//       permitAmount,
//       'INVALID_ALLOWANCE_AFTER_PERMIT'
//     );

//     expect((await aToken.DAI._nonces(owner.address)).toNumber()).to.be.equal(2);
//   });

//   it('Tries to submit a permit with invalid nonce', async () => {
//     const {aToken, deployer, user1} = await setupFixture();
//     const owner = deployer;
//     const spender = user1;

//     const chainId = hre.network.config.chainId || BUIDLEREVM_CHAINID;
//     const deadline = MAX_UINT_AMOUNT;
//     const nonce = 1000;
//     const permitAmount = '0';
//     const msgParams = buildPermitParams(
//       chainId,
//       aToken.DAI.address,
//       '1',
//       await aToken.DAI.name(),
//       owner.address,
//       spender.address,
//       nonce,
//       deadline,
//       permitAmount
//     );

//     const ownerPrivateKey = require('../../test-wallets.js').accounts[0].secretKey;
//     if (!ownerPrivateKey) {
//       throw new Error('INVALID_OWNER_PK');
//     }

//     const {v, r, s} = getSignatureFromTypedData(ownerPrivateKey, msgParams);

//     await expect(
//       await aToken.DAI
//         .connect(await ethers.getSigner(spender.address))
//         .permit(owner.address, spender.address, permitAmount, deadline, v, r, s)
//     ).to.be.revertedWith('INVALID_SIGNATURE');
//   });

//   it('Tries to submit a permit with invalid expiration (previous to the current block)', async () => {
//     const {aToken, deployer, user1} = await setupFixture();
//     const owner = deployer;
//     const spender = user1;

//     const chainId = hre.network.config.chainId || BUIDLEREVM_CHAINID;
//     const expiration = '1';
//     const nonce = (await aToken.DAI._nonces(owner.address)).toNumber();
//     const permitAmount = '0';
//     const msgParams = buildPermitParams(
//       chainId,
//       aToken.DAI.address,
//       '1',
//       await aToken.DAI.name(),
//       owner.address,
//       spender.address,
//       nonce,
//       expiration,
//       permitAmount
//     );

//     const ownerPrivateKey = require('../../test-wallets.js').accounts[0].secretKey;
//     if (!ownerPrivateKey) {
//       throw new Error('INVALID_OWNER_PK');
//     }

//     const {v, r, s} = getSignatureFromTypedData(ownerPrivateKey, msgParams);

//     await expect(
//       await aToken.DAI
//         .connect(await ethers.getSigner(spender.address))
//         .permit(owner.address, spender.address, expiration, permitAmount, v, r, s)
//     ).to.be.revertedWith('INVALID_EXPIRATION');
//   });

//   it('Tries to submit a permit with invalid signature', async () => {
//     const {aToken, deployer, user1} = await setupFixture();
//     const owner = deployer;
//     const spender = user1;

//     const chainId = hre.network.config.chainId || BUIDLEREVM_CHAINID;
//     const deadline = MAX_UINT_AMOUNT;
//     const nonce = (await aToken.DAI._nonces(owner.address)).toNumber();
//     const permitAmount = '0';
//     const msgParams = buildPermitParams(
//       chainId,
//       aToken.DAI.address,
//       '1',
//       await aToken.DAI.name(),
//       owner.address,
//       spender.address,
//       nonce,
//       deadline,
//       permitAmount
//     );

//     const ownerPrivateKey = require('../../test-wallets.js').accounts[0].secretKey;
//     if (!ownerPrivateKey) {
//       throw new Error('INVALID_OWNER_PK');
//     }

//     const {v, r, s} = getSignatureFromTypedData(ownerPrivateKey, msgParams);

//     await expect(
//       await aToken.DAI
//         .connect(await ethers.getSigner(spender.address))
//         .permit(owner.address, ZERO_ADDRESS, permitAmount, deadline, v, r, s)
//     ).to.be.revertedWith('INVALID_SIGNATURE');
//   });

//   it('Tries to submit a permit with invalid owner', async () => {
//     const {aToken, deployer, user1} = await setupFixture();
//     const owner = deployer;
//     const spender = user1;

//     const chainId = hre.network.config.chainId || BUIDLEREVM_CHAINID;
//     const expiration = MAX_UINT_AMOUNT;
//     const nonce = (await aToken.DAI._nonces(owner.address)).toNumber();
//     const permitAmount = '0';
//     const msgParams = buildPermitParams(
//       chainId,
//       aToken.DAI.address,
//       '1',
//       await aToken.DAI.name(),
//       owner.address,
//       spender.address,
//       nonce,
//       expiration,
//       permitAmount
//     );

//     const ownerPrivateKey = require('../../test-wallets.js').accounts[0].secretKey;
//     if (!ownerPrivateKey) {
//       throw new Error('INVALID_OWNER_PK');
//     }

//     const {v, r, s} = getSignatureFromTypedData(ownerPrivateKey, msgParams);

//     await expect(
//       await aToken.DAI
//         .connect(await ethers.getSigner(spender.address))
//         .permit(ZERO_ADDRESS, spender.address, expiration, permitAmount, v, r, s)
//     ).to.be.revertedWith('INVALID_OWNER');
//   });
// });
