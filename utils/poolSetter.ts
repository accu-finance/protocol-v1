import {BigNumber, constants} from 'ethers';
import _ from 'lodash';
import {AddressProvider, LendingPoolConfigurator, LendingRateOracle, StableAndVariableTokensHelper} from '../typechain';
import {
  Address,
  AssetId,
  ConfigReserveInput,
  ContractId,
  InitReserveInput,
  InterestRateStrategyInput,
  InterestRateStrategyName,
  MarketConfiguration,
  MarketRate,
  Network,
  PoolAsset,
} from '../types';
import {
  deployAToken,
  deployDefaultReserveInterestRateStrategy,
  deployDelegationAwareAToken,
  deployStableDebtToken,
  deployVariableDebtToken,
} from './contractDeployer';
import {getContractAt} from './contractGetter';
import {waitForTx} from './hhNetwork';
import {enumKeys} from './index';

const {AddressZero} = constants;

export const initMarketRates = async (
  marketConfig: MarketConfiguration,
  poolAsset: PoolAsset<Address>,
  marketRate: PoolAsset<MarketRate>,
  landingRateOracleAddress: Address
): Promise<void> => {
  const lendingRateOracle = await getContractAt<LendingRateOracle>(
    ContractId.LendingRateOracle,
    landingRateOracleAddress
  );

  for (const assetId of enumKeys(poolAsset)) {
    await waitForTx(await lendingRateOracle.setMarketBorrowRate(poolAsset[assetId], marketRate[assetId].borrowRate));
    console.log(
      `  set Oracle borrow rate ${assetId === AssetId.WNATIVE ? marketConfig.nativeCurrency : assetId} ${
        marketRate[assetId].borrowRate
      }`
    );
  }
};

export const initReserves = async (
  marketConfig: MarketConfiguration,
  network: Network,
  poolAssetAddress: PoolAsset<Address>,
  lendingPoolAddressProvider: AddressProvider,
  chunkSize = 1
): Promise<void> => {
  const {
    aTokenNamePrefix,
    stableDebtTokenNamePrefix,
    variableDebtTokenNamePrefix,
    reserveFactorTreasuryAddress,
    symbolPrefix,
    reserveConfig,
    interestRateStrategies,
    nativeCurrency,
  } = marketConfig;
  const lendingPoolConfigurator = await getContractAt<LendingPoolConfigurator>(
    ContractId.LendingPoolConfigurator,
    await lendingPoolAddressProvider.getLendingPoolConfigurator()
  );

  // deploy interestRateStrategy contracts
  const strategyAddress = {} as Record<InterestRateStrategyName, Address>;
  for (const strategy of interestRateStrategies) {
    const {
      optimalUtilizationRate,
      baseVariableBorrowRate,
      variableRateSlope1,
      variableRateSlope2,
      stableRateSlope1,
      stableRateSlope2,
    } = strategy;
    const reserveInterestRateStrategy = await deployDefaultReserveInterestRateStrategy(strategy.name, {
      addressProviderAddress: lendingPoolAddressProvider.address,
      optimalUtilizationRate,
      baseVariableBorrowRate,
      variableRateSlope1,
      variableRateSlope2,
      stableRateSlope1,
      stableRateSlope2,
    } as InterestRateStrategyInput);
    strategyAddress[strategy.name] = reserveInterestRateStrategy.address;
  }

  const inputs: InitReserveInput[] = [];
  for (const assetId of enumKeys(poolAssetAddress)) {
    const assetName = assetId === AssetId.WNATIVE ? nativeCurrency : assetId;
    const aTokenImplAddress =
      reserveConfig[assetId].aTokenImpl === ContractId.AToken
        ? (await deployAToken(assetId, assetName)).address
        : (await deployDelegationAwareAToken(assetId, assetName)).address;
    const stableDebtTokenImplementationAddress = (await deployStableDebtToken(assetId, assetName)).address;
    const variableDebtTokenImplementationAddress = (await deployVariableDebtToken(assetId, assetName)).address;

    const {reserveDecimals, strategy} = reserveConfig[assetId];
    const assetAddress = poolAssetAddress[assetId];
    // @ts-ignore
    const treasuryAddress = reserveFactorTreasuryAddress[network];

    if (!strategyAddress[strategy.name]) {
      throw new Error(`no strategyAddress for ${strategy.name}`);
    }

    inputs.push({
      aTokenName: `${aTokenNamePrefix} ${assetName}`,
      aTokenSymbol: `a${symbolPrefix}${assetName}`,
      aTokenImpl: aTokenImplAddress,
      variableDebtTokenName: `${variableDebtTokenNamePrefix} ${symbolPrefix}${assetName}`,
      variableDebtTokenSymbol: `vd${symbolPrefix}${assetName}`,
      variableDebtTokenImpl: variableDebtTokenImplementationAddress,
      stableDebtTokenName: `${stableDebtTokenNamePrefix} ${symbolPrefix}${assetName}`,
      stableDebtTokenSymbol: `sd${symbolPrefix}${assetName}`,
      stableDebtTokenImpl: stableDebtTokenImplementationAddress,
      underlyingAssetName: assetName,
      underlyingAsset: assetAddress,
      underlyingAssetDecimals: reserveDecimals,
      interestRateStrategyAddress: strategyAddress[strategy.name],
      treasury: treasuryAddress,
      incentivesController: AddressZero,
      params: '0x10',
    } as InitReserveInput);
  }

  const chunkedInputs = _.chunk(inputs, chunkSize);

  console.log(`split initReserveInputs into ${chunkedInputs.length} chunks`);
  for (let i = 0; i < chunkedInputs.length; i++) {
    const chunk = chunkedInputs[i];
    await waitForTx(await lendingPoolConfigurator.batchInitReserve(chunk));
    console.log(`  [${i + 1}] init reserve for ${chunk.map((e) => e.underlyingAssetName)}`);
  }
};

export const configureReserves = async (
  marketConfig: MarketConfiguration,
  poolAssetAddress: PoolAsset<Address>,
  lendingPoolAddressProvider: AddressProvider
): Promise<void> => {
  const {reserveConfig, nativeCurrency} = marketConfig;
  const lendingPoolConfigurator = await getContractAt<LendingPoolConfigurator>(
    ContractId.LendingPoolConfigurator,
    await lendingPoolAddressProvider.getLendingPoolConfigurator()
  );

  const inputs: ConfigReserveInput[] = [];

  for (const assetId of enumKeys(poolAssetAddress)) {
    const {baseLTVAsCollateral, liquidationBonus, liquidationThreshold, reserveFactor, stableBorrowRateEnabled} =
      reserveConfig[assetId];

    inputs.push({
      assetId,
      asset: poolAssetAddress[assetId],
      baseLTVAsCollateral,
      liquidationThreshold,
      liquidationBonus,
      reserveFactor,
      stableBorrowRateEnabled,
      underlyingAssetName: assetId === AssetId.WNATIVE ? nativeCurrency : assetId,
    });
  }

  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];
    await waitForTx(
      await lendingPoolConfigurator.configureReserveAsCollateral(
        input.asset,
        input.baseLTVAsCollateral,
        input.liquidationThreshold,
        input.liquidationBonus
      )
    );
    await waitForTx(await lendingPoolConfigurator.enableBorrowingOnReserve(input.asset, input.stableBorrowRateEnabled));
    await waitForTx(await lendingPoolConfigurator.setReserveFactor(input.asset, input.reserveFactor));
    console.log(`  [${i + 1}] config reserve for ${input.underlyingAssetName}`);
  }
};

export const mapAssetsSourcesAddressPairs = (
  assetAddress: PoolAsset<Address>,
  sourceAddress: PoolAsset<Address>
): [Address[], Address[]] => {
  const assets: Address[] = [];
  const sources: Address[] = [];
  for (const assetId of enumKeys(assetAddress)) {
    assets.push(assetAddress[assetId]);
    sources.push(sourceAddress[assetId]);
  }
  return [assets, sources];
};

export const mapAssetsBorrowRateAddressPairs = (
  assetAddress: PoolAsset<Address>,
  marketRate: PoolAsset<MarketRate>
): [AssetId[], Address[], BigNumber[]] => {
  const ids: AssetId[] = [];
  const assets: Address[] = [];
  const rates: BigNumber[] = [];
  for (const assetId of enumKeys(assetAddress)) {
    ids.push(assetId);
    assets.push(assetAddress[assetId]);
    rates.push(marketRate[assetId].borrowRate);
  }
  return [ids, assets, rates];
};

export const setInitialMarketRatesInRatesOracleByHelper = async (
  poolAsset: PoolAsset<Address>,
  marketRate: PoolAsset<MarketRate>,
  landingRateOracleAddress: Address,
  stableAndVariableTokensHelperAddress: Address,
  admin: Address
): Promise<void> => {
  const lendingRateOracle = await getContractAt<LendingRateOracle>(
    ContractId.LendingRateOracle,
    landingRateOracleAddress
  );
  const stableAndVariableTokensHelper = await getContractAt<StableAndVariableTokensHelper>(
    ContractId.StableAndVariableTokensHelper,
    stableAndVariableTokensHelperAddress
  );

  const [ids, assets, rates] = mapAssetsBorrowRateAddressPairs(poolAsset, marketRate);

  await waitForTx(await lendingRateOracle.transferOwnership(stableAndVariableTokensHelper.address));
  await waitForTx(await stableAndVariableTokensHelper.setOracleBorrowRates(assets, rates, lendingRateOracle.address));
  for (const [id, , rate] of _.zip(ids, assets, rates)) {
    console.log(`  set Oracle borrow rate ${id} ${rate}`);
  }

  await waitForTx(await stableAndVariableTokensHelper.setOracleOwnership(lendingRateOracle.address, admin));
};
