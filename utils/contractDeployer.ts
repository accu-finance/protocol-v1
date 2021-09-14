import {BigNumberish} from 'ethers';
import {HardhatRuntimeEnvironment, Libraries} from 'hardhat/types';
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

export const deployMintableERC20 = async (
  hre: HardhatRuntimeEnvironment,
  assetId: string,
  args: [string, string, number]
): Promise<MockMintableERC20> => {
  const {
    deployments: {deploy},
    getNamedAccounts,
    network,
  } = hre;
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.MockMintableERC20;
  const result = await deploy(assetId, {
    from: deployer,
    contract,
    args,
  });
  console.log(`${assetId}:\t ${result.address}`);
  await registerContractInJsonDb(ContractType.Asset, assetId, network.name, result);

  return await getContractAt(hre, contract, result.address);
};

export const deployMockWETH = async (
  hre: HardhatRuntimeEnvironment,
  assetId: string,
  assetName?: string
): Promise<MockWETH9> => {
  const {
    deployments: {deploy},
    getNamedAccounts,
    network,
  } = hre;
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.MockWETH;
  const result = await deploy(assetId, {
    from: deployer,
    contract,
  });
  console.log(`${assetName || assetId}:\t ${result.address}`);
  await registerContractInJsonDb(ContractType.Asset, assetId, network.name, result);

  return await getContractAt(hre, contract, result.address);
};

export const deployMockWBNB = async (
  hre: HardhatRuntimeEnvironment,
  assetId: string,
  assetName?: string
): Promise<MockWBNB9> => {
  const {
    deployments: {deploy},
    getNamedAccounts,
    network,
  } = hre;
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.MockWBNB;
  const result = await deploy(assetId, {
    from: deployer,
    contract,
  });
  console.log(`${assetName || assetId}:\t ${result.address}`);
  await registerContractInJsonDb(ContractType.Asset, assetId, network.name, result);

  return await getContractAt(hre, contract, result.address);
};

export const deployAddressProvider = async (
  hre: HardhatRuntimeEnvironment,
  marketId: string
): Promise<AddressProvider> => {
  const {
    deployments: {deploy},
    getNamedAccounts,
    network,
  } = hre;
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.AddressProvider;
  const result = await deploy(contract, {
    from: deployer,
    contract,
    args: [marketId],
  });

  console.log(`${contract}: ${result.address}`);
  await registerContractInJsonDb(ContractType.Protocol, contract, network.name, result);

  return await getContractAt(hre, contract, result.address);
};

export const deployProviderRegistry = async (hre: HardhatRuntimeEnvironment): Promise<ProviderRegistry> => {
  const {
    deployments: {deploy},
    getNamedAccounts,
    network,
  } = hre;
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.ProviderRegistry;
  const result = await deploy(contract, {
    from: deployer,
    contract,
  });
  console.log(`${contract}: ${result.address}`);
  await registerContractInJsonDb(ContractType.Protocol, contract, network.name, result);

  return await getContractAt(hre, contract, result.address);
};

export const deployLendingPool = async (hre: HardhatRuntimeEnvironment, id?: string): Promise<LendingPool> => {
  const {
    deployments: {deploy},
    getNamedAccounts,
    network,
  } = hre;
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.LendingPool;

  const reserveLogicLib = await deployReserveLogicLibrary(hre);
  const genericLogicLib = await deployGenericLogicLibrary(hre, reserveLogicLib.address);
  const validationLogicLib = await deployValidationLogicLibrary(hre, reserveLogicLib.address, genericLogicLib.address);
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
  await registerContractInJsonDb(ContractType.Protocol, ContractId.LendingPoolImpl, network.name, result);

  return await getContractAt(hre, contract, result.address);
};

export const deployLendingPoolConfigurator = async (
  hre: HardhatRuntimeEnvironment
): Promise<LendingPoolConfigurator> => {
  const {
    deployments: {deploy},
    getNamedAccounts,
    network,
  } = hre;
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.LendingPoolConfigurator;
  const result = await deploy(ContractId.LendingPoolConfigurator, {
    from: deployer,
    contract,
  });
  console.log(`${ContractId.LendingPoolConfiguratorImpl}: ${result.address}`);
  await registerContractInJsonDb(ContractType.Protocol, ContractId.LendingPoolConfiguratorImpl, network.name, result);

  return await getContractAt(hre, contract, result.address);
};

export const deployReserveLogicLibrary = async (hre: HardhatRuntimeEnvironment): Promise<ReserveLogic> => {
  const {
    deployments: {deploy},
    getNamedAccounts,
    network,
  } = hre;
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.ReserveLogic;
  const result = await deploy(contract, {
    from: deployer,
    contract,
  });
  console.log(`${contract}: ${result.address}`);
  await registerContractInJsonDb(ContractType.Protocol, contract, network.name, result);

  return await getContractAt(hre, contract, result.address);
};

export const deployGenericLogicLibrary = async (
  hre: HardhatRuntimeEnvironment,
  reserveLogicLibAddress: string
): Promise<GenericLogic> => {
  const {
    deployments: {deploy},
    getNamedAccounts,
    network,
  } = hre;
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
  await registerContractInJsonDb(ContractType.Protocol, contract, network.name, result);

  return await getContractAt(hre, contract, result.address);
};

export const deployValidationLogicLibrary = async (
  hre: HardhatRuntimeEnvironment,
  reserveLogicLibAddress: string,
  genericLogicLibAddress: string
): Promise<ValidationLogic> => {
  const {
    deployments: {deploy},
    getNamedAccounts,
    network,
  } = hre;
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
  await registerContractInJsonDb(ContractType.Protocol, contract, network.name, result);

  return await getContractAt(hre, contract, result.address);
};

export const deployStableAndVariableTokenHelper = async (
  hre: HardhatRuntimeEnvironment,
  pool: Address,
  addressProvider: Address
): Promise<StableAndVariableTokensHelper> => {
  const {
    deployments: {deploy},
    getNamedAccounts,
    network,
  } = hre;
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.StableAndVariableTokensHelper;
  const result = await deploy(contract, {
    from: deployer,
    contract,
    args: [pool, addressProvider],
  });
  console.log(`${contract}: ${result.address}`);
  await registerContractInJsonDb(ContractType.Protocol, contract, network.name, result);

  return await getContractAt(hre, contract, result.address);
};

export const deployATokensAndRatesHelper = async (
  hre: HardhatRuntimeEnvironment,
  pool: Address,
  addressProvider: Address,
  poolConfigurator: Address
): Promise<ATokensAndRatesHelper> => {
  const {
    deployments: {deploy},
    getNamedAccounts,
    network,
  } = hre;
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.ATokensAndRatesHelper;
  const result = await deploy(contract, {
    from: deployer,
    contract,
    args: [pool, addressProvider, poolConfigurator],
  });
  console.log(`${contract}: ${result.address}`);
  await registerContractInJsonDb(ContractType.Protocol, contract, network.name, result);

  return await getContractAt(hre, contract, result.address);
};

export const deployMockPriceOracle = async (hre: HardhatRuntimeEnvironment): Promise<MockPriceOracle> => {
  const {
    deployments: {deploy},
    getNamedAccounts,
    network,
  } = hre;
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.MockPriceOracle;
  const result = await deploy(contract, {
    from: deployer,
    contract,
  });
  console.log(`${contract}:\t ${result.address}`);
  await registerContractInJsonDb(ContractType.Protocol, contract, network.name, result);

  return await getContractAt(hre, contract, result.address);
};

export const deployMockChainlinkAggregator = async (
  hre: HardhatRuntimeEnvironment,
  tokenId: AssetId,
  price: BigNumberish
): Promise<MockAggregator> => {
  const {
    deployments: {deploy},
    getNamedAccounts,
    network,
  } = hre;
  const {deployer} = await getNamedAccounts();
  const name = `${ContractId.MockChainlinkAggregator}-${tokenId}`;
  const contract = ContractId.MockChainlinkAggregator;
  const result = await deploy(name, {
    from: deployer,
    contract,
    args: [price],
  });
  console.log(`${name}:\t ${result.address}`);
  await registerContractInJsonDb(ContractType.Protocol, name, network.name, result);

  return await getContractAt(hre, contract, result.address);
};

export const deployAllMockChainlinkAggregators = async (
  hre: HardhatRuntimeEnvironment,
  poolAsset: EthereumPoolAsset<BigNumberish> | BscPoolAsset<BigNumberish>
): Promise<PoolAsset<Address>> => {
  const aggregator: PoolAsset<Address> = {} as PoolAsset<Address>;
  for (const tokenId of enumKeys(poolAsset)) {
    const price = poolAsset[tokenId];
    const result = await deployMockChainlinkAggregator(hre, tokenId, price);
    console.log(`${ContractId.MockChainlinkAggregator}-${tokenId}:\t${result.address}`);
    aggregator[tokenId] = result.address;
  }

  return aggregator;
};

export const deployMockChainlinkPriceFeed = async (
  hre: HardhatRuntimeEnvironment,
  assets: Address[],
  sources: Address[]
): Promise<MockChainlinkPriceFeed> => {
  const {
    deployments: {deploy},
    getNamedAccounts,
    network,
  } = hre;
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.MockChainlinkPriceFeed;
  const result = await deploy(contract, {
    from: deployer,
    contract,
    args: [assets, sources],
  });
  console.log(`${contract}: ${result.address}`);
  await registerContractInJsonDb(ContractType.Protocol, contract, network.name, result);

  return await getContractAt(hre, contract, result.address);
};

export const deployChainlinkPriceOracle = async (
  hre: HardhatRuntimeEnvironment,
  assets: Address[],
  sources: Address[],
  fallbackOracle: Address,
  weth: Address
): Promise<ChainlinkPriceOracle> => {
  const {
    deployments: {deploy},
    getNamedAccounts,
    network,
  } = hre;
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.ChainlinkPriceOracle;
  const result = await deploy(contract, {
    from: deployer,
    contract,
    args: [assets, sources, fallbackOracle, weth],
  });
  console.log(`${contract}: ${result.address}`);
  await registerContractInJsonDb(ContractType.Protocol, contract, network.name, result);

  return await getContractAt(hre, contract, result.address);
};

export const deployLendingRateOracle = async (hre: HardhatRuntimeEnvironment): Promise<LendingRateOracle> => {
  const {
    deployments: {deploy},
    getNamedAccounts,
    network,
  } = hre;
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.LendingRateOracle;
  const result = await deploy(contract, {
    from: deployer,
    contract,
  });
  console.log(`${contract}: ${result.address}`);
  await registerContractInJsonDb(ContractType.Protocol, contract, network.name, result);

  return await getContractAt(hre, contract, result.address);
};

export const deployProtocolDataProvider = async (
  hre: HardhatRuntimeEnvironment,
  addressProvider: Address
): Promise<ProtocolDataProvider> => {
  const {
    deployments: {deploy},
    getNamedAccounts,
    network,
  } = hre;
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.ProtocolDataProvider;
  const result = await deploy(contract, {
    from: deployer,
    contract,
    args: [addressProvider],
  });
  console.log(`${contract}: ${result.address}`);
  await registerContractInJsonDb(ContractType.DataProvider, contract, network.name, result);

  return await getContractAt(hre, contract, result.address);
};

export const deployAppDataProvider = async (
  hre: HardhatRuntimeEnvironment,
  addressProvider: Address
): Promise<AppDataProvider> => {
  const {
    deployments: {deploy},
    getNamedAccounts,
    network,
  } = hre;
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.AppDataProvider;
  const result = await deploy(contract, {
    from: deployer,
    contract,
    args: [addressProvider],
  });
  console.log(`${contract}: ${result.address}`);
  await registerContractInJsonDb(ContractType.DataProvider, contract, network.name, result);

  return await getContractAt(hre, contract, result.address);
};

export const deployStableDebtToken = async (
  hre: HardhatRuntimeEnvironment,
  assetId: AssetId,
  tokenName?: string
): Promise<StableDebtToken> => {
  const {
    deployments: {deploy},
    getNamedAccounts,
    network,
  } = hre;
  const {deployer} = await getNamedAccounts();
  const {name, contract} = getStableDebtTokenContractName(hre, assetId);
  const result = await deploy(name, {
    from: deployer,
    contract,
  });
  console.log(`sd${tokenName || name}: ${result.address}`);
  await registerContractInJsonDb(ContractType.StableDebtToken, name, network.name, result);

  return await getContractAt(hre, contract, result.address);
};

export const deployVariableDebtToken = async (
  hre: HardhatRuntimeEnvironment,
  assetId: AssetId,
  tokenName?: string
): Promise<VariableDebtToken> => {
  const {
    deployments: {deploy},
    getNamedAccounts,
    network,
  } = hre;
  const {deployer} = await getNamedAccounts();
  const {name, contract} = getVariableDebtTokenContractName(hre, assetId);
  const result = await deploy(name, {
    from: deployer,
    contract,
  });
  console.log(`vd${tokenName || name}: ${result.address}`);
  await registerContractInJsonDb(ContractType.VariableDebtToken, name, network.name, result);

  return await getContractAt(hre, contract, result.address);
};

export const deployAToken = async (
  hre: HardhatRuntimeEnvironment,
  assetId: AssetId,
  tokenName?: string
): Promise<AToken> => {
  const {
    deployments: {deploy},
    getNamedAccounts,
    network,
  } = hre;
  const {deployer} = await getNamedAccounts();
  const {name, contract} = getATokenContractName(hre, assetId, false);
  const result = await deploy(name, {
    from: deployer,
    contract,
  });
  console.log(`a${tokenName || name}: ${result.address}`);
  await registerContractInJsonDb(ContractType.AToken, name, network.name, result);

  return (await getContractAt(hre, contract, result.address)) as AToken;
};

export const deployDelegationAwareAToken = async (
  hre: HardhatRuntimeEnvironment,
  assetId: AssetId,
  tokenName?: string
): Promise<DelegationAwareAToken> => {
  const {
    deployments: {deploy},
    getNamedAccounts,
    network,
  } = hre;
  const {deployer} = await getNamedAccounts();
  const {name, contract} = getATokenContractName(hre, assetId, true);
  const result = await deploy(name, {
    from: deployer,
    contract,
  });
  console.log(`a${tokenName || name}: ${result.address}`);
  await registerContractInJsonDb(ContractType.AToken, name, network.name, result);

  return await getContractAt(hre, contract, result.address);
};

export const deployDefaultReserveInterestRateStrategy = async (
  hre: HardhatRuntimeEnvironment,
  name: string,
  input: InterestRateStrategyInput
): Promise<DefaultReserveInterestRateStrategy> => {
  const {
    deployments: {deploy},
    getNamedAccounts,
    network,
  } = hre;
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
  await registerContractInJsonDb(ContractType.Protocol, name, network.name, result);

  return await getContractAt(hre, contract, result.address);
};

export const deployLendingPoolCollateralManager = async (
  hre: HardhatRuntimeEnvironment
): Promise<LendingPoolCollateralManager> => {
  const {
    deployments: {deploy},
    getNamedAccounts,
    network,
  } = hre;
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.LendingPoolCollateralManager;
  const result = await deploy(contract, {
    from: deployer,
    contract,
  });
  console.log(`${contract}: ${result.address}`);
  await registerContractInJsonDb(ContractType.Protocol, contract, network.name, result);

  return await getContractAt(hre, contract, result.address);
};

export const deployMockFlashLoanReceiver = async (
  hre: HardhatRuntimeEnvironment,
  addressProvider: Address
): Promise<MockFlashLoanReceiver> => {
  const {
    deployments: {deploy},
    getNamedAccounts,
    network,
  } = hre;
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.MockFlashLoanReceiver;
  const result = await deploy(contract, {
    from: deployer,
    contract,
    args: [addressProvider],
  });
  console.log(`${contract}: ${result.address}`);
  await registerContractInJsonDb(ContractType.Protocol, contract, network.name, result);

  return await getContractAt(hre, contract, result.address);
};

export const deployMockUniswapRouter = async (hre: HardhatRuntimeEnvironment): Promise<MockUniswapV2Router02> => {
  const {
    deployments: {deploy},
    getNamedAccounts,
    network,
  } = hre;
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.MockUniswapV2Router02;
  const result = await deploy(contract, {
    from: deployer,
    contract,
  });
  console.log(`${contract}: ${result.address}`);
  await registerContractInJsonDb(ContractType.Protocol, contract, network.name, result);

  return await getContractAt(hre, contract, result.address);
};

export const deployUniswapLiquiditySwapAdapter = async (
  hre: HardhatRuntimeEnvironment,
  addressProvider: Address,
  mockUniswapRouter: Address,
  weth: Address
): Promise<UniswapLiquiditySwapAdapter> => {
  const {
    deployments: {deploy},
    getNamedAccounts,
    network,
  } = hre;
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.UniswapLiquiditySwapAdapter;
  const result = await deploy(contract, {
    from: deployer,
    contract,
    args: [addressProvider, mockUniswapRouter, weth],
  });
  console.log(`${contract}: ${result.address}`);
  await registerContractInJsonDb(ContractType.Protocol, contract, network.name, result);

  return await getContractAt(hre, contract, result.address);
};

export const deployUniswapRepayAdapter = async (
  hre: HardhatRuntimeEnvironment,
  addressProvider: Address,
  mockUniswapRouter: Address,
  weth: Address
): Promise<UniswapRepayAdapter> => {
  const {
    deployments: {deploy},
    getNamedAccounts,
    network,
  } = hre;
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.UniswapRepayAdapter;
  const result = await deploy(contract, {
    from: deployer,
    contract,
    args: [addressProvider, mockUniswapRouter, weth],
  });
  console.log(`${contract}: ${result.address}`);
  await registerContractInJsonDb(ContractType.Protocol, contract, network.name, result);

  return await getContractAt(hre, contract, result.address);
};

export const deployFlashLiquidationAdapter = async (
  hre: HardhatRuntimeEnvironment,
  addressProvider: Address,
  mockUniswapRouter: Address,
  weth: Address
): Promise<FlashLiquidationAdapter> => {
  const {
    deployments: {deploy},
    getNamedAccounts,
    network,
  } = hre;
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.FlashLiquidationAdapter;
  const result = await deploy(contract, {
    from: deployer,
    contract,
    args: [addressProvider, mockUniswapRouter, weth],
  });
  console.log(`${contract}: ${result.address}`);
  await registerContractInJsonDb(ContractType.Protocol, contract, network.name, result);

  return await getContractAt(hre, contract, result.address);
};

export const deployWalletBalanceProvider = async (hre: HardhatRuntimeEnvironment): Promise<WalletBalanceProvider> => {
  const {
    deployments: {deploy},
    getNamedAccounts,
    network,
  } = hre;
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.WalletBalanceProvider;
  const result = await deploy(contract, {
    from: deployer,
    contract,
  });
  console.log(`${contract}: ${result.address}`);
  await registerContractInJsonDb(ContractType.Protocol, contract, network.name, result);

  return await getContractAt(hre, contract, result.address);
};

export const deployWETHGateway = async (hre: HardhatRuntimeEnvironment, weth: Address): Promise<WETHGateway> => {
  const {
    deployments: {deploy},
    getNamedAccounts,
    network,
  } = hre;
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.WETHGateway;
  const result = await deploy(contract, {
    from: deployer,
    contract,
    args: [weth],
  });
  console.log(`${contract}: ${result.address}`);
  await registerContractInJsonDb(ContractType.Protocol, contract, network.name, result);

  return await getContractAt(hre, contract, result.address);
};

export const deployBNBGateway = async (hre: HardhatRuntimeEnvironment, wbnb: Address): Promise<WBNBGateway> => {
  const {
    deployments: {deploy},
    getNamedAccounts,
    network,
  } = hre;
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.WBNBGateway;
  const result = await deploy(contract, {
    from: deployer,
    contract,
    args: [wbnb],
  });
  console.log(`${contract}: ${result.address}`);
  await registerContractInJsonDb(ContractType.Protocol, contract, network.name, result);

  return await getContractAt(hre, contract, result.address);
};

export const deploySelfdestructTansfer = async (hre: HardhatRuntimeEnvironment): Promise<MockSelfdestructTransfer> => {
  const {
    deployments: {deploy},
    getNamedAccounts,
    network,
  } = hre;
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.MockSelfdestructTransfer;
  const result = await deploy(contract, {
    from: deployer,
    contract,
  });
  console.log(`${contract}: ${result.address}`);
  await registerContractInJsonDb(ContractType.Protocol, contract, network.name, result);

  return await getContractAt(hre, contract, result.address);
};

export const deployMockBandStdReference = async (hre: HardhatRuntimeEnvironment): Promise<MockBandStdReference> => {
  const {
    deployments: {deploy},
    getNamedAccounts,
    network,
  } = hre;
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.MockBandStdReference;
  const result = await deploy(contract, {
    from: deployer,
    contract,
  });
  console.log(`${contract}: ${result.address}`);
  await registerContractInJsonDb(ContractType.Protocol, contract, network.name, result);

  return await getContractAt(hre, contract, result.address);
};

export const deployBandPriceOracle = async (
  hre: HardhatRuntimeEnvironment,
  stdReference: Address,
  fallbackOracle: Address,
  weth: Address,
  base: string
): Promise<BandPriceOracle> => {
  const {
    deployments: {deploy},
    getNamedAccounts,
    network,
  } = hre;
  const {deployer} = await getNamedAccounts();
  const contract = ContractId.BandPriceOracle;
  const result = await deploy(contract, {
    from: deployer,
    contract,
    args: [stdReference, fallbackOracle, weth, base],
  });
  console.log(`${contract}: ${result.address}`);
  await registerContractInJsonDb(ContractType.Protocol, contract, network.name, result);

  return await getContractAt(hre, contract, result.address);
};
