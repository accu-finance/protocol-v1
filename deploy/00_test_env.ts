import {constants, utils} from 'ethers';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {LendingPool, LendingPoolConfigurator, WETHGateway} from '../typechain';
import {WBNBGateway} from '../typechain/WBNBGateway';
import {
  Address,
  AssetId,
  ContractDeployResult,
  ContractId,
  ContractType,
  ERC20Token,
  NativeCurrency,
  Oracle,
  PoolAsset,
} from '../types';
import {enumKeys, parseNetworkAddressProvider} from '../utils';
import {
  deployAddressProvider,
  deployAllMockChainlinkAggregators,
  deployAppDataProvider,
  deployBandPriceOracle,
  deployBNBGateway,
  deployChainlinkPriceOracle,
  deployFlashLiquidationAdapter,
  deployLendingPool,
  deployLendingPoolCollateralManager,
  deployLendingPoolConfigurator,
  deployLendingRateOracle,
  deployMintableERC20,
  deployMockBandStdReference,
  deployMockChainlinkPriceFeed,
  deployMockFlashLoanReceiver,
  deployMockPriceOracle,
  deployMockUniswapRouter,
  deployMockWBNB,
  deployMockWETH,
  deployProtocolDataProvider,
  deployProviderRegistry,
  deployUniswapLiquiditySwapAdapter,
  deployUniswapRepayAdapter,
  deployWalletBalanceProvider,
  deployWETHGateway,
} from '../utils/contractDeployer';
import {getContractAt} from '../utils/contractGetter';
import getMarketConfig from '../utils/getMarketConfig';
import {waitForTx} from '../utils/hhNetwork';
import {configureReserves, initMarketRates, initReserves, mapAssetsSourcesAddressPairs} from '../utils/poolSetter';
import registerContractInJsonDb from '../utils/registerContractInJsonDb';

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {network, addressProviderId} = parseNetworkAddressProvider(hre.network.name, process.env.ADDRESS_PROVIDER_ID);
  console.log(`***** using network ${network} for addressProviderId ${addressProviderId} *****`);

  const {getNamedAccounts} = hre;
  const {admin, emergencyAdmin, treasury: treasuryAddress} = await getNamedAccounts();
  const poolAssetAddress = {} as PoolAsset<Address>;
  const marketConfig = getMarketConfig(addressProviderId);
  const {marketId, reserveConfig, initialMarketRate, mockUsdPrice, mockPoolAssetPrice, nativeCurrency} = marketConfig;

  console.log('\nDeploying token assets...\n');

  for (const assetId of enumKeys(reserveConfig)) {
    let tokenAsset: ERC20Token;
    if (assetId === AssetId.WNATIVE) {
      if (marketConfig.nativeCurrency === NativeCurrency.ETH) {
        tokenAsset = await deployMockWETH(hre, assetId, NativeCurrency.ETH);
      } else {
        tokenAsset = await deployMockWBNB(hre, assetId, NativeCurrency.BNB);
      }
    } else {
      tokenAsset = await deployMintableERC20(hre, assetId, [assetId, assetId, reserveConfig[assetId].reserveDecimals]);
    }
    poolAssetAddress[assetId] = tokenAsset.address as Address;
  }

  console.log('\nDeploying contracts...\n');

  const providerRegistry = await deployProviderRegistry(hre);
  const addressProvider = await deployAddressProvider(hre, marketId);

  await waitForTx(
    await providerRegistry.registerAddressProvider(addressProvider.address, marketConfig.addressProviderId)
  );

  const lendingPoolImpl = await deployLendingPool(hre);
  await waitForTx(await addressProvider.setLendingPoolImpl(lendingPoolImpl.address));
  const lendingPoolAddress = await addressProvider.getLendingPool();
  const lendingPoolProxy = await getContractAt<LendingPool>(hre, ContractId.LendingPool, lendingPoolAddress);
  await registerContractInJsonDb(ContractType.Protocol, ContractId.LendingPool, network, {
    address: lendingPoolProxy.address,
  } as ContractDeployResult);
  console.log(`${ContractId.LendingPool}: ${lendingPoolProxy.address}`);

  const lendingPoolConfiguratorImpl = await deployLendingPoolConfigurator(hre);
  await waitForTx(await addressProvider.setLendingPoolConfiguratorImpl(lendingPoolConfiguratorImpl.address));
  const lendingPoolConfiguratorAddress = await addressProvider.getLendingPoolConfigurator();
  const lendingPoolConfiguratorProxy = await getContractAt<LendingPoolConfigurator>(
    hre,
    ContractId.LendingPoolConfigurator,
    lendingPoolConfiguratorAddress
  );
  await registerContractInJsonDb(ContractType.Protocol, ContractId.LendingPoolConfigurator, network, {
    address: lendingPoolConfiguratorProxy.address,
  } as ContractDeployResult);
  console.log(`${ContractId.LendingPoolConfigurator}: ${lendingPoolConfiguratorProxy.address}`);

  const lendingRateOracle = await deployLendingRateOracle(hre);
  await waitForTx(await addressProvider.setLendingRateOracle(lendingRateOracle.address));

  const collateralManager = await deployLendingPoolCollateralManager(hre);
  await waitForTx(await addressProvider.setLendingPoolCollateralManager(collateralManager.address));

  await waitForTx(await addressProvider.setPoolAdmin(admin));
  await waitForTx(await addressProvider.setEmergencyAdmin(emergencyAdmin));

  const fallbackOracle = await deployMockPriceOracle(hre);
  console.log('Setting asset price for fallbackOracle in base/quote format...');
  await waitForTx(await fallbackOracle.setEthUsdPrice(mockUsdPrice));
  await waitForTx(await fallbackOracle.setAssetPrice(marketConfig.protocolGlobalConfig.priceUSDAddress, mockUsdPrice));
  console.log(
    `  ${ContractId.MockPriceOracle} set USD/${nativeCurrency} \tprice ${utils.formatEther(mockUsdPrice)} WAD`
  );
  for (const assetId of enumKeys(poolAssetAddress)) {
    const address = poolAssetAddress[assetId];
    const price = mockPoolAssetPrice[assetId];
    await waitForTx(await fallbackOracle.setAssetPrice(address, price));
    console.log(
      `  ${ContractId.MockPriceOracle} set ${assetId}/${nativeCurrency} \tprice ${utils.formatEther(price)} WAD`
    );
  }

  if (marketConfig.oracle === Oracle.Chainlink) {
    const mockAggregator: PoolAsset<Address> = await deployAllMockChainlinkAggregators(hre, mockPoolAssetPrice);
    const [assets, sources] = mapAssetsSourcesAddressPairs(poolAssetAddress, mockAggregator);
    await deployMockChainlinkPriceFeed(hre, assets, sources);

    const priceOracle = await deployChainlinkPriceOracle(
      hre,
      assets,
      sources,
      fallbackOracle.address,
      poolAssetAddress.WNATIVE
    );
    await waitForTx(await addressProvider.setPriceOracle(priceOracle.address));
  } else if (marketConfig.oracle === Oracle.Band) {
    const mockBandStdReference = await deployMockBandStdReference(hre);
    const priceOracle = await deployBandPriceOracle(
      hre,
      mockBandStdReference.address,
      fallbackOracle.address,
      poolAssetAddress.WNATIVE,
      nativeCurrency
    );
    await mockBandStdReference.setPriceOracle(priceOracle.address);
    console.log('Setting asset price for PriceOracle in base/quote format...');
    await waitForTx(await mockBandStdReference.setReferenceData(AssetId.USD, nativeCurrency, mockUsdPrice));
    console.log(
      `  ${ContractId.MockPriceOracle} set USD/${nativeCurrency} \tprice ${utils.formatEther(mockUsdPrice)} WAD`
    );
    const assets: Address[] = [constants.AddressZero];
    const symbols: string[] = [AssetId.USD];
    for (const assetId of enumKeys(poolAssetAddress)) {
      const price = mockPoolAssetPrice[assetId];
      await waitForTx(await mockBandStdReference.setReferenceData(assetId, nativeCurrency, price));
      console.log(
        `  ${ContractId.MockPriceOracle} set ${assetId}/${nativeCurrency} \tprice ${utils.formatEther(price)} WAD`
      );
      assets.push(poolAssetAddress[assetId]);
      symbols.push(assetId);
    }
    await waitForTx(await priceOracle.setAssetsSymbols(assets, symbols));
    await waitForTx(await addressProvider.setPriceOracle(priceOracle.address));
  }

  console.log('\nInitializing market rates...\n');
  await initMarketRates(hre, marketConfig, poolAssetAddress, initialMarketRate, lendingRateOracle.address);

  console.log('\nInitializing pool reserves...\n');
  await initReserves(hre, marketConfig, treasuryAddress, poolAssetAddress, addressProvider);

  console.log('\nConfiguring pool reserves...\n');
  await configureReserves(hre, marketConfig, poolAssetAddress, addressProvider);

  await deployMockFlashLoanReceiver(hre, addressProvider.address);

  const mockUniswapRouter = await deployMockUniswapRouter(hre);
  await deployUniswapLiquiditySwapAdapter(
    hre,
    addressProvider.address,
    mockUniswapRouter.address,
    poolAssetAddress.WNATIVE
  );
  await deployUniswapRepayAdapter(hre, addressProvider.address, mockUniswapRouter.address, poolAssetAddress.WNATIVE);
  await deployFlashLiquidationAdapter(
    hre,
    addressProvider.address,
    mockUniswapRouter.address,
    poolAssetAddress.WNATIVE
  );

  if (marketConfig.nativeCurrency === NativeCurrency.ETH) {
    const gateway = await deployWETHGateway(hre, poolAssetAddress.WNATIVE);
    const wGateway = await getContractAt<WETHGateway>(hre, ContractId.WETHGateway, gateway.address);
    await waitForTx(await wGateway.authorizeLendingPool(lendingPoolAddress));
  } else if (marketConfig.nativeCurrency == NativeCurrency.BNB) {
    const gateway = await deployBNBGateway(hre, poolAssetAddress.WNATIVE);
    const wGateway = await getContractAt<WBNBGateway>(hre, ContractId.WBNBGateway, gateway.address);
    await waitForTx(await wGateway.authorizeLendingPool(lendingPoolAddress));
  }

  await deployProtocolDataProvider(hre, addressProvider.address);
  await deployAppDataProvider(hre, addressProvider.address);
  await deployWalletBalanceProvider(hre);
};

export default func;
func.tags = ['testEnv'];
