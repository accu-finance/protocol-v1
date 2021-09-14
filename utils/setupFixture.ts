import {Contract} from 'ethers';
import {deployments, ethers, getNamedAccounts} from 'hardhat';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
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
import {
  AddressProviderId,
  AssetId,
  ContractId,
  ContractRecord,
  ERC20Token,
  Fixture,
  NativeCurrency,
  Oracle,
  PoolAsset,
  TokenRecord,
  User,
  WGateway,
} from '../types';
import {enumKeys} from '../utils';
import getMarketConfig from '../utils/getMarketConfig';
import {getContractAt} from './contractGetter';

export const setupFixture = deployments.createFixture(async (hre: HardhatRuntimeEnvironment) => {
  const addressProviderId: AddressProviderId | undefined =
    AddressProviderId[AddressProviderId[process.env.ADDRESS_PROVIDER_ID as any] as keyof typeof AddressProviderId];
  if (!addressProviderId) {
    throw new Error(`unsupported market  id '${process.env.ADDRESS_PROVIDER_ID}'`);
  }

  const marketConfig = getMarketConfig(addressProviderId);

  await deployments.fixture(['testEnv']);

  // non proxy contract
  const addressProvider = (await ethers.getContract(ContractId.AddressProvider)) as AddressProvider;
  const providerRegistry = (await ethers.getContract(ContractId.ProviderRegistry)) as ProviderRegistry;
  const protocolDataProvider = (await ethers.getContract(ContractId.ProtocolDataProvider)) as ProtocolDataProvider;
  const lendingRateOracle = (await ethers.getContract(ContractId.LendingRateOracle)) as LendingRateOracle;
  const uniswapLiquiditySwapAdapter = (await ethers.getContract(
    ContractId.UniswapLiquiditySwapAdapter
  )) as UniswapLiquiditySwapAdapter;
  const uniswapRepayAdapter = (await ethers.getContract(ContractId.UniswapRepayAdapter)) as UniswapRepayAdapter;
  const flashLiquidationAdapter = (await ethers.getContract(
    ContractId.FlashLiquidationAdapter
  )) as FlashLiquidationAdapter;
  // mock contracts
  const mockFlashloanReceiver = (await ethers.getContract(ContractId.MockFlashLoanReceiver)) as MockFlashLoanReceiver;
  const mockUniswapRouter = (await ethers.getContract(ContractId.MockUniswapV2Router02)) as MockUniswapV2Router02;

  let wGateway: WGateway;
  if (marketConfig.nativeCurrency === NativeCurrency.ETH) {
    wGateway = (await ethers.getContract(ContractId.WETHGateway)) as WETHGateway;
  } else {
    wGateway = (await ethers.getContract(ContractId.WBNBGateway)) as WBNBGateway;
  }

  // proxy contracts
  const configurator = await getContractAt<LendingPoolConfigurator>(
    hre,
    ContractId.LendingPoolConfigurator,
    await addressProvider.getLendingPoolConfigurator()
  );
  const lendingPool = await getContractAt<LendingPool>(
    hre,
    ContractId.LendingPool,
    await addressProvider.getLendingPool()
  );
  const priceOracle = await getContractAt<IPriceOracleGetter>(
    hre,
    ContractId.MockPriceOracle,
    await addressProvider.getPriceOracle()
  );

  let mockPriceOracleSetter: IPriceOracleSetter;
  if (marketConfig.oracle === Oracle.Chainlink) {
    mockPriceOracleSetter = (await ethers.getContract(ContractId.MockChainlinkPriceFeed)) as IPriceOracleSetter;
  } else {
    mockPriceOracleSetter = (await ethers.getContract(ContractId.MockBandStdReference)) as IPriceOracleSetter;
  }

  const asset = {} as PoolAsset<ERC20Token>;
  const aToken = {} as PoolAsset<AToken | DelegationAwareAToken>;
  const sdToken = {} as PoolAsset<StableDebtToken>;
  const vdToken = {} as PoolAsset<VariableDebtToken>;
  for (const assetId of enumKeys(marketConfig.reserveConfig)) {
    if (assetId === AssetId.WNATIVE) {
      asset[assetId] = (await ethers.getContract(assetId)) as MockWETH9;
    } else {
      asset[assetId] = (await ethers.getContract(assetId)) as MockMintableERC20;
    }

    // aToken and debtToken are proxy contract in lending pool. have to query via lendingPool
    const reserveData = await lendingPool.getReserveData(asset[assetId].address);
    aToken[assetId] = await getContractAt<AToken>(hre, ContractId.AToken, reserveData.aTokenAddress);
    sdToken[assetId] = await getContractAt<StableDebtToken>(
      hre,
      ContractId.StableDebtToken,
      reserveData.stableDebtTokenAddress
    );
    vdToken[assetId] = await getContractAt<VariableDebtToken>(
      hre,
      ContractId.VariableDebtToken,
      reserveData.variableDebtTokenAddress
    );
  }

  const contract: ContractRecord = {
    addressProvider,
    providerRegistry,
    protocolDataProvider,
    configurator,
    lendingPool,
    lendingRateOracle,
    wGateway,
    priceOracle,
    mockFlashloanReceiver,
    mockUniswapRouter,
    uniswapLiquiditySwapAdapter,
    uniswapRepayAdapter,
    flashLiquidationAdapter,
    mockPriceOracleSetter,
  };
  const tokenRecord: TokenRecord = {
    asset,
    aToken,
    sdToken,
    vdToken,
  };
  const {deployer, admin, emergencyAdmin, user1, user2, user3, user4, user5, liquidator} = await getNamedAccounts();

  return {
    ...contract,
    asset,
    aToken,
    sdToken,
    vdToken,
    deployer: await setupUser(deployer, contract, tokenRecord, 'deployer'),
    admin: await setupUser(admin, contract, tokenRecord, 'admin'),
    emergencyAdmin: await setupUser(emergencyAdmin, contract, tokenRecord, 'emergencyAdmin'),
    user1: await setupUser(user1, contract, tokenRecord, 'user1'),
    user2: await setupUser(user2, contract, tokenRecord, 'user2'),
    user3: await setupUser(user3, contract, tokenRecord, 'user3'),
    user4: await setupUser(user4, contract, tokenRecord, 'user4'),
    user5: await setupUser(user5, contract, tokenRecord, 'user5'),
    liquidator: await setupUser(liquidator, contract, tokenRecord, 'liquidator'),
    marketConfig: marketConfig,
  } as Fixture;
});

export default setupFixture;

async function _setupUsers(addresses: string[], contracts: ContractRecord, tokens: TokenRecord): Promise<User[]> {
  const users = [] as User[];
  for (const address of addresses) {
    users.push(await setupUser(address, contracts, tokens));
  }
  return users;
}

async function setupUser<T extends {[contractName: string]: Contract}>(
  address: string,
  contract: T,
  {asset, aToken, sdToken, vdToken}: TokenRecord,
  name?: string
): Promise<User & T> {
  const signer = await ethers.getSigner(address);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user: any = {address, name: name ? name : address} as User & T;
  for (const key of enumKeys(contract)) {
    user[key] = contract[key].connect(signer);
  }

  const _poolAsset = {} as PoolAsset<ERC20Token>;
  for (const assetId of enumKeys(asset)) {
    _poolAsset[assetId] = asset[assetId].connect(signer);
  }
  user.asset = _poolAsset;

  const _aToken = {} as PoolAsset<AToken>;
  for (const assetId of enumKeys(aToken)) {
    _aToken[assetId] = aToken[assetId].connect(signer);
  }
  user.aToken = _aToken;

  const _sdToken = {} as PoolAsset<StableDebtToken>;
  for (const assetId of enumKeys(sdToken)) {
    _sdToken[assetId] = sdToken[assetId].connect(signer);
  }
  user.sdToken = _sdToken;

  const _vdToken = {} as PoolAsset<VariableDebtToken>;
  for (const assetId of enumKeys(vdToken)) {
    _vdToken[assetId] = vdToken[assetId].connect(signer);
  }
  user.vdToken = _vdToken;

  return user;
}
