import {BigNumber} from 'ethers';
import {task, types} from 'hardhat/config';
import {AddressProvider, IStdReference, ProviderRegistry} from '../typechain';
import {
  Address,
  AddressProviderId,
  AssetId,
  BscConfiguration,
  BscNetwork,
  ContractId,
  EthereumConfiguration,
  EthereumNetwork,
  NativeCurrency,
  Network,
} from '../types';
import {enumKeys, parseNetworkAddressProvider} from '../utils';
import {
  deployAddressProvider,
  deployProviderRegistry,
  deployUniswapLiquiditySwapAdapter,
  deployUniswapRepayAdapter,
} from '../utils/contractDeployer';
import {getContractAt} from '../utils/contractGetter';
import getMarketConfig from '../utils/getMarketConfig';

task('deploy:provider-registry', 'Deploys ProviderRegistry Contract').setAction(async (args, hre) => {
  await deployProviderRegistry(hre);
});

task('deploy:address-provider', 'Deploys AddressProvider Contract')
  .addParam('marketId', 'Market Id description', undefined, types.string)
  .setAction(async (args, hre) => {
    await deployAddressProvider(hre, args.marketId);
  });

task('deploy:uniswap-liquidity-swap-adapter', 'Deploys UniswapLiquiditySwapAdapter Contract')
  // .addParam('addressProvider', 'Address Provider Address', undefined, types.string)
  // .addParam('uniswapRouter', 'Uniswap Router Address', undefined, types.string)
  // .addParam('weth', 'WETH Address', undefined, types.string)
  .addParam('addressProviderId', 'A unique Address Provider id', undefined, types.int)
  .setAction(async (args, hre) => {
    const {addressProviderId, network} = parseNetworkAddressProvider(hre.network.name, args.addressProviderId);
    const {addressProvider, uniswapRouter, nativeCurrency} = getMarketConfig(addressProviderId);

    // @ts-ignore
    const addressProviderAddress = addressProvider[network];
    if (!addressProviderAddress) {
      throw new Error('AddressProvider must be set');
    }

    // @ts-ignore
    const uniswapRouterAddress = uniswapRouter[network];
    if (!uniswapRouterAddress) {
      throw new Error('uniswapRouterAddress must be set');
    }

    let weth: Address | undefined;
    if (nativeCurrency === NativeCurrency.ETH) {
      const market = getMarketConfig(addressProviderId) as EthereumConfiguration;
      weth = market.weth[network as EthereumNetwork];
    } else if (nativeCurrency == NativeCurrency.BNB) {
      const market = getMarketConfig(addressProviderId) as BscConfiguration;
      weth = market.wbnb[network as BscNetwork];
    }
    if (!weth || weth === '') {
      throw new Error('wnative must be set');
    }

    const addressProviderContract = await getContractAt<AddressProvider>(
      hre,
      ContractId.AddressProvider,
      addressProviderAddress
    );

    const priceOracle = await addressProviderContract.getPriceOracle();
    if (!priceOracle) {
      throw new Error('priceOracle must be set on AddressProvider');
    }

    const uniswapLiquiditySwapAdapter = await deployUniswapLiquiditySwapAdapter(
      hre,
      addressProviderAddress,
      uniswapRouterAddress,
      weth
    );
    console.log(`> deploy UniswapLiquiditySwapAdapter at ${uniswapLiquiditySwapAdapter.address}`);
  });

task('deploy:uniswap-repay-adapter', 'Deploys UniswapRepayAdapter Contract')
  .addParam('addressProviderId', 'A unique Address Provider id', undefined, types.int)
  .setAction(async (args, hre) => {
    const {addressProviderId, network} = parseNetworkAddressProvider(hre.network.name, args.addressProviderId);
    const {addressProvider, uniswapRouter, nativeCurrency} = getMarketConfig(addressProviderId);

    // @ts-ignore
    const addressProviderAddress = addressProvider[network];
    if (!addressProviderAddress) {
      throw new Error('AddressProvider must be set');
    }

    // @ts-ignore
    const uniswapRouterAddress = uniswapRouter[network];
    if (!uniswapRouterAddress) {
      throw new Error('uniswapRouterAddress must be set');
    }

    let weth: Address | undefined;
    if (nativeCurrency === NativeCurrency.ETH) {
      const market = getMarketConfig(addressProviderId) as EthereumConfiguration;
      weth = market.weth[network as EthereumNetwork];
    } else if (nativeCurrency == NativeCurrency.BNB) {
      const market = getMarketConfig(addressProviderId) as BscConfiguration;
      weth = market.wbnb[network as BscNetwork];
    }
    if (!weth || weth === '') {
      throw new Error('wnative must be set');
    }

    const addressProviderContract = await getContractAt<AddressProvider>(
      hre,
      ContractId.AddressProvider,
      addressProviderAddress
    );

    const priceOracle = await addressProviderContract.getPriceOracle();
    if (!priceOracle) {
      throw new Error('priceOracle must be set on AddressProvider');
    }

    const uniswapRepayAdapter = await deployUniswapRepayAdapter(
      hre,
      addressProviderAddress,
      uniswapRouterAddress,
      weth
    );
    console.log(`> deploy UniswapRepayAdapter at ${uniswapRepayAdapter.address}`);
  });

task('register-market', 'Register address provider to registry')
  .addParam('addressProvider', 'Address Provider Address', undefined, types.string)
  .addParam('addressProviderId', 'A unique Address Provider id', undefined, types.int)
  .addParam('providerRegistry', 'Provider Reistry Address', undefined, types.string)
  .setAction(async (args, hre) => {
    const {addressProviderId} = parseNetworkAddressProvider(hre.network.name, args.addressProviderId);
    const addressProvider = await getContractAt<AddressProvider>(hre, ContractId.AddressProvider, args.addressProvider);
    const providerRegistry = await getContractAt<ProviderRegistry>(
      hre,
      ContractId.ProviderRegistry,
      args.providerRegistry
    );

    await providerRegistry.registerAddressProvider(addressProvider.address, BigNumber.from(args.addressProviderId));
    console.log(
      `> registered address provider ${addressProvider.address} as ${addressProviderId} at Provider Registry ${providerRegistry.address}`
    );
  });

task('pricefeed:bsc:band', 'Fetch Price Feed from Band Oracle Contract on BSC networks')
  .addParam('addressProviderId', 'Address Provider id', undefined, types.int)
  .setAction(async (args, hre) => {
    const {network, addressProviderId} = parseNetworkAddressProvider(hre.network.name, args.addressProviderId);
    if (network !== Network.bscmainnet && network !== Network.bsctestnet) {
      throw new Error(`Band Price Feed available only on network ${Network.bscmainnet} | ${Network.bsctestnet}`);
    }
    if (addressProviderId !== AddressProviderId.BscMain) {
      throw new Error(`AddressProviderId ${addressProviderId} on ${network} not supported`);
    }

    const {reserveConfig, bandStdReference} = getMarketConfig(addressProviderId);

    const bases = ['USD'] as string[];
    const quotes = ['BNB'] as string[];
    const assets = ['USD'] as string[];
    for (const assetId of enumKeys(reserveConfig)) {
      if (assetId == AssetId.WNATIVE) {
        bases.push('BNB');
      } else {
        bases.push(assetId);
      }

      quotes.push('BNB');
      assets.push(assetId);
    }

    // @ts-ignore
    const address = bandStdReference[network];
    if (!address) {
      throw new Error(`Band Std Referece must be provided, got ${address}`);
    }
    console.log(`> using Band Standard Reference address at ${address}`);

    const stdReference = (await getContractAt(hre, 'IStdReference', address)) as IStdReference;
    const data = await stdReference.getReferenceDataBulk(bases, quotes);
    const prices: Record<string, string> = {};
    console.log('=== Pairs ===');
    for (let i = 0; i < bases.length; i++) {
      console.log(`${bases[i]}/${quotes[i]} = ${data[i].rate.toWadUnit()}`);
      prices[assets[i]] = data[i].rate.toString();
    }
    console.log('\n=== Result ===\n', JSON.stringify(prices));
  });
