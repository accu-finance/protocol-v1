import {waffleChai} from '@ethereum-waffle/chai';
import {parseEther} from '@ethersproject/units';
import {expect, use} from 'chai';
import {constants, utils} from 'ethers';
import {ethers} from 'hardhat';
import {YEAR} from '../constants';
import {Fixture, MarketProvider, ProtocolErrors, RateMode} from '../types';
import {deploySelfdestructTansfer} from '../utils/contractDeployer';
import convertToCurrencyDecimals from '../utils/convertToCurrencyDecimals';
import {waitForTx} from '../utils/hhNetwork';
import {borrowETH, deposit, depositETH, mint, repayETH, transfer, withdrawETH} from '../utils/protocolTx';
import setupFixture from '../utils/setupFixture';

const {VL_INVALID_AMOUNT} = ProtocolErrors;

const {Zero} = constants;

use(waffleChai);

(process.env.PROVIDER_ID === MarketProvider.EthereumMain ? describe : describe.skip)(
  'WETHGateway: allow deposit, withdraw, stable rate borrow, repay using native ETH by LendingPool',
  function () {
    const fixture = {} as Fixture;
    const dashboardEnabled = false;

    before(async () => {
      Object.assign(fixture, await setupFixture());
    });

    it('user1 deposits 5 ETH and gets 5 aWETH', async () => {
      const {user1} = fixture;

      await depositETH('5', user1, user1, {dashboardEnabled});
    });

    it('user2 deposits 1000 DAI', async () => {
      const {user2, asset} = fixture;

      await mint(asset.DAI, '1000', user2);
      await deposit(asset.DAI, '1000', user2, user2, {dashboardEnabled});
    });

    it('reverted: user1 withdraws 0 ETH', async () => {
      const {user1} = fixture;

      await withdrawETH('0', user1, user1, {dashboardEnabled, expectedResult: {revertMessage: VL_INVALID_AMOUNT}});
    });

    it('user2 borrows ETH via delegateApprove at stable rate with deposited DAI as collateral', async () => {
      const {user2} = fixture;

      await borrowETH('1', user2, user2, RateMode.Stable, {dashboardEnabled, timeTravel: 1 * YEAR});
    });

    it('user2 repay ETH + interest', async () => {
      const {user2} = fixture;
      await repayETH('-1', user2, user2, RateMode.Stable, {dashboardEnabled});
    });

    it('user1 withdraws some amount of ETH', async () => {
      const {user1} = fixture;

      await withdrawETH('2.5', user1, user1, {dashboardEnabled});
    });

    it('user1 withdraws full amount of ETH', async () => {
      const {user1} = fixture;

      await withdrawETH('-1', user1, user1, {dashboardEnabled});
    });
  }
);

(process.env.PROVIDER_ID === MarketProvider.EthereumMain ? describe : describe.skip)(
  'WETHGateway: allow deposit, withdraw, variable rate borrow, repay using native ETH by LendingPool',
  () => {
    const fixture = {} as Fixture;
    const dashboardEnabled = false;

    before(async () => {
      Object.assign(fixture, await setupFixture());
    });

    it('user1 deposits 5 ETH and gets 5 aWETH', async () => {
      const {user1} = fixture;

      await depositETH('5', user1, user1, {dashboardEnabled});
    });

    it('user2 deposits 1000 DAI', async () => {
      const {user2, asset} = fixture;

      await mint(asset.DAI, '1000', user2);
      await deposit(asset.DAI, '1000', user2, user2, {dashboardEnabled});
    });

    it('reverted: user1 withdraws 0 ETH', async () => {
      const {user1} = fixture;

      await withdrawETH('0', user1, user1, {dashboardEnabled, expectedResult: {revertMessage: VL_INVALID_AMOUNT}});
    });

    it('user2 borrows ETH via delegateApprove at variable rate with deposited DAI as collateral', async () => {
      const {user2} = fixture;

      await borrowETH('1', user2, user2, RateMode.Variable, {dashboardEnabled, timeTravel: 1 * YEAR});
    });

    it('user2 repay ETH + interest', async () => {
      const {user2} = fixture;
      await repayETH('-1', user2, user2, RateMode.Variable, {dashboardEnabled});
    });

    it('user1 withdraws some amount of ETH', async () => {
      const {user1} = fixture;

      await withdrawETH('2.5', user1, user1, {dashboardEnabled});
    });

    it('user1 withdraws full amount of ETH', async () => {
      const {user1} = fixture;

      await withdrawETH('-1', user1, user1, {dashboardEnabled});
    });
  }
);

(process.env.PROVIDER_ID === MarketProvider.EthereumMain ? describe : describe.skip)(
  'WETHGateway: receive and fallback function',
  () => {
    it('reverted: call receive function with ETH', async () => {
      const {user1, wGateway} = await setupFixture();
      const amount = parseEther('1');

      await expect(
        user1.wGateway.signer.sendTransaction({
          to: wGateway.address,
          value: amount,
        })
      ).to.be.revertedWith('Receive not allowed');
    });

    it('reverted: call fallback function', async () => {
      const {user1, wGateway: wGateway} = await setupFixture();
      const amount = parseEther('1');

      const mockABI = ['function mockFunction()'];
      const abiCoder = new utils.Interface(mockABI);
      const mockFunctionEncoded = abiCoder.encodeFunctionData('mockFunction', []);

      await expect(
        user1.wGateway.signer.sendTransaction({
          to: wGateway.address,
          data: mockFunctionEncoded,
          value: amount,
        })
      ).to.be.revertedWith('Fallback not allowed');
    });
  }
);

(process.env.PROVIDER_ID === MarketProvider.EthereumMain ? describe : describe.skip)(
  'WETHGateway: owner function',
  () => {
    it('Only owner can perform emergency ETH transfer', async () => {
      const {deployer, user1, user2, wGateway} = await setupFixture();
      const amount = parseEther('1');
      const signer = await ethers.getSigner(user1.address);
      const userBalanceBefore = await signer.getBalance();

      const wGatewaySigner = await ethers.getSigner(wGateway.address);
      const wGatewayBalanceBefore = await wGatewaySigner.getBalance();

      //deploy mock contract
      const selfdestructTransfer = await deploySelfdestructTansfer();

      //call selfdestruct and transfer to wGateway
      const tx = await selfdestructTransfer
        .connect(await ethers.getSigner(user1.address))
        .destroyAndTransfer(wGateway.address, {value: amount});
      const {gasUsed} = await waitForTx(tx);
      const gasFee = gasUsed.mul(tx.gasPrice || Zero);
      const userBalanceAfter = await signer.getBalance();
      const wGatewayBalanceAfter = await wGatewaySigner.getBalance();

      expect(userBalanceAfter).to.be.eq(userBalanceBefore.sub(amount).sub(gasFee));
      expect(wGatewayBalanceAfter).to.be.eq(wGatewayBalanceBefore.add(amount));

      await expect(user2.wGateway.emergencyEtherTransfer(user2.address, amount)).to.be.reverted;

      //recover funds from calling selfdestruct
      await deployer.wGateway.emergencyEtherTransfer(user1.address, amount);
      const userBalanceAfterRecover = await signer.getBalance();
      const wGatewayBalanceAfterRecover = await wGatewaySigner.getBalance();

      expect(userBalanceAfterRecover).to.be.eq(userBalanceAfter.add(amount));
      expect(wGatewayBalanceAfterRecover).to.be.eq(wGatewayBalanceAfter.sub(amount));
    });

    it('Only owner can perform emergency token transfer', async () => {
      const {deployer, user1, user2, asset, wGateway: wGateway} = await setupFixture();
      const amount = await convertToCurrencyDecimals(asset.DAI, '1000');
      await mint(asset.DAI, '1000', user1);
      const userBalanceBefore = await asset.DAI.balanceOf(user1.address);
      const wGatewayBalanceBefore = await asset.DAI.balanceOf(wGateway.address);

      await transfer(asset.DAI, user1, '1000', wGateway.address);
      const userBalanceAfter = await asset.DAI.balanceOf(user1.address);
      const wGatewayBalanceAfter = await asset.DAI.balanceOf(wGateway.address);

      expect(userBalanceAfter).to.be.eq(userBalanceBefore.sub(amount));
      expect(wGatewayBalanceAfter).to.be.eq(wGatewayBalanceBefore.add(amount));

      await expect(user2.wGateway.emergencyTokenTransfer(asset.DAI.address, user2.address, amount)).to.be.reverted;

      await deployer.wGateway.emergencyTokenTransfer(asset.DAI.address, user1.address, amount);
      const userBalanceAfterRecover = await asset.DAI.balanceOf(user1.address);
      const wGatewayBalanceAfterRecover = await asset.DAI.balanceOf(wGateway.address);

      expect(userBalanceAfterRecover).to.be.eq(userBalanceAfter.add(amount));
      expect(wGatewayBalanceAfterRecover).to.be.eq(wGatewayBalanceAfter.sub(amount));
    });
  }
);
