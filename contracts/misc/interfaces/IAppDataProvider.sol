// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

interface IAppDataProvider {
  struct AggregatedReserveData {
    address underlyingAsset;
    uint256 decimals;
    uint256 baseLTVasCollateral;
    uint256 reserveLiquidationThreshold;
    uint256 reserveLiquidationBonus;
    uint256 reserveFactor;
    bool usageAsCollateralEnabled;
    bool borrowingEnabled;
    bool stableBorrowRateEnabled;
    bool isActive;
    bool isFrozen;
    // base data
    uint128 liquidityIndex;
    uint128 variableBorrowIndex;
    uint128 liquidityRate;
    uint128 variableBorrowRate;
    uint128 stableBorrowRate;
    uint40 lastUpdateTimestamp;
    address aTokenAddress;
    address stableDebtTokenAddress;
    address variableDebtTokenAddress;
    address interestRateStrategyAddress;
    //
    uint256 availableLiquidity;
    uint256 totalPrincipalStableDebt;
    uint256 totalStableDebt;
    uint256 averageStableRate;
    uint256 stableDebtLastUpdateTimestamp;
    uint256 totalScaledVariableDebt;
    uint256 totalVariableDebt;
    uint256 priceInNativeCurrency;
    uint256 variableRateSlope1;
    uint256 variableRateSlope2;
    uint256 stableRateSlope1;
    uint256 stableRateSlope2;
  }

  struct UserReserveData {
    address underlyingAsset;
    uint256 walletBalance;
    bool isBorrowing;
    uint256 aTokenBalance;
    uint256 scaledATokenBalance;
    bool usageAsCollateralEnabledOnUser;
    uint256 variableBorrowRate;
    uint256 stableBorrowRate;
    uint256 currentVariableDebt;
    uint256 scaledVariableDebt;
    uint256 principalStableDebt;
    uint256 currentStableDebt;
    uint256 stableBorrowLastUpdateTimestamp;
  }

  function getReservesData(address user)
    external
    view
    returns (
      AggregatedReserveData[] memory,
      UserReserveData[] memory,
      uint256
    );

  function getReserveData(address underlyingAsset, address user)
    external
    view
    returns (
      AggregatedReserveData memory,
      UserReserveData memory,
      uint256
    );

  function getUserAccountData(address user)
    external
    view
    returns (
      uint256 totalCollateralInNativeCurrency,
      uint256 totalDebtInNativeCurrency,
      uint256 availableBorrowsInNativeCurrency,
      uint256 currentLiquidationThreshold,
      uint256 ltv,
      uint256 healthFactor,
      uint256 priceUsd
    );
}
