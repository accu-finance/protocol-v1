import {BigNumber, BigNumberish} from 'ethers';
import {
  AddressProvider,
  AToken,
  DelegationAwareAToken,
  FlashLiquidationAdapter,
  IPriceOracleGetter,
  LendingPool,
  LendingPoolConfigurator,
  LendingRateOracle,
  MockFlashLoanReceiver,
  MockMintableERC20,
  MockUniswapV2Router02,
  MockWETH9,
  ProtocolDataProvider,
  ProviderRegistry,
  StableDebtToken,
  UniswapLiquiditySwapAdapter,
  UniswapRepayAdapter,
  VariableDebtToken,
  WETHGateway,
} from '../typechain';
import {IPriceOracleSetter} from '../typechain/IPriceOracleSetter';
import {WBNBGateway} from '../typechain/WBNBGateway';

export enum AssetId {
  ACCU = 'ACCU',
  ADA = 'ADA',
  BAND = 'BAND',
  BAT = 'BAT',
  BCH = 'BCH',
  BNB = 'BNB',
  BTC = 'BTC',
  BUSD = 'BUSD',
  DAI = 'DAI',
  DOT = 'DOT',
  ETH = 'ETH',
  LINK = 'LINK',
  LTC = 'LTC',
  UNI = 'UNI',
  USD = 'USD',
  USDC = 'USDC',
  USDT = 'USDT',
  WNATIVE = 'WNATIVE',
  XRP = 'XRP',
  YFI = 'YFI',
  ZRX = 'ZRX',
}

export enum ContractId {
  //protocol
  AddressProvider = 'AddressProvider',
  ProviderRegistry = 'ProviderRegistry',
  LendingPoolParametersProvider = 'LendingPoolParametersProvider',
  LendingPoolConfigurator = 'LendingPoolConfigurator',
  ValidationLogic = 'ValidationLogic',
  ReserveLogic = 'ReserveLogic',
  GenericLogic = 'GenericLogic',
  LendingPool = 'LendingPool',
  Proxy = 'Proxy',
  LendingRateOracle = 'LendingRateOracle',
  DefaultReserveInterestRateStrategy = 'DefaultReserveInterestRateStrategy',
  LendingPoolCollateralManager = 'LendingPoolCollateralManager',
  InitializableAdminUpgradeabilityProxy = 'InitializableAdminUpgradeabilityProxy',
  LendingPoolImpl = 'LendingPoolImpl',
  LendingPoolConfiguratorImpl = 'LendingPoolConfiguratorImpl',
  LendingPoolCollateralManagerImpl = 'LendingPoolCollateralManagerImpl',
  //tokens
  AToken = 'AToken',
  DelegationAwareAToken = 'DelegationAwareAToken',
  IERC20Detailed = 'IERC20Detailed',
  StableDebtToken = 'StableDebtToken',
  VariableDebtToken = 'VariableDebtToken',
  FeeProvider = 'FeeProvider',
  TokenDistributor = 'TokenDistributor',
  WETHGateway = 'WETHGateway',
  WETH = 'WETH',
  WBNBGateway = 'WBNBGateway',
  WBNB = 'WBNB',
  //flashloan
  UniswapLiquiditySwapAdapter = 'UniswapLiquiditySwapAdapter',
  UniswapRepayAdapter = 'UniswapRepayAdapter',
  //oracles
  FlashLiquidationAdapter = 'FlashLiquidationAdapter',
  ChainlinkPriceOracle = 'ChainlinkPriceOracle',
  BandPriceOracle = 'BandPriceOracle',
  //mocks
  MockATokenV2 = 'MockATokenV2',
  MockStableDebtTokenV2 = 'MockStableDebtTokenV2',
  MockVariableDebtTokenV2 = 'MockVariableDebtTokenV2',
  MockMintableERC20 = 'MockMintableERC20',
  MockMintableDelegationERC20 = 'MockMintableDelegationERC20',
  MockWETH = 'MockWETH9',
  MockWBNB = 'MockWBNB9',
  MockSelfdestructTransfer = 'MockSelfdestructTransfer',
  MockUniswapV2Router02 = 'MockUniswapV2Router02',
  MockFlashLoanReceiver = 'MockFlashLoanReceiver',
  MockPriceOracle = 'MockPriceOracle',
  MockBandStdReference = 'MockBandStdReference',
  MockChainlinkAggregator = 'MockChainlinkAggregatorV3',
  MockChainlinkPriceFeed = 'MockChainlinkPriceFeed',
  //helpers
  StableAndVariableTokensHelper = 'StableAndVariableTokensHelper',
  ATokensAndRatesHelper = 'ATokensAndRatesHelper',
  WalletBalanceProvider = 'WalletBalanceProvider',
  ProtocolDataProvider = 'ProtocolDataProvider',
  AppDataProvider = 'AppDataProvider',
}

export enum ContractType {
  Asset = 'Asset',
  AToken = 'AToken',
  StableDebtToken = 'StableDebtToken',
  VariableDebtToken = 'VariableDebtToken',
  Protocol = 'Protocol',
  DataProvider = 'DataProvider',
}

/*
 * Error messages prefix glossary:
 *  - VL = ValidationLogic
 *  - MATH = Math libraries
 *  - AT = aToken or DebtTokens
 *  - LP = LendingPool
 *  - PR = ProviderRegistry
 *  - LPC = LendingPoolConfiguration
 *  - RL = ReserveLogic
 *  - LPCM = LendingPoolCollateralManager
 *  - P = Pausable
 */
export enum ProtocolErrors {
  //common errors
  CALLER_NOT_POOL_ADMIN = '33', // 'The caller must be the pool admin'

  //contract specific errors
  VL_INVALID_AMOUNT = '1', // 'Amount must be greater than 0'
  VL_NO_ACTIVE_RESERVE = '2', // 'Action requires an active reserve'
  VL_RESERVE_FROZEN = '3', // 'Action requires an unfrozen reserve'
  VL_CURRENT_AVAILABLE_LIQUIDITY_NOT_ENOUGH = '4', // 'The current liquidity is not enough'
  VL_NOT_ENOUGH_AVAILABLE_USER_BALANCE = '5', // 'User cannot withdraw more than the available balance'
  VL_TRANSFER_NOT_ALLOWED = '6', // 'Transfer cannot be allowed.'
  VL_BORROWING_NOT_ENABLED = '7', // 'Borrowing is not enabled'
  VL_INVALID_INTEREST_RATE_MODE_SELECTED = '8', // 'Invalid interest rate mode selected'
  VL_COLLATERAL_BALANCE_IS_0 = '9', // 'The collateral balance is 0'
  VL_HEALTH_FACTOR_LOWER_THAN_LIQUIDATION_THRESHOLD = '10', // 'Health factor is lesser than the liquidation threshold'
  VL_COLLATERAL_CANNOT_COVER_NEW_BORROW = '11', // 'There is not enough collateral to cover a new borrow'
  VL_STABLE_BORROWING_NOT_ENABLED = '12', // stable borrowing not enabled
  VL_COLLATERAL_SAME_AS_BORROWING_CURRENCY = '13', // collateral is (mostly) the same currency that is being borrowed
  VL_AMOUNT_BIGGER_THAN_MAX_LOAN_SIZE_STABLE = '14', // 'The requested amount is greater than the max loan size in stable rate mode
  VL_NO_DEBT_OF_SELECTED_TYPE = '15', // 'for repayment of stable debt, the user needs to have stable debt, otherwise, he needs to have variable debt'
  VL_NO_EXPLICIT_AMOUNT_TO_REPAY_ON_BEHALF = '16', // 'To repay on behalf of an user an explicit amount to repay is needed'
  VL_NO_STABLE_RATE_LOAN_IN_RESERVE = '17', // 'User does not have a stable rate loan in progress on this reserve'
  VL_NO_VARIABLE_RATE_LOAN_IN_RESERVE = '18', // 'User does not have a variable rate loan in progress on this reserve'
  VL_UNDERLYING_BALANCE_NOT_GREATER_THAN_0 = '19', // 'The underlying balance needs to be greater than 0'
  VL_DEPOSIT_ALREADY_IN_USE = '20', // 'User deposit is already being used as collateral'
  LP_NOT_ENOUGH_STABLE_BORROW_BALANCE = '21', // 'User does not have any stable rate loan for this reserve'
  LP_INTEREST_RATE_REBALANCE_CONDITIONS_NOT_MET = '22', // 'Interest rate rebalance conditions were not met'
  LP_LIQUIDATION_CALL_FAILED = '23', // 'Liquidation call failed'
  LP_NOT_ENOUGH_LIQUIDITY_TO_BORROW = '24', // 'There is not enough liquidity available to borrow'
  LP_REQUESTED_AMOUNT_TOO_SMALL = '25', // 'The requested amount is too small for a FlashLoan.'
  LP_INCONSISTENT_PROTOCOL_ACTUAL_BALANCE = '26', // 'The actual balance of the protocol is inconsistent'
  LP_CALLER_NOT_LENDING_POOL_CONFIGURATOR = '27', // 'The caller is not the lending pool configurator'
  LP_INCONSISTENT_FLASHLOAN_PARAMS = '28',
  CT_CALLER_MUST_BE_LENDING_POOL = '29', // 'The caller of this function must be a lending pool'
  CT_CANNOT_GIVE_ALLOWANCE_TO_HIMSELF = '30', // 'User cannot give allowance to himself'
  CT_TRANSFER_AMOUNT_NOT_GT_0 = '31', // 'Transferred amount needs to be greater than zero'
  RL_RESERVE_ALREADY_INITIALIZED = '32', // 'Reserve has already been initialized'
  LPC_RESERVE_LIQUIDITY_NOT_0 = '34', // 'The liquidity of the reserve needs to be 0'
  LPC_INVALID_ATOKEN_POOL_ADDRESS = '35', // 'The liquidity of the reserve needs to be 0'
  LPC_INVALID_STABLE_DEBT_TOKEN_POOL_ADDRESS = '36', // 'The liquidity of the reserve needs to be 0'
  LPC_INVALID_VARIABLE_DEBT_TOKEN_POOL_ADDRESS = '37', // 'The liquidity of the reserve needs to be 0'
  LPC_INVALID_STABLE_DEBT_TOKEN_UNDERLYING_ADDRESS = '38', // 'The liquidity of the reserve needs to be 0'
  LPC_INVALID_VARIABLE_DEBT_TOKEN_UNDERLYING_ADDRESS = '39', // 'The liquidity of the reserve needs to be 0'
  LPC_INVALID_ADDRESSES_PROVIDER_ID = '40', // 'The liquidity of the reserve needs to be 0'
  LPC_CALLER_NOT_EMERGENCY_ADMIN = '76', // 'The caller must be the emergencya admin'
  PR_PROVIDER_NOT_REGISTERED = '41', // 'Provider is not registered'
  LPCM_HEALTH_FACTOR_NOT_BELOW_THRESHOLD = '42', // 'Health factor is not below the threshold'
  LPCM_COLLATERAL_CANNOT_BE_LIQUIDATED = '43', // 'The collateral chosen cannot be liquidated'
  LPCM_SPECIFIED_CURRENCY_NOT_BORROWED_BY_USER = '44', // 'User did not borrow the specified currency'
  LPCM_NOT_ENOUGH_LIQUIDITY_TO_LIQUIDATE = '45', // "There isn't enough liquidity available to liquidate"
  LPCM_NO_ERRORS = '46', // 'No errors'
  LP_INVALID_FLASHLOAN_MODE = '47', //Invalid flashloan mode selected
  MATH_MULTIPLICATION_OVERFLOW = '48',
  MATH_ADDITION_OVERFLOW = '49',
  MATH_DIVISION_BY_ZERO = '50',
  RL_LIQUIDITY_INDEX_OVERFLOW = '51', //  Liquidity index overflows uint128
  RL_VARIABLE_BORROW_INDEX_OVERFLOW = '52', //  Variable borrow index overflows uint128
  RL_LIQUIDITY_RATE_OVERFLOW = '53', //  Liquidity rate overflows uint128
  RL_VARIABLE_BORROW_RATE_OVERFLOW = '54', //  Variable borrow rate overflows uint128
  RL_STABLE_BORROW_RATE_OVERFLOW = '55', //  Stable borrow rate overflows uint128
  CT_INVALID_MINT_AMOUNT = '56', //invalid amount to mint
  LP_FAILED_REPAY_WITH_COLLATERAL = '57',
  CT_INVALID_BURN_AMOUNT = '58', //invalid amount to burn
  LP_BORROW_ALLOWANCE_NOT_ENOUGH = '59', // User borrows on behalf, but allowance are too small
  LP_FAILED_COLLATERAL_SWAP = '60',
  LP_INVALID_EQUAL_ASSETS_TO_SWAP = '61',
  LP_REENTRANCY_NOT_ALLOWED = '62',
  LP_CALLER_MUST_BE_AN_ATOKEN = '63',
  LP_IS_PAUSED = '64', // 'Pool is paused'
  LP_NO_MORE_RESERVES_ALLOWED = '65',
  LP_INVALID_FLASH_LOAN_EXECUTOR_RETURN = '66',
  RC_INVALID_LTV = '67',
  RC_INVALID_LIQ_THRESHOLD = '68',
  RC_INVALID_LIQ_BONUS = '69',
  RC_INVALID_DECIMALS = '70',
  RC_INVALID_RESERVE_FACTOR = '71',
  PR_INVALID_ADDRESSES_PROVIDER_ID = '72',

  // old

  INVALID_FROM_BALANCE_AFTER_TRANSFER = 'Invalid from balance after transfer',
  INVALID_TO_BALANCE_AFTER_TRANSFER = 'Invalid from balance after transfer',
  INVALID_OWNER_REVERT_MSG = 'Ownable: caller is not the owner',
  INVALID_HF = 'Invalid health factor',
  TRANSFER_AMOUNT_EXCEEDS_BALANCE = 'ERC20: transfer amount exceeds balance',
  SAFEERC20_LOWLEVEL_CALL = 'SafeERC20: low-level call failed',
}

// DO NOT CHANGE THE VALUES IF EXISTING
export enum AddressProviderId {
  EthereumMain = 1,
  BscMain = 2,
}

export enum Oracle {
  Chainlink = 'Chainlink',
  Band = 'Band',
}

export enum NativeCurrency {
  ETH = 'ETH',
  BNB = 'BNB',
}

export interface BaseConfiguration {
  marketId: string;
  aTokenNamePrefix: string;
  stableDebtTokenNamePrefix: string;
  variableDebtTokenNamePrefix: string;
  symbolPrefix: string;
  addressProviderId: number;
  protocolGlobalConfig: ProtocolGlobalConfig;
  interestRateStrategies: InterestRateStrategyConfig[];
  oracle: Oracle;
  mockUsdPrice: string;
  nativeCurrency: NativeCurrency;
}

export interface EthereumConfiguration extends BaseConfiguration {
  assetName: EthereumPoolAsset<string>;
  reserveConfig: EthereumPoolAsset<ReserveConfig>;
  initialMarketRate: EthereumPoolAsset<MarketRate>;
  addressProvider: EthereumNetworkConfig<Address>;
  providerRegistry: EthereumNetworkConfig<Address>;
  providerRegistryOwner: EthereumNetworkConfig<Address>;
  lendingRateOracle: EthereumNetworkConfig<Address>;
  tokenDistributor: EthereumNetworkConfig<Address>;
  poolAdmin: EthereumNetworkConfig<Address>;
  emergencyAdmin: EthereumNetworkConfig<Address>;
  reserveAsset: EthereumNetworkConfig<EthereumPoolAsset<Address>>;
  weth: EthereumNetworkConfig<Address>;
  wethGateway: EthereumNetworkConfig<Address>;
  reserveFactorTreasuryAddress: EthereumNetworkConfig<Address>;
  mainOracle: EthereumNetworkConfig<Address>;
  fallbackOracle: EthereumNetworkConfig<Address>;
  chainlinkAggregator: EthereumNetworkConfig<EthereumPoolAsset<Address>>;
  bandStdReference: EthereumNetworkConfig<Address>;
  mockPoolAssetPrice: EthereumPoolAsset<string>;
  protocolDataProvider: EthereumNetworkConfig<Address>;
  appDataProvider: EthereumNetworkConfig<Address>;
  blockExplorerUrl: EthereumNetworkConfig<string>;
  uniswapRouter: EthereumNetworkConfig<Address>;
}

export interface BscConfiguration extends BaseConfiguration {
  assetName: BscPoolAsset<string>;
  reserveConfig: BscPoolAsset<ReserveConfig>;
  initialMarketRate: BscPoolAsset<MarketRate>;
  addressProvider: BscNetworkConfig<Address>;
  providerRegistry: BscNetworkConfig<Address>;
  providerRegistryOwner: BscNetworkConfig<Address>;
  lendingRateOracle: BscNetworkConfig<Address>;
  tokenDistributor: BscNetworkConfig<Address>;
  poolAdmin: BscNetworkConfig<Address>;
  emergencyAdmin: BscNetworkConfig<Address>;
  reserveAsset: BscNetworkConfig<BscPoolAsset<Address>>;
  wbnb: BscNetworkConfig<Address>;
  wbnbGateway: BscNetworkConfig<Address>;
  reserveFactorTreasuryAddress: BscNetworkConfig<Address>;
  mainOracle: BscNetworkConfig<Address>;
  fallbackOracle: BscNetworkConfig<Address>;
  chainlinkAggregator: BscNetworkConfig<BscPoolAsset<Address>>;
  bandStdReference: BscNetworkConfig<Address>;
  mockPoolAssetPrice: BscPoolAsset<string>;
  protocolDataProvider: BscNetworkConfig<Address>;
  appDataProvider: BscNetworkConfig<Address>;
  blockExplorerUrl: BscNetworkConfig<string>;
  uniswapRouter: BscNetworkConfig<Address>;
}

export type MarketConfiguration = EthereumConfiguration | BscConfiguration;

export interface ReserveConfig extends ReserveBorrowConfig, ReserveCollateralConfig {
  aTokenImpl: ContractId;
  reserveFactor: BigNumber;
  strategy: InterestRateStrategyConfig;
}

export interface ReserveBorrowConfig {
  borrowingEnabled: boolean;
  stableBorrowRateEnabled: boolean;
  reserveDecimals: number;
}

export interface ReserveCollateralConfig {
  baseLTVAsCollateral: BigNumber;
  liquidationThreshold: BigNumber;
  liquidationBonus: BigNumber;
}

export enum InterestRateStrategyName {
  rateStrategyStableOne = 'rateStrategyStableOne',
  rateStrategyStableTwo = 'rateStrategyStableTwo',
  rateStrategyStableThree = 'rateStrategyStableThree',
  rateStrategyETH = 'rateStrategyETH',
  rateStrategyBNB = 'rateStrategyBNB',
  rateStrategyACCRUE = 'rateStrategyACCRUE',
  rateStrategyVolatileOne = 'rateStrategyVolatileOne',
  rateStrategyVolatileTwo = 'rateStrategyVolatileTwo',
  rateStrategyVolatileThree = 'rateStrategyVolatileThree',
  rateStrategyVolatileFour = 'rateStrategyVolatileFour',
}

export interface InterestRateStrategyConfig {
  name: InterestRateStrategyName;
  optimalUtilizationRate: BigNumber;
  baseVariableBorrowRate: BigNumber;
  variableRateSlope1: BigNumber;
  variableRateSlope2: BigNumber;
  stableRateSlope1: BigNumber;
  stableRateSlope2: BigNumber;
}

export type BasePoolAsset<T> = Record<AssetId, T>;

export type BasePoolAssetWithoutUSD<T> = Omit<BasePoolAsset<T>, AssetId.USD>;

export type EthereumMainPoolAsset<T> = Pick<
  BasePoolAssetWithoutUSD<T>,
  | AssetId.BAT
  | AssetId.BTC
  | AssetId.BUSD
  | AssetId.DAI
  | AssetId.LINK
  | AssetId.UNI
  | AssetId.USDC
  | AssetId.USDT
  | AssetId.WNATIVE
  | AssetId.YFI
  | AssetId.ZRX
>;

export type BscMainPoolAsset<T> = Pick<
  BasePoolAssetWithoutUSD<T>,
  // | AssetId.ADA
  // | AssetId.BAND
  // | AssetId.BCH
  | AssetId.BTC
  // | AssetId.BUSD
  | AssetId.DAI
  // | AssetId.DOT
  | AssetId.ETH
  | AssetId.LINK
  // | AssetId.LTC
  | AssetId.USDC
  // | AssetId.USDT
  | AssetId.WNATIVE
  // | AssetId.XRP
>;

export type EthereumPoolAsset<T> = EthereumMainPoolAsset<T>;

export type BscPoolAsset<T> = BscMainPoolAsset<T>;

export type PoolAsset<T> = EthereumPoolAsset<T> | BscPoolAsset<T>;

export enum Network {
  hardhat = 'hardhat',
  localhost = 'localhost',
  kovan = 'kovan',
  mainnet = 'mainnet',
  ropsten = 'ropsten',
  tenderlyMain = 'tenderlyMain',
  bsctestnet = 'bsctestnet',
  bscmainnet = 'bscmainnet',
}

export enum ChainId {
  // MAINNET = 1,
  // ROPSTEN = 3,
  // RINKEBY = 4,
  // GÖRLI = 5,
  // KOVAN = 42,
  // BSC_MAINNET = 56,
  bscTestnet = 97,
  hardhat = 31337,
  localhost = 31337,
}

export type BscNetwork = Network.localhost | Network.bscmainnet | Network.bsctestnet;

export type EthereumNetwork =
  | Network.localhost
  | Network.mainnet
  | Network.kovan
  | Network.ropsten
  | Network.tenderlyMain;

export type BaseNetworkConfig<T> = Record<Network, T>;

export type EthereumNetworkConfig<T> = Pick<BaseNetworkConfig<T>, EthereumNetwork>;

export type BscNetworkConfig<T> = Pick<BaseNetworkConfig<T>, BscNetwork>;

export type NetworkConfig<T> = BaseNetworkConfig<T> | EthereumNetworkConfig<T> | BscNetworkConfig<T>;

export type Address = string;

export type ProtocolGlobalConfig = {
  TokenDistributorPercentageBase: BigNumber;
  priceUSDAddress: Address;
  Referral: string;
};

export type MockConfig = {
  UsdPriceInWei: BigNumber;
  PoolAssetPrice: PoolAsset<BigNumber>;
};

export type MarketRate = {
  borrowRate: BigNumber;
};

export type DbSchema = Record<ContractId, ContractDeployResult>;

export interface ContractDeployResult {
  network: string;
  address: string;
  deployer: string;
}

export type InitReserveInput = {
  aTokenImpl: string;
  stableDebtTokenImpl: string;
  variableDebtTokenImpl: string;
  underlyingAssetDecimals: BigNumberish;
  interestRateStrategyAddress: string;
  underlyingAsset: string;
  treasury: string;
  incentivesController: string;
  underlyingAssetName: string;
  aTokenName: string;
  aTokenSymbol: string;
  variableDebtTokenName: string;
  variableDebtTokenSymbol: string;
  stableDebtTokenName: string;
  stableDebtTokenSymbol: string;
  params: string;
};

export type ConfigReserveInput = {
  assetId: string;
  asset: NonNullable<Address>;
  baseLTVAsCollateral: BigNumberish;
  liquidationThreshold: BigNumberish;
  liquidationBonus: BigNumberish;
  reserveFactor: BigNumberish;
  stableBorrowRateEnabled: boolean;
  underlyingAssetName: string;
};

export type InterestRateStrategyInput = {
  addressProviderAddress: NonNullable<Address>;
  optimalUtilizationRate: NonNullable<BigNumberish>;
  baseVariableBorrowRate: NonNullable<BigNumberish>;
  variableRateSlope1: NonNullable<BigNumberish>;
  variableRateSlope2: NonNullable<BigNumberish>;
  stableRateSlope1: NonNullable<BigNumberish>;
  stableRateSlope2: NonNullable<BigNumberish>;
};

export enum RateMode {
  None = '0',
  Stable = '1',
  Variable = '2',
}

// for testing

export type WGateway = WETHGateway | WBNBGateway;

export type ContractRecord = {
  addressProvider: AddressProvider;
  providerRegistry: ProviderRegistry;
  configurator: LendingPoolConfigurator;
  lendingPool: LendingPool;
  protocolDataProvider: ProtocolDataProvider;
  lendingRateOracle: LendingRateOracle;
  wGateway: WGateway;
  priceOracle: IPriceOracleGetter;
  uniswapLiquiditySwapAdapter: UniswapLiquiditySwapAdapter;
  uniswapRepayAdapter: UniswapRepayAdapter;
  flashLiquidationAdapter: FlashLiquidationAdapter;
  // mocks
  mockFlashloanReceiver: MockFlashLoanReceiver;
  mockUniswapRouter: MockUniswapV2Router02;
  mockPriceOracleSetter: IPriceOracleSetter;
};

export type ERC20Token = MockMintableERC20 | MockWETH9;

export type TokenRecord = {
  asset: PoolAsset<ERC20Token>;
  aToken: PoolAsset<AToken | DelegationAwareAToken>;
  sdToken: PoolAsset<StableDebtToken>;
  vdToken: PoolAsset<VariableDebtToken>;
};

export type User = {
  address: string;
  name: string;
} & ContractRecord &
  TokenRecord;

export type Fixture = {
  deployer: User;
  admin: User;
  emergencyAdmin: User;
  user1: User;
  user2: User;
  user3: User;
  user4: User;
  user5: User;
  liquidator: User;
  marketConfig: MarketConfiguration;
} & ContractRecord &
  TokenRecord;

export type ExpectedTxResult = TxSuccess | TxFail;

export type TxSuccess = Record<string, never>;

export type TxFail = {
  revertMessage: NonNullable<string>;
};

export type ReserveData = {
  totalLiquidity: BigNumber;
  utilizationRate: BigNumber;
  availableLiquidity: BigNumber;
  totalStableDebt: BigNumber;
  totalVariableDebt: BigNumber;
  liquidityRate: BigNumber;
  variableBorrowRate: BigNumber;
  stableBorrowRate: BigNumber;
  liquidityIndex: BigNumber;
  variableBorrowIndex: BigNumber;
  averageStableBorrowRate: BigNumber;
  principalStableDebt: BigNumber;
  scaledVariableDebt: BigNumber;
  marketStableRate: BigNumber;
  lastUpdateTimestamp: number;
  totalStableDebtLastUpdated: number;
  interestRateStrategy: InterestRateStrategy;
  reserveConfigData: ReserveConfigData;
};

export type InterestRateStrategy = DefaultInterestRateStrategy;

export type DefaultInterestRateStrategy = {
  optimalUtilizationRate: BigNumber;
  excessUtilizationRate: BigNumber;
  baseVariableBorrowRate: BigNumber;
  variableRateSlope1: BigNumber;
  variableRateSlope2: BigNumber;
  stableRateSlope1: BigNumber;
  stableRateSlope2: BigNumber;
};

export type ReserveConfigData = {
  decimals: BigNumber;
  ltv: BigNumber;
  liquidationThreshold: BigNumber;
  liquidationBonus: BigNumber;
  reserveFactor: BigNumber;
  usageAsCollateralEnabled: boolean;
  borrowingEnabled: boolean;
  stableBorrowRateEnabled: boolean;
  isActive: boolean;
  isFrozen: boolean;
};

export type UserData = {
  walletBalance: BigNumber;
  scaledATokenBalance: BigNumber;
  currentATokenBalance: BigNumber;
  currentStableDebt: BigNumber;
  currentVariableDebt: BigNumber;
  principalStableDebt: BigNumber;
  scaledVariableDebt: BigNumber;
  stableBorrowRate: BigNumber;
  liquidityRate: BigNumber;
  usageAsCollateralEnabled: boolean;
  stableRateLastUpdated: number;
};
