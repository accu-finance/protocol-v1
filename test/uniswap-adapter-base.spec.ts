import {waffleChai} from '@ethereum-waffle/chai';
import {expect, use} from 'chai';
import {BigNumber} from 'ethers';
import {parseEther} from 'ethers/lib/utils';
import convertToCurrencyDecimals from '../utils/convertToCurrencyDecimals';
import setupFixture from '../utils/setupFixture';

use(waffleChai);

const calcUsdValue = function (
  amount: BigNumber,
  price: BigNumber,
  decimals: number,
  ethUsdPrice: BigNumber
): BigNumber {
  return amount.mul(price).div(BigNumber.from(10).pow(decimals)).mul(ethUsdPrice).div(BigNumber.from(10).pow(18));
};

describe('UniswapAdapter: getAmountsIn, getAmountsOut', () => {
  it('getAmountsOut: WETH-DAI', async () => {
    const {
      mockUniswapRouter,
      uniswapLiquiditySwapAdapter,
      asset,
      priceOracle,
      lendingPool,
      marketConfig,
    } = await setupFixture();
    const flashloanPremium = await lendingPool.FLASHLOAN_PREMIUM_TOTAL();

    const amountIn = parseEther('1');
    const amountToSwap = amountIn.sub(amountIn.percentMul(flashloanPremium));

    const priceWETH = await priceOracle.getAssetPrice(asset.WNATIVE.address);
    const priceDAI = await priceOracle.getAssetPrice(asset.DAI.address);
    const priceUSD = await priceOracle.getAssetPrice(marketConfig.protocolGlobalConfig.priceUSDAddress);
    const decimalsWETH = await asset.WNATIVE.decimals();
    const decimalsDAI = await asset.DAI.decimals();

    const amountOut = await convertToCurrencyDecimals(asset.DAI, amountToSwap.div(priceDAI).toString());
    const outPerInPrice = amountToSwap
      .mul(BigNumber.from(10).pow(decimalsDAI))
      .wadDiv(amountOut.mul(BigNumber.from(10).pow(decimalsWETH)));
    const ethUsdValue = calcUsdValue(amountIn, priceWETH, decimalsWETH, priceUSD);
    const daiUsdValue = calcUsdValue(amountOut, priceDAI, decimalsDAI, priceUSD);

    await mockUniswapRouter.setAmountOut(amountToSwap, asset.WNATIVE.address, asset.DAI.address, amountOut);

    const result = await uniswapLiquiditySwapAdapter.getAmountsOut(amountIn, asset.WNATIVE.address, asset.DAI.address);
    expect(result[0]).to.be.almostEqualOrEqual(amountOut);
    expect(result[1]).to.be.almostEqualOrEqual(outPerInPrice);
    expect(result[2]).to.be.almostEqualOrEqual(ethUsdValue);
    expect(result[3]).to.be.almostEqualOrEqual(daiUsdValue);
  });

  it('getAmountsOut: WETH-USDC', async () => {
    const {
      mockUniswapRouter,
      uniswapLiquiditySwapAdapter,
      asset,
      priceOracle,
      lendingPool,
      marketConfig: poolConfig,
    } = await setupFixture();
    const flashloanPremium = await lendingPool.FLASHLOAN_PREMIUM_TOTAL();

    const amountIn = parseEther('1');
    const amountToSwap = amountIn.sub(amountIn.percentMul(flashloanPremium));

    const priceWETH = await priceOracle.getAssetPrice(asset.WNATIVE.address);
    const priceUSDC = await priceOracle.getAssetPrice(asset.USDC.address);
    const priceUSD = await priceOracle.getAssetPrice(poolConfig.protocolGlobalConfig.priceUSDAddress);
    const decimalsWETH = await asset.WNATIVE.decimals();
    const decimalsUSDC = await asset.USDC.decimals();

    const amountOut = await convertToCurrencyDecimals(asset.USDC, amountToSwap.div(priceUSD).toString());
    const outPerInPrice = amountToSwap
      .mul(BigNumber.from(10).pow(decimalsUSDC))
      .wadDiv(amountOut.mul(BigNumber.from(10).pow(decimalsWETH)));
    const ethUsdValue = calcUsdValue(amountIn, priceWETH, decimalsWETH, priceUSD);
    const usdcUsdValue = calcUsdValue(amountOut, priceUSDC, decimalsUSDC, priceUSD);

    await mockUniswapRouter.setAmountOut(amountToSwap, asset.WNATIVE.address, asset.USDC.address, amountOut);

    const result = await uniswapLiquiditySwapAdapter.getAmountsOut(amountIn, asset.WNATIVE.address, asset.USDC.address);
    expect(result[0]).to.be.almostEqualOrEqual(amountOut);
    expect(result[1]).to.be.almostEqualOrEqual(outPerInPrice);
    expect(result[2]).to.be.almostEqualOrEqual(ethUsdValue);
    expect(result[3]).to.be.almostEqualOrEqual(usdcUsdValue);
  });

  it('getAmountsIn: WETH-DAI', async () => {
    const {
      mockUniswapRouter,
      uniswapLiquiditySwapAdapter,
      asset,
      priceOracle,
      lendingPool,
      marketConfig: poolConfig,
    } = await setupFixture();
    const flashloanPremium = await lendingPool.FLASHLOAN_PREMIUM_TOTAL();

    const amountIn = parseEther('1');
    const amountToSwap = amountIn.add(amountIn.percentMul(flashloanPremium));

    const priceWETH = await priceOracle.getAssetPrice(asset.WNATIVE.address);
    const priceDAI = await priceOracle.getAssetPrice(asset.DAI.address);
    const priceUSD = await priceOracle.getAssetPrice(poolConfig.protocolGlobalConfig.priceUSDAddress);
    const decimalsWETH = await asset.WNATIVE.decimals();
    const decimalsDAI = await asset.DAI.decimals();

    const amountOut = await convertToCurrencyDecimals(asset.DAI, amountIn.div(priceDAI).toString());
    const inPerOutPrice = amountOut
      .mul(BigNumber.from(10).pow(decimalsWETH))
      .wadDiv(amountToSwap.mul(BigNumber.from(10).pow(decimalsDAI)));
    const ethUsdValue = calcUsdValue(amountToSwap, priceWETH, decimalsWETH, priceUSD);
    const daiUsdValue = calcUsdValue(amountOut, priceDAI, decimalsDAI, priceUSD);

    await mockUniswapRouter.setAmountIn(amountOut, asset.WNATIVE.address, asset.DAI.address, amountIn);

    const result = await uniswapLiquiditySwapAdapter.getAmountsIn(amountOut, asset.WNATIVE.address, asset.DAI.address);
    expect(result[0]).to.be.almostEqualOrEqual(amountToSwap);
    expect(result[1]).to.be.almostEqualOrEqual(inPerOutPrice);
    expect(result[2]).to.be.almostEqualOrEqual(ethUsdValue);
    expect(result[3]).to.be.almostEqualOrEqual(daiUsdValue);
  });

  it('getAmountsIn: WETH-USDC', async () => {
    const {
      mockUniswapRouter,
      uniswapLiquiditySwapAdapter,
      asset,
      priceOracle,
      lendingPool,
      marketConfig: poolConfig,
    } = await setupFixture();
    const flashloanPremium = await lendingPool.FLASHLOAN_PREMIUM_TOTAL();

    const amountIn = parseEther('1');
    const amountToSwap = amountIn.add(amountIn.percentMul(flashloanPremium));

    const priceWETH = await priceOracle.getAssetPrice(asset.WNATIVE.address);
    const priceUSDC = await priceOracle.getAssetPrice(asset.USDC.address);
    const priceUSD = await priceOracle.getAssetPrice(poolConfig.protocolGlobalConfig.priceUSDAddress);
    const decimalsWETH = await asset.WNATIVE.decimals();
    const decimalsUSDC = await asset.USDC.decimals();

    const amountOut = await convertToCurrencyDecimals(asset.USDC, amountIn.div(priceUSDC).toString());
    const inPerOutPrice = amountOut
      .mul(BigNumber.from(10).pow(decimalsWETH))
      .wadDiv(amountToSwap.mul(BigNumber.from(10).pow(decimalsUSDC)));
    const ethUsdValue = calcUsdValue(amountToSwap, priceWETH, decimalsWETH, priceUSD);
    const usdcUsdValue = calcUsdValue(amountOut, priceUSDC, decimalsUSDC, priceUSD);

    await mockUniswapRouter.setAmountIn(amountOut, asset.WNATIVE.address, asset.USDC.address, amountIn);

    const result = await uniswapLiquiditySwapAdapter.getAmountsIn(amountOut, asset.WNATIVE.address, asset.USDC.address);
    expect(result[0]).to.be.almostEqualOrEqual(amountToSwap);
    expect(result[1]).to.be.almostEqualOrEqual(inPerOutPrice);
    expect(result[2]).to.be.almostEqualOrEqual(ethUsdValue);
    expect(result[3]).to.be.almostEqualOrEqual(usdcUsdValue);
  });
});
