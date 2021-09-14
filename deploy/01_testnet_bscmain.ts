import {constants} from 'ethers';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {LendingPool, LendingPoolConfigurator, WETHGateway} from '../typechain';
import {WBNBGateway} from '../typechain/WBNBGateway';
import {
  Address,
  AssetId,
  BscConfiguration,
  BscNetwork,
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
  deployAppDataProvider,
  deployBandPriceOracle,
  deployBNBGateway,
  deployFlashLiquidationAdapter,
  deployLendingPool,
  deployLendingPoolCollateralManager,
  deployLendingPoolConfigurator,
  deployLendingRateOracle,
  deployMintableERC20,
  deployMockUniswapRouter,
  deployMockWBNB,
  deployMockWETH,
  deployProtocolDataProvider,
  deployProviderRegistry,
  deployUniswapLiquiditySwapAdapter,
  deployUniswapRepayAdapter,
  deployWETHGateway,
} from '../utils/contractDeployer';
import {getContractAt} from '../utils/contractGetter';
import getMarketConfig from '../utils/getMarketConfig';
import {waitForTx} from '../utils/hhNetwork';
import {configureReserves, initMarketRates, initReserves} from '../utils/poolSetter';
import registerContractInJsonDb from '../utils/registerContractInJsonDb';

const {AddressZero} = constants;

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const {network, addressProviderId} = parseNetworkAddressProvider(hre.network.name, process.env.ADDRESS_PROVIDER_ID);
  console.log(`***** using network ${network} for addressProviderId ${addressProviderId} *****`);

  const {getNamedAccounts} = hre;
  const {admin, emergencyAdmin} = await getNamedAccounts();
  const poolAssetAddress = {} as PoolAsset<Address>;
  const marketConfig = getMarketConfig(addressProviderId);
  const {marketId, reserveConfig, initialMarketRate, nativeCurrency, reserveFactorTreasuryAddress} = marketConfig;
  // @ts-ignore
  const treasuryAddress = reserveFactorTreasuryAddress[network];
  if (!treasuryAddress) {
    throw new Error('treasuryAddress must be provided');
  }

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

  if (marketConfig.oracle === Oracle.Chainlink) {
    throw new Error('Chainlink not supported at this moment');
    // const mockAggregator: PoolAsset<Address> = await deployAllMockChainlinkAggregators(mockPoolAssetPrice);
    // const [assets, sources] = mapAssetsSourcesAddressPairs(poolAssetAddress, mockAggregator);
    // await deployMockChainlinkPriceFeed(assets, sources);

    // const priceOracle = await deployChainlinkPriceOracle(assets, sources, AddressZero, poolAssetAddress.WNATIVE);
    // await waitForTx(await addressProvider.setPriceOracle(priceOracle.address));
  } else if (marketConfig.oracle === Oracle.Band) {
    const bandStdReferenceAddress = (marketConfig as BscConfiguration).bandStdReference[network as BscNetwork];
    const priceOracle = await deployBandPriceOracle(
      hre,
      bandStdReferenceAddress,
      AddressZero, // ignore fallback oracle for now TODO: ADD FALLBACK ORACLE
      poolAssetAddress.WNATIVE,
      nativeCurrency
    );

    console.log('Setting PriceOracle assets and symbols...');
    const assets: Address[] = [marketConfig.protocolGlobalConfig.priceUSDAddress];
    const symbols: string[] = [AssetId.USD];
    for (const assetId of enumKeys(poolAssetAddress)) {
      assets.push(poolAssetAddress[assetId]);
      const symbol = assetId === AssetId.WNATIVE ? marketConfig.nativeCurrency : assetId;
      symbols.push(symbol);
      console.log(`\tset asset ${assetId} to symbol ${symbol} at address ${poolAssetAddress[assetId]}`);
    }

    await waitForTx(await priceOracle.setAssetsSymbols(assets, symbols));
    await waitForTx(await addressProvider.setPriceOracle(priceOracle.address));
  }

  await deployProtocolDataProvider(hre, addressProvider.address);
  await deployAppDataProvider(hre, addressProvider.address);

  console.log('\nInitializing market rates...\n');
  await initMarketRates(hre, marketConfig, poolAssetAddress, initialMarketRate, lendingRateOracle.address);

  console.log('\nInitializing pool reserves...\n');
  await initReserves(hre, marketConfig, treasuryAddress, poolAssetAddress, addressProvider);

  console.log('\nConfiguring pool reserves...\n');
  await configureReserves(hre, marketConfig, poolAssetAddress, addressProvider);

  if (marketConfig.nativeCurrency === NativeCurrency.ETH) {
    const gateway = await deployWETHGateway(hre, poolAssetAddress.WNATIVE);
    const wGateway = await getContractAt<WETHGateway>(hre, ContractId.WETHGateway, gateway.address);
    await waitForTx(await wGateway.authorizeLendingPool(lendingPoolAddress));
  } else if (marketConfig.nativeCurrency == NativeCurrency.BNB) {
    const gateway = await deployBNBGateway(hre, poolAssetAddress.WNATIVE);
    const wGateway = await getContractAt<WBNBGateway>(hre, ContractId.WBNBGateway, gateway.address);
    await waitForTx(await wGateway.authorizeLendingPool(lendingPoolAddress));
  }

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
};

export default func;
func.tags = ['testnetBscmain'];
