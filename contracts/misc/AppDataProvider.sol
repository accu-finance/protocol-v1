// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import {IERC20Detailed} from "../dependencies/openzeppelin/contracts/IERC20Detailed.sol";
import {IERC20} from "../dependencies/openzeppelin/contracts/IERC20.sol";
import {IAddressProvider} from "../interfaces/IAddressProvider.sol";
import {IAppDataProvider} from "./interfaces/IAppDataProvider.sol";
import {ILendingPool} from "../interfaces/ILendingPool.sol";
import {IPriceOracleGetter} from "../interfaces/IPriceOracleGetter.sol";
import {IAToken} from "../interfaces/IAToken.sol";
import {IVariableDebtToken} from "../interfaces/IVariableDebtToken.sol";
import {IStableDebtToken} from "../interfaces/IStableDebtToken.sol";
import {WadRayMath} from "../protocol/libraries/math/WadRayMath.sol";
import {ReserveConfiguration} from "../protocol/libraries/configuration/ReserveConfiguration.sol";
import {UserConfiguration} from "../protocol/libraries/configuration/UserConfiguration.sol";
import {DataTypes} from "../protocol/libraries/types/DataTypes.sol";
import {DefaultReserveInterestRateStrategy} from "../protocol/lendingpool/DefaultReserveInterestRateStrategy.sol";

contract AppDataProvider is IAppDataProvider {
  using WadRayMath for uint256;
  using ReserveConfiguration for DataTypes.ReserveConfigurationMap;
  using UserConfiguration for DataTypes.UserConfigurationMap;

  address public constant MOCK_USD_ADDRESS = 0x10F7Fc1F91Ba351f9C629c5947AD69bD03C05b96;

  IAddressProvider public immutable ADDRESSES_PROVIDER;

  constructor(IAddressProvider addressProvider) public {
    ADDRESSES_PROVIDER = addressProvider;
  }

  function getInterestRateStrategySlopes(DefaultReserveInterestRateStrategy interestRateStrategy)
    internal
    view
    returns (
      uint256,
      uint256,
      uint256,
      uint256
    )
  {
    return (
      interestRateStrategy.variableRateSlope1(),
      interestRateStrategy.variableRateSlope2(),
      interestRateStrategy.stableRateSlope1(),
      interestRateStrategy.stableRateSlope2()
    );
  }

  function getReservesData(address user)
    external
    view
    override
    returns (
      AggregatedReserveData[] memory,
      UserReserveData[] memory,
      uint256
    )
  {
    ILendingPool lendingPool = ILendingPool(ADDRESSES_PROVIDER.getLendingPool());
    IPriceOracleGetter oracle = IPriceOracleGetter(ADDRESSES_PROVIDER.getPriceOracle());
    address[] memory reserves = lendingPool.getReservesList();
    DataTypes.UserConfigurationMap memory userConfig = lendingPool.getUserConfiguration(user);

    AggregatedReserveData[] memory reservesData = new AggregatedReserveData[](reserves.length);
    UserReserveData[] memory userReservesData = new UserReserveData[](user != address(0) ? reserves.length : 0);

    for (uint256 i = 0; i < reserves.length; i++) {
      AggregatedReserveData memory reserveData = reservesData[i];
      reserveData.underlyingAsset = reserves[i];

      // reserve current state
      DataTypes.ReserveData memory baseData = lendingPool.getReserveData(reserveData.underlyingAsset);
      reserveData.liquidityIndex = baseData.liquidityIndex;
      reserveData.variableBorrowIndex = baseData.variableBorrowIndex;
      reserveData.liquidityRate = baseData.currentLiquidityRate;
      reserveData.variableBorrowRate = baseData.currentVariableBorrowRate;
      reserveData.stableBorrowRate = baseData.currentStableBorrowRate;
      reserveData.lastUpdateTimestamp = baseData.lastUpdateTimestamp;
      reserveData.aTokenAddress = baseData.aTokenAddress;
      reserveData.stableDebtTokenAddress = baseData.stableDebtTokenAddress;
      reserveData.variableDebtTokenAddress = baseData.variableDebtTokenAddress;
      reserveData.interestRateStrategyAddress = baseData.interestRateStrategyAddress;
      reserveData.priceInNativeCurrency = oracle.getAssetPrice(reserveData.underlyingAsset);

      reserveData.availableLiquidity = IERC20Detailed(reserveData.underlyingAsset).balanceOf(reserveData.aTokenAddress);
      (
        reserveData.totalPrincipalStableDebt,
        reserveData.totalStableDebt,
        reserveData.averageStableRate,
        reserveData.stableDebtLastUpdateTimestamp
      ) = IStableDebtToken(reserveData.stableDebtTokenAddress).getSupplyData();
      reserveData.totalScaledVariableDebt = IVariableDebtToken(reserveData.variableDebtTokenAddress)
        .scaledTotalSupply();
      reserveData.totalVariableDebt = IERC20Detailed(reserveData.variableDebtTokenAddress).totalSupply();

      // reserve configuration
      (
        reserveData.baseLTVasCollateral,
        reserveData.reserveLiquidationThreshold,
        reserveData.reserveLiquidationBonus,
        reserveData.decimals,
        reserveData.reserveFactor
      ) = baseData.configuration.getParamsMemory();
      (
        reserveData.isActive,
        reserveData.isFrozen,
        reserveData.borrowingEnabled,
        reserveData.stableBorrowRateEnabled
      ) = baseData.configuration.getFlagsMemory();
      reserveData.usageAsCollateralEnabled = reserveData.baseLTVasCollateral != 0;
      (
        reserveData.variableRateSlope1,
        reserveData.variableRateSlope2,
        reserveData.stableRateSlope1,
        reserveData.stableRateSlope2
      ) = getInterestRateStrategySlopes(DefaultReserveInterestRateStrategy(reserveData.interestRateStrategyAddress));

      if (user != address(0)) {
        // user reserve data
        userReservesData[i].underlyingAsset = reserveData.underlyingAsset;
        userReservesData[i].walletBalance = IERC20(reserveData.underlyingAsset).balanceOf(user);
        userReservesData[i].aTokenBalance = IERC20(reserveData.aTokenAddress).balanceOf(user);
        userReservesData[i].scaledATokenBalance = IAToken(reserveData.aTokenAddress).scaledBalanceOf(user);
        userReservesData[i].usageAsCollateralEnabledOnUser = userConfig.isUsingAsCollateral(i);
        userReservesData[i].isBorrowing = userConfig.isBorrowing(i);

        if (userConfig.isBorrowing(i)) {
          userReservesData[i].variableBorrowRate = baseData.currentVariableBorrowRate;
          userReservesData[i].scaledVariableDebt = IVariableDebtToken(reserveData.variableDebtTokenAddress)
            .scaledBalanceOf(user);
          userReservesData[i].currentVariableDebt = IERC20(reserveData.variableDebtTokenAddress).balanceOf(user);
          userReservesData[i].principalStableDebt = IStableDebtToken(reserveData.stableDebtTokenAddress)
            .principalBalanceOf(user);
          userReservesData[i].currentStableDebt = IERC20(reserveData.stableDebtTokenAddress).balanceOf(user);
          if (userReservesData[i].principalStableDebt != 0) {
            userReservesData[i].stableBorrowRate = IStableDebtToken(reserveData.stableDebtTokenAddress)
              .getUserStableRate(user);
            userReservesData[i].stableBorrowLastUpdateTimestamp = IStableDebtToken(reserveData.stableDebtTokenAddress)
              .getUserLastUpdated(user);
          }
        }
      }
    }
    return (reservesData, userReservesData, oracle.getAssetPrice(MOCK_USD_ADDRESS));
  }

  function getReserveData(address underlyingAsset, address user)
    external
    view
    override
    returns (
      AggregatedReserveData memory,
      UserReserveData memory,
      uint256
    )
  {
    ILendingPool lendingPool = ILendingPool(ADDRESSES_PROVIDER.getLendingPool());
    IPriceOracleGetter oracle = IPriceOracleGetter(ADDRESSES_PROVIDER.getPriceOracle());
    address[] memory reserves = lendingPool.getReservesList();
    DataTypes.UserConfigurationMap memory userConfig = lendingPool.getUserConfiguration(user);

    AggregatedReserveData memory reserveData;
    UserReserveData memory userReserveData;
    uint256 index;

    for (uint256 i = 0; i < reserves.length; i++) {
      if (underlyingAsset == reserves[i]) {
        index = i;
        break;
      }
    }

    reserveData.underlyingAsset = underlyingAsset;

    // reserve current state
    DataTypes.ReserveData memory baseData = lendingPool.getReserveData(reserveData.underlyingAsset);
    reserveData.liquidityIndex = baseData.liquidityIndex;
    reserveData.variableBorrowIndex = baseData.variableBorrowIndex;
    reserveData.liquidityRate = baseData.currentLiquidityRate;
    reserveData.variableBorrowRate = baseData.currentVariableBorrowRate;
    reserveData.stableBorrowRate = baseData.currentStableBorrowRate;
    reserveData.lastUpdateTimestamp = baseData.lastUpdateTimestamp;
    reserveData.aTokenAddress = baseData.aTokenAddress;
    reserveData.stableDebtTokenAddress = baseData.stableDebtTokenAddress;
    reserveData.variableDebtTokenAddress = baseData.variableDebtTokenAddress;
    reserveData.interestRateStrategyAddress = baseData.interestRateStrategyAddress;
    reserveData.priceInNativeCurrency = oracle.getAssetPrice(reserveData.underlyingAsset);

    reserveData.availableLiquidity = IERC20Detailed(reserveData.underlyingAsset).balanceOf(reserveData.aTokenAddress);
    (
      reserveData.totalPrincipalStableDebt,
      reserveData.totalStableDebt,
      reserveData.averageStableRate,
      reserveData.stableDebtLastUpdateTimestamp
    ) = IStableDebtToken(reserveData.stableDebtTokenAddress).getSupplyData();
    reserveData.totalScaledVariableDebt = IVariableDebtToken(reserveData.variableDebtTokenAddress).scaledTotalSupply();
    reserveData.totalVariableDebt = IERC20Detailed(reserveData.variableDebtTokenAddress).totalSupply();

    // reserve configuration
    (
      reserveData.baseLTVasCollateral,
      reserveData.reserveLiquidationThreshold,
      reserveData.reserveLiquidationBonus,
      reserveData.decimals,
      reserveData.reserveFactor
    ) = baseData.configuration.getParamsMemory();
    (
      reserveData.isActive,
      reserveData.isFrozen,
      reserveData.borrowingEnabled,
      reserveData.stableBorrowRateEnabled
    ) = baseData.configuration.getFlagsMemory();
    reserveData.usageAsCollateralEnabled = reserveData.baseLTVasCollateral != 0;
    (
      reserveData.variableRateSlope1,
      reserveData.variableRateSlope2,
      reserveData.stableRateSlope1,
      reserveData.stableRateSlope2
    ) = getInterestRateStrategySlopes(DefaultReserveInterestRateStrategy(reserveData.interestRateStrategyAddress));

    if (user != address(0)) {
      // user reserve data
      userReserveData.underlyingAsset = reserveData.underlyingAsset;
      userReserveData.walletBalance = IERC20(reserveData.underlyingAsset).balanceOf(user);
      userReserveData.aTokenBalance = IERC20(reserveData.aTokenAddress).balanceOf(user);
      userReserveData.scaledATokenBalance = IAToken(reserveData.aTokenAddress).scaledBalanceOf(user);
      userReserveData.usageAsCollateralEnabledOnUser = userConfig.isUsingAsCollateral(index);
      userReserveData.isBorrowing = userConfig.isBorrowing(index);

      if (userConfig.isBorrowing(index)) {
        userReserveData.variableBorrowRate = baseData.currentVariableBorrowRate;
        userReserveData.scaledVariableDebt = IVariableDebtToken(reserveData.variableDebtTokenAddress).scaledBalanceOf(
          user
        );
        userReserveData.currentVariableDebt = IERC20(reserveData.variableDebtTokenAddress).balanceOf(user);
        userReserveData.principalStableDebt = IStableDebtToken(reserveData.stableDebtTokenAddress).principalBalanceOf(
          user
        );
        userReserveData.currentStableDebt = IERC20(reserveData.stableDebtTokenAddress).balanceOf(user);
        if (userReserveData.principalStableDebt != 0) {
          userReserveData.stableBorrowRate = IStableDebtToken(reserveData.stableDebtTokenAddress).getUserStableRate(
            user
          );
          userReserveData.stableBorrowLastUpdateTimestamp = IStableDebtToken(reserveData.stableDebtTokenAddress)
            .getUserLastUpdated(user);
        }
      }
    }

    return (reserveData, userReserveData, oracle.getAssetPrice(MOCK_USD_ADDRESS));
  }

  function getUserAccountData(address user)
    external
    view
    override
    returns (
      uint256 totalCollateralInNativeCurrency,
      uint256 totalDebtInNativeCurrency,
      uint256 availableBorrowsInNativeCurrency,
      uint256 currentLiquidationThreshold,
      uint256 ltv,
      uint256 healthFactor,
      uint256 priceUsd
    )
  {
    ILendingPool lendingPool = ILendingPool(ADDRESSES_PROVIDER.getLendingPool());
    IPriceOracleGetter oracle = IPriceOracleGetter(ADDRESSES_PROVIDER.getPriceOracle());

    (
      totalCollateralInNativeCurrency,
      totalDebtInNativeCurrency,
      availableBorrowsInNativeCurrency,
      currentLiquidationThreshold,
      ltv,
      healthFactor
    ) = lendingPool.getUserAccountData(user);

    priceUsd = oracle.getAssetPrice(MOCK_USD_ADDRESS);

    return (
      totalCollateralInNativeCurrency,
      totalDebtInNativeCurrency,
      availableBorrowsInNativeCurrency,
      currentLiquidationThreshold,
      ltv,
      healthFactor,
      priceUsd
    );
  }
}
