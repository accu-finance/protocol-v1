import {BigNumberish} from 'ethers';
import hre, {deployments, getNamedAccounts} from 'hardhat';
import {Libraries} from 'hardhat/types';
import {
  AddressProvider,
  AToken,
  ATokensAndRatesHelper,
  BandPriceOracle,
  ChainlinkPriceOracle,
  DefaultReserveInterestRateStrategy,
  DelegationAwareAToken,
  FlashLiquidationAdapter,
  GenericLogic,
  LendingPool,
  LendingPoolCollateralManager,
  LendingPoolConfigurator,
  LendingRateOracle,
  MockAggregator,
  MockBandStdReference,
  MockChainlinkPriceFeed,
  MockFlashLoanReceiver,
  MockMintableERC20,
  MockPriceOracle,
  MockSelfdestructTransfer,
  MockUniswapV2Router02,
  MockWETH9,
  ProviderRegistry,
  ReserveLogic,
  StableAndVariableTokensHelper,
  StableDebtToken,
  UniswapLiquiditySwapAdapter,
  UniswapRepayAdapter,
  ValidationLogic,
  VariableDebtToken,
  WalletBalanceProvider,
  WETHGateway,
} from '../typechain';
import {AppDataProvider} from '../typechain/AppDataProvider';
import {MockWBNB9} from '../typechain/MockWBNB9';
import {ProtocolDataProvider} from '../typechain/ProtocolDataProvider';
import {WBNBGateway} from '../typechain/WBNBGateway';
import {
  Address,
  AssetId,
  BscPoolAsset,
  ContractId,
  ContractType,
  EthereumPoolAsset,
  InterestRateStrategyInput,
  PoolAsset,
} from '../types';
import {
  getATokenContractName,
  getContractAt,
  getStableDebtTokenContractName,
  getVariableDebtTokenContractName,
} from './contractGetter';
import {enumKeys} from './index';
import registerContractInJsonDb from './registerContractInJsonDb';

const {deploy} = deployments;

export const deployMintableERC20 = async (
  assetId: string,
  args: [string, string, number]
): Promise<MockMintableERC20> => {
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.MockMintableERC20;
  const result = await deploy(assetId, {
    from: deployer,
    contract,
    args,
  });
  console.log(`${assetId}:\t ${result.address}`);
  await registerContractInJsonDb(ContractType.Asset, assetId, hre.network.name, result);

  return await getContractAt(contract, result.address);
};

export const deployMockWETH = async (assetId: string, assetName?: string): Promise<MockWETH9> => {
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.MockWETH;
  const result = await deploy(assetId, {
    from: deployer,
    contract,
  });
  console.log(`${assetName || assetId}:\t ${result.address}`);
  await registerContractInJsonDb(ContractType.Asset, assetId, hre.network.name, result);

  return await getContractAt(contract, result.address);
};

export const deployMockWBNB = async (assetId: string, assetName?: string): Promise<MockWBNB9> => {
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.MockWBNB;
  const result = await deploy(assetId, {
    from: deployer,
    contract,
  });
  console.log(`${assetName || assetId}:\t ${result.address}`);
  await registerContractInJsonDb(ContractType.Asset, assetId, hre.network.name, result);

  return await getContractAt(contract, result.address);
};

export const deployAddressProvider = async (marketId: string): Promise<AddressProvider> => {
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.AddressProvider;
  const result = await deploy(contract, {
    from: deployer,
    contract,
    args: [marketId],
  });

  console.log(`${contract}: ${result.address}`);
  await registerContractInJsonDb(ContractType.Protocol, contract, hre.network.name, result);

  return await getContractAt(contract, result.address);
};

export const deployProviderRegistry = async (): Promise<ProviderRegistry> => {
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.ProviderRegistry;
  const result = await deploy(contract, {
    from: deployer,
    contract,
  });
  console.log(`${contract}: ${result.address}`);
  await registerContractInJsonDb(ContractType.Protocol, contract, hre.network.name, result);

  return await getContractAt(contract, result.address);
};

export const deployLendingPool = async (id?: string): Promise<LendingPool> => {
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.LendingPool;

  const reserveLogicLib = await deployReserveLogicLibrary();
  const genericLogicLib = await deployGenericLogicLibrary(reserveLogicLib.address);
  const validationLogicLib = await deployValidationLogicLibrary(reserveLogicLib.address, genericLogicLib.address);
  const libraries: Libraries = {
    [ContractId.ReserveLogic]: reserveLogicLib.address,
    [ContractId.GenericLogic]: genericLogicLib.address,
    [ContractId.ValidationLogic]: validationLogicLib.address,
  };

  const name = `${ContractId.LendingPool}${id || ''}`;
  const result = await deploy(name, {
    from: deployer,
    contract,
    libraries,
  });
  console.log(`${ContractId.LendingPoolImpl}: ${result.address}`);
  await registerContractInJsonDb(ContractType.Protocol, ContractId.LendingPoolImpl, hre.network.name, result);

  return await getContractAt(contract, result.address);
};

export const deployLendingPoolConfigurator = async (): Promise<LendingPoolConfigurator> => {
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.LendingPoolConfigurator;
  const result = await deploy(ContractId.LendingPoolConfigurator, {
    from: deployer,
    contract,
  });
  console.log(`${ContractId.LendingPoolConfiguratorImpl}: ${result.address}`);
  await registerContractInJsonDb(
    ContractType.Protocol,
    ContractId.LendingPoolConfiguratorImpl,
    hre.network.name,
    result
  );

  return await getContractAt(contract, result.address);
};

export const deployReserveLogicLibrary = async (): Promise<ReserveLogic> => {
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.ReserveLogic;
  const result = await deploy(contract, {
    from: deployer,
    contract,
  });
  console.log(`${contract}: ${result.address}`);
  await registerContractInJsonDb(ContractType.Protocol, contract, hre.network.name, result);

  return await getContractAt(contract, result.address);
};

export const deployGenericLogicLibrary = async (reserveLogicLibAddress: string): Promise<GenericLogic> => {
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.GenericLogic;
  const result = await deploy(contract, {
    from: deployer,
    contract,
    libraries: {
      [ContractId.ReserveLogic]: reserveLogicLibAddress,
    },
  });
  console.log(`${contract}: ${result.address}`);
  await registerContractInJsonDb(ContractType.Protocol, contract, hre.network.name, result);

  return await getContractAt(contract, result.address);
};

export const deployValidationLogicLibrary = async (
  reserveLogicLibAddress: string,
  genericLogicLibAddress: string
): Promise<ValidationLogic> => {
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.ValidationLogic;
  const result = await deploy(ContractId.ValidationLogic, {
    from: deployer,
    contract,
    libraries: {
      [ContractId.ReserveLogic]: reserveLogicLibAddress,
      [ContractId.GenericLogic]: genericLogicLibAddress,
    },
  });
  console.log(`${contract}: ${result.address}`);
  await registerContractInJsonDb(ContractType.Protocol, contract, hre.network.name, result);

  return await getContractAt(contract, result.address);
};

export const deployStableAndVariableTokenHelper = async (
  pool: Address,
  addressProvider: Address
): Promise<StableAndVariableTokensHelper> => {
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.StableAndVariableTokensHelper;
  const result = await deploy(contract, {
    from: deployer,
    contract,
    args: [pool, addressProvider],
  });
  console.log(`${contract}: ${result.address}`);
  await registerContractInJsonDb(ContractType.Protocol, contract, hre.network.name, result);

  return await getContractAt(contract, result.address);
};

export const deployATokensAndRatesHelper = async (
  pool: Address,
  addressProvider: Address,
  poolConfigurator: Address
): Promise<ATokensAndRatesHelper> => {
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.ATokensAndRatesHelper;
  const result = await deploy(contract, {
    from: deployer,
    contract,
    args: [pool, addressProvider, poolConfigurator],
  });
  console.log(`${contract}: ${result.address}`);
  await registerContractInJsonDb(ContractType.Protocol, contract, hre.network.name, result);

  return await getContractAt(contract, result.address);
};

export const deployMockPriceOracle = async (): Promise<MockPriceOracle> => {
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.MockPriceOracle;
  const result = await deploy(contract, {
    from: deployer,
    contract,
  });
  console.log(`${contract}:\t ${result.address}`);
  await registerContractInJsonDb(ContractType.Protocol, contract, hre.network.name, result);

  return await getContractAt(contract, result.address);
};

export const deployMockChainlinkAggregator = async (tokenId: AssetId, price: BigNumberish): Promise<MockAggregator> => {
  const {deployer} = await getNamedAccounts();
  const name = `${ContractId.MockChainlinkAggregator}-${tokenId}`;
  const contract = ContractId.MockChainlinkAggregator;
  const result = await deploy(name, {
    from: deployer,
    contract,
    args: [price],
  });
  console.log(`${name}:\t ${result.address}`);
  await registerContractInJsonDb(ContractType.Protocol, name, hre.network.name, result);

  return await getContractAt(contract, result.address);
};

export const deployAllMockChainlinkAggregators = async (
  poolAsset: EthereumPoolAsset<BigNumberish> | BscPoolAsset<BigNumberish>
): Promise<PoolAsset<Address>> => {
  const aggregator: PoolAsset<Address> = {} as PoolAsset<Address>;
  for (const tokenId of enumKeys(poolAsset)) {
    const price = poolAsset[tokenId];
    const result = await deployMockChainlinkAggregator(tokenId, price);
    console.log(`${ContractId.MockChainlinkAggregator}-${tokenId}:\t${result.address}`);
    aggregator[tokenId] = result.address;
  }

  return aggregator;
};

export const deployMockChainlinkPriceFeed = async (
  assets: Address[],
  sources: Address[]
): Promise<MockChainlinkPriceFeed> => {
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.MockChainlinkPriceFeed;
  const result = await deploy(contract, {
    from: deployer,
    contract,
    args: [assets, sources],
  });
  console.log(`${contract}: ${result.address}`);
  await registerContractInJsonDb(ContractType.Protocol, contract, hre.network.name, result);

  return await getContractAt(contract, result.address);
};

export const deployChainlinkPriceOracle = async (
  assets: Address[],
  sources: Address[],
  fallbackOracle: Address,
  weth: Address
): Promise<ChainlinkPriceOracle> => {
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.ChainlinkPriceOracle;
  const result = await deploy(contract, {
    from: deployer,
    contract,
    args: [assets, sources, fallbackOracle, weth],
  });
  console.log(`${contract}: ${result.address}`);
  await registerContractInJsonDb(ContractType.Protocol, contract, hre.network.name, result);

  return await getContractAt(contract, result.address);
};

export const deployLendingRateOracle = async (): Promise<LendingRateOracle> => {
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.LendingRateOracle;
  const result = await deploy(contract, {
    from: deployer,
    contract,
  });
  console.log(`${contract}: ${result.address}`);
  await registerContractInJsonDb(ContractType.Protocol, contract, hre.network.name, result);

  return await getContractAt(contract, result.address);
};

export const deployProtocolDataProvider = async (addressProvider: Address): Promise<ProtocolDataProvider> => {
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.ProtocolDataProvider;
  const result = await deploy(contract, {
    from: deployer,
    contract,
    args: [addressProvider],
  });
  console.log(`${contract}: ${result.address}`);
  await registerContractInJsonDb(ContractType.DataProvider, contract, hre.network.name, result);

  return await getContractAt(contract, result.address);
};

export const deployAppDataProvider = async (addressProvider: Address): Promise<AppDataProvider> => {
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.AppDataProvider;
  const result = await deploy(contract, {
    from: deployer,
    contract,
    args: [addressProvider],
  });
  console.log(`${contract}: ${result.address}`);
  await registerContractInJsonDb(ContractType.DataProvider, contract, hre.network.name, result);

  return await getContractAt(contract, result.address);
};

export const deployStableDebtToken = async (assetId: AssetId, tokenName?: string): Promise<StableDebtToken> => {
  const {deployer} = await getNamedAccounts();
  const {name, contract} = getStableDebtTokenContractName(assetId);
  const result = await deploy(name, {
    from: deployer,
    contract,
  });
  console.log(`sd${tokenName || name}: ${result.address}`);
  await registerContractInJsonDb(ContractType.StableDebtToken, name, hre.network.name, result);

  return await getContractAt(contract, result.address);
};

export const deployVariableDebtToken = async (assetId: AssetId, tokenName?: string): Promise<VariableDebtToken> => {
  const {deployer} = await getNamedAccounts();
  const {name, contract} = getVariableDebtTokenContractName(assetId);
  const result = await deploy(name, {
    from: deployer,
    contract,
  });
  console.log(`vd${tokenName || name}: ${result.address}`);
  await registerContractInJsonDb(ContractType.VariableDebtToken, name, hre.network.name, result);

  return await getContractAt(contract, result.address);
};

export const deployAToken = async (assetId: AssetId, tokenName?: string): Promise<AToken> => {
  const {deployer} = await getNamedAccounts();
  const {name, contract} = getATokenContractName(assetId, false);
  const result = await deploy(name, {
    from: deployer,
    contract,
  });
  console.log(`a${tokenName || name}: ${result.address}`);
  await registerContractInJsonDb(ContractType.AToken, name, hre.network.name, result);

  return (await getContractAt(contract, result.address)) as AToken;
};

export const deployDelegationAwareAToken = async (
  assetId: AssetId,
  tokenName?: string
): Promise<DelegationAwareAToken> => {
  const {deployer} = await getNamedAccounts();
  const {name, contract} = getATokenContractName(assetId, true);
  const result = await deploy(name, {
    from: deployer,
    contract,
  });
  console.log(`a${tokenName || name}: ${result.address}`);
  await registerContractInJsonDb(ContractType.AToken, name, hre.network.name, result);

  return await getContractAt(contract, result.address);
};

export const deployDefaultReserveInterestRateStrategy = async (
  name: string,
  input: InterestRateStrategyInput
): Promise<DefaultReserveInterestRateStrategy> => {
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.DefaultReserveInterestRateStrategy;
  const {
    addressProviderAddress,
    optimalUtilizationRate,
    baseVariableBorrowRate,
    variableRateSlope1,
    variableRateSlope2,
    stableRateSlope1,
    stableRateSlope2,
  } = input;
  const result = await deploy(name, {
    from: deployer,
    contract,
    args: [
      addressProviderAddress,
      optimalUtilizationRate,
      baseVariableBorrowRate,
      variableRateSlope1,
      variableRateSlope2,
      stableRateSlope1,
      stableRateSlope2,
    ],
  });
  console.log(`${name}: ${result.address}`);
  await registerContractInJsonDb(ContractType.Protocol, name, hre.network.name, result);

  return await getContractAt(contract, result.address);
};

export const deployLendingPoolCollateralManager = async (): Promise<LendingPoolCollateralManager> => {
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.LendingPoolCollateralManager;
  const result = await deploy(contract, {
    from: deployer,
    contract,
  });
  console.log(`${contract}: ${result.address}`);
  await registerContractInJsonDb(ContractType.Protocol, contract, hre.network.name, result);

  return await getContractAt(contract, result.address);
};

export const deployMockFlashLoanReceiver = async (addressProvider: Address): Promise<MockFlashLoanReceiver> => {
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.MockFlashLoanReceiver;
  const result = await deploy(contract, {
    from: deployer,
    contract,
    args: [addressProvider],
  });
  console.log(`${contract}: ${result.address}`);
  await registerContractInJsonDb(ContractType.Protocol, contract, hre.network.name, result);

  return await getContractAt(contract, result.address);
};

export const deployMockUniswapRouter = async (): Promise<MockUniswapV2Router02> => {
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.MockUniswapV2Router02;
  const result = await deploy(contract, {
    from: deployer,
    contract,
  });
  console.log(`${contract}: ${result.address}`);
  await registerContractInJsonDb(ContractType.Protocol, contract, hre.network.name, result);

  return await getContractAt(contract, result.address);
};

export const deployUniswapLiquiditySwapAdapter = async (
  addressProvider: Address,
  mockUniswapRouter: Address,
  weth: Address
): Promise<UniswapLiquiditySwapAdapter> => {
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.UniswapLiquiditySwapAdapter;
  const result = await deploy(contract, {
    from: deployer,
    contract,
    args: [addressProvider, mockUniswapRouter, weth],
  });
  console.log(`${contract}: ${result.address}`);
  await registerContractInJsonDb(ContractType.Protocol, contract, hre.network.name, result);

  return await getContractAt(contract, result.address);
};

export const deployUniswapRepayAdapter = async (
  addressProvider: Address,
  mockUniswapRouter: Address,
  weth: Address
): Promise<UniswapRepayAdapter> => {
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.UniswapRepayAdapter;
  const result = await deploy(contract, {
    from: deployer,
    contract,
    args: [addressProvider, mockUniswapRouter, weth],
  });
  console.log(`${contract}: ${result.address}`);
  await registerContractInJsonDb(ContractType.Protocol, contract, hre.network.name, result);

  return await getContractAt(contract, result.address);
};

export const deployFlashLiquidationAdapter = async (
  addressProvider: Address,
  mockUniswapRouter: Address,
  weth: Address
): Promise<FlashLiquidationAdapter> => {
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.FlashLiquidationAdapter;
  const result = await deploy(contract, {
    from: deployer,
    contract,
    args: [addressProvider, mockUniswapRouter, weth],
  });
  console.log(`${contract}: ${result.address}`);
  await registerContractInJsonDb(ContractType.Protocol, contract, hre.network.name, result);

  return await getContractAt(contract, result.address);
};

export const deployWalletBalanceProvider = async (): Promise<WalletBalanceProvider> => {
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.WalletBalanceProvider;
  const result = await deploy(contract, {
    from: deployer,
    contract,
  });
  console.log(`${contract}: ${result.address}`);
  await registerContractInJsonDb(ContractType.Protocol, contract, hre.network.name, result);

  return await getContractAt(contract, result.address);
};

export const deployWETHGateway = async (weth: Address): Promise<WETHGateway> => {
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.WETHGateway;
  const result = await deploy(contract, {
    from: deployer,
    contract,
    args: [weth],
  });
  console.log(`${contract}: ${result.address}`);
  await registerContractInJsonDb(ContractType.Protocol, contract, hre.network.name, result);

  return await getContractAt(contract, result.address);
};

export const deployBNBGateway = async (wbnb: Address): Promise<WBNBGateway> => {
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.WBNBGateway;
  const result = await deploy(contract, {
    from: deployer,
    contract,
    args: [wbnb],
  });
  console.log(`${contract}: ${result.address}`);
  await registerContractInJsonDb(ContractType.Protocol, contract, hre.network.name, result);

  return await getContractAt(contract, result.address);
};

export const deploySelfdestructTansfer = async (): Promise<MockSelfdestructTransfer> => {
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.MockSelfdestructTransfer;
  const result = await deploy(contract, {
    from: deployer,
    contract,
  });
  console.log(`${contract}: ${result.address}`);
  await registerContractInJsonDb(ContractType.Protocol, contract, hre.network.name, result);

  return await getContractAt(contract, result.address);
};

export const deployMockBandStdReference = async (): Promise<MockBandStdReference> => {
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.MockBandStdReference;
  const result = await deploy(contract, {
    from: deployer,
    contract,
  });
  console.log(`${contract}: ${result.address}`);
  await registerContractInJsonDb(ContractType.Protocol, contract, hre.network.name, result);

  return await getContractAt(contract, result.address);
};

export const deployBandPriceOracle = async (
  stdReference: Address,
  fallbackOracle: Address,
  weth: Address,
  base: string
): Promise<BandPriceOracle> => {
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.BandPriceOracle;
  const result = await deploy(contract, {
    from: deployer,
    contract,
    args: [stdReference, fallbackOracle, weth, base],
  });
  console.log(`${contract}: ${result.address}`);
  await registerContractInJsonDb(ContractType.Protocol, contract, hre.network.name, result);

  return await getContractAt(contract, result.address);
};
