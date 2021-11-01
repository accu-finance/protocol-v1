// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import {SafeMath} from "../../../dependencies/openzeppelin/contracts/SafeMath.sol";
import {IERC20} from "../../../dependencies/openzeppelin/contracts/IERC20.sol";
import {ReserveLogic} from "./ReserveLogic.sol";
import {ReserveConfiguration} from "../configuration/ReserveConfiguration.sol";
import {UserConfiguration} from "../configuration/UserConfiguration.sol";
import {WadRayMath} from "../math/WadRayMath.sol";
import {PercentageMath} from "../math/PercentageMath.sol";
import {IPriceOracleGetter} from "../../../interfaces/IPriceOracleGetter.sol";
import {DataTypes} from "../types/DataTypes.sol";

/**
 * @title GenericLogic library
 * @author Aave (modified by Accu)
 * @title Implements protocol-level logic to calculate and validate the state of a user
 */
library GenericLogic {
  using ReserveLogic for DataTypes.ReserveData;
  using SafeMath for uint256;
  using WadRayMath for uint256;
  using PercentageMath for uint256;
  using ReserveConfiguration for DataTypes.ReserveConfigurationMap;
  using UserConfiguration for DataTypes.UserConfigurationMap;

  uint256 public constant HEALTH_FACTOR_LIQUIDATION_THRESHOLD = 1 ether;

  struct balanceDecreaseAllowedLocalVars {
    uint256 decimals;
    uint256 liquidationThreshold;
    uint256 totalCollateralInNativeCurrency;
    uint256 totalDebtInNativeCurrency;
    uint256 avgLiquidationThreshold;
    uint256 amountToDecreaseInNativeCurrency;
    uint256 collateralBalanceAfterDecrease;
    uint256 liquidationThresholdAfterDecrease;
    uint256 healthFactorAfterDecrease;
    bool reserveUsageAsCollateralEnabled;
  }

  /**
   * @dev Checks if a specific balance decrease is allowed
   * (i.e. doesn't bring the user borrow position health factor under HEALTH_FACTOR_LIQUIDATION_THRESHOLD)
   * @param asset The address of the underlying asset of the reserve
   * @param user The address of the user
   * @param amount The amount to decrease
   * @param reservesData The data of all the reserves
   * @param userConfig The user configuration
   * @param reserves The list of all the active reserves
   * @param oracle The address of the oracle contract
   * @return true if the decrease of the balance is allowed
   **/
  function balanceDecreaseAllowed(
    address asset,
    address user,
    uint256 amount,
    mapping(address => DataTypes.ReserveData) storage reservesData,
    DataTypes.UserConfigurationMap calldata userConfig,
    mapping(uint256 => address) storage reserves,
    uint256 reservesCount,
    address oracle
  ) external view returns (bool) {
    if (!userConfig.isBorrowingAny() || !userConfig.isUsingAsCollateral(reservesData[asset].id)) {
      return true;
    }

    balanceDecreaseAllowedLocalVars memory vars;

    (, vars.liquidationThreshold, , vars.decimals, ) = reservesData[asset].configuration.getParams();

    if (vars.liquidationThreshold == 0) {
      return true;
    }

    (
      vars.totalCollateralInNativeCurrency,
      vars.totalDebtInNativeCurrency,
      ,
      vars.avgLiquidationThreshold,

    ) = calculateUserAccountData(user, reservesData, userConfig, reserves, reservesCount, oracle);

    if (vars.totalDebtInNativeCurrency == 0) {
      return true;
    }

    vars.amountToDecreaseInNativeCurrency = IPriceOracleGetter(oracle).getAssetPrice(asset).mul(amount).div(
      10**vars.decimals
    );

    vars.collateralBalanceAfterDecrease = vars.totalCollateralInNativeCurrency.sub(
      vars.amountToDecreaseInNativeCurrency
    );

    //if there is a borrow, there can't be 0 collateral
    if (vars.collateralBalanceAfterDecrease == 0) {
      return false;
    }

    vars.liquidationThresholdAfterDecrease = vars
      .totalCollateralInNativeCurrency
      .mul(vars.avgLiquidationThreshold)
      .sub(vars.amountToDecreaseInNativeCurrency.mul(vars.liquidationThreshold))
      .div(vars.collateralBalanceAfterDecrease);

    uint256 healthFactorAfterDecrease = calculateHealthFactorFromBalances(
      vars.collateralBalanceAfterDecrease,
      vars.totalDebtInNativeCurrency,
      vars.liquidationThresholdAfterDecrease
    );

    return healthFactorAfterDecrease >= GenericLogic.HEALTH_FACTOR_LIQUIDATION_THRESHOLD;
  }

  struct CalculateUserAccountDataVars {
    uint256 reserveUnitPrice;
    uint256 tokenUnit;
    uint256 compoundedLiquidityBalance;
    uint256 compoundedBorrowBalance;
    uint256 decimals;
    uint256 ltv;
    uint256 liquidationThreshold;
    uint256 i;
    uint256 healthFactor;
    uint256 totalCollateralInNativeCurrency;
    uint256 totalDebtInNativeCurrency;
    uint256 avgLtv;
    uint256 avgLiquidationThreshold;
    uint256 reservesLength;
    bool healthFactorBelowThreshold;
    address currentReserveAddress;
    bool usageAsCollateralEnabled;
    bool userUsesReserveAsCollateral;
  }

  /**
   * @dev Calculates the user data across the reserves.
   * this includes the total liquidity/collateral/borrow balances in NativeCurrency (ETH, BNB),
   * the average Loan To Value, the average Liquidation Ratio, and the Health factor.
   * @param user The address of the user
   * @param reservesData Data of all the reserves
   * @param userConfig The configuration of the user
   * @param reserves The list of the available reserves
   * @param oracle The price oracle address
   * @return The total collateral and total debt of the user in NativeCurrency (ETH, BNB), the avg ltv, liquidation threshold and the HF
   **/
  function calculateUserAccountData(
    address user,
    mapping(address => DataTypes.ReserveData) storage reservesData,
    DataTypes.UserConfigurationMap memory userConfig,
    mapping(uint256 => address) storage reserves,
    uint256 reservesCount,
    address oracle
  )
    internal
    view
    returns (
      uint256,
      uint256,
      uint256,
      uint256,
      uint256
    )
  {
    CalculateUserAccountDataVars memory vars;

    if (userConfig.isEmpty()) {
      return (0, 0, 0, 0, uint256(-1));
    }
    for (vars.i = 0; vars.i < reservesCount; vars.i++) {
      if (!userConfig.isUsingAsCollateralOrBorrowing(vars.i)) {
        continue;
      }

      vars.currentReserveAddress = reserves[vars.i];
      DataTypes.ReserveData storage currentReserve = reservesData[vars.currentReserveAddress];

      (vars.ltv, vars.liquidationThreshold, , vars.decimals, ) = currentReserve.configuration.getParams();

      vars.tokenUnit = 10**vars.decimals;
      vars.reserveUnitPrice = IPriceOracleGetter(oracle).getAssetPrice(vars.currentReserveAddress);

      if (vars.liquidationThreshold != 0 && userConfig.isUsingAsCollateral(vars.i)) {
        vars.compoundedLiquidityBalance = IERC20(currentReserve.aTokenAddress).balanceOf(user);

        uint256 liquidityBalanceInNativeCurrency = vars.reserveUnitPrice.mul(vars.compoundedLiquidityBalance).div(
          vars.tokenUnit
        );

        vars.totalCollateralInNativeCurrency = vars.totalCollateralInNativeCurrency.add(
          liquidityBalanceInNativeCurrency
        );

        vars.avgLtv = vars.avgLtv.add(liquidityBalanceInNativeCurrency.mul(vars.ltv));
        vars.avgLiquidationThreshold = vars.avgLiquidationThreshold.add(
          liquidityBalanceInNativeCurrency.mul(vars.liquidationThreshold)
        );
      }

      if (userConfig.isBorrowing(vars.i)) {
        vars.compoundedBorrowBalance = IERC20(currentReserve.stableDebtTokenAddress).balanceOf(user);
        vars.compoundedBorrowBalance = vars.compoundedBorrowBalance.add(
          IERC20(currentReserve.variableDebtTokenAddress).balanceOf(user)
        );

        vars.totalDebtInNativeCurrency = vars.totalDebtInNativeCurrency.add(
          vars.reserveUnitPrice.mul(vars.compoundedBorrowBalance).div(vars.tokenUnit)
        );
      }
    }

    vars.avgLtv = vars.totalCollateralInNativeCurrency > 0 ? vars.avgLtv.div(vars.totalCollateralInNativeCurrency) : 0;
    vars.avgLiquidationThreshold = vars.totalCollateralInNativeCurrency > 0
      ? vars.avgLiquidationThreshold.div(vars.totalCollateralInNativeCurrency)
      : 0;

    vars.healthFactor = calculateHealthFactorFromBalances(
      vars.totalCollateralInNativeCurrency,
      vars.totalDebtInNativeCurrency,
      vars.avgLiquidationThreshold
    );
    return (
      vars.totalCollateralInNativeCurrency,
      vars.totalDebtInNativeCurrency,
      vars.avgLtv,
      vars.avgLiquidationThreshold,
      vars.healthFactor
    );
  }

  /**
   * @dev Calculates the health factor from the corresponding balances
   * @param totalCollateralInNativeCurrency The total collateral in NativeCurrency (ETH, BNB)
   * @param totalDebtInNativeCurrency The total debt in NativeCurrency (ETH, BNB)
   * @param liquidationThreshold The avg liquidation threshold
   * @return The health factor calculated from the balances provided
   **/
  function calculateHealthFactorFromBalances(
    uint256 totalCollateralInNativeCurrency,
    uint256 totalDebtInNativeCurrency,
    uint256 liquidationThreshold
  ) internal pure returns (uint256) {
    if (totalDebtInNativeCurrency == 0) return uint256(-1);

    return (totalCollateralInNativeCurrency.percentMul(liquidationThreshold)).wadDiv(totalDebtInNativeCurrency);
  }

  /**
   * @dev Calculates the equivalent amount in NativeCurrency (ETH, BNB) that an user can borrow, depending on the available collateral and the
   * average Loan To Value
   * @param totalCollateralInNativeCurrency The total collateral in NativeCurrency (ETH, BNB)
   * @param totalDebtInNativeCurrency The total borrow balance
   * @param ltv The average loan to value
   * @return the amount available to borrow in NativeCurrency (ETH, BNB) for the user
   **/

  function calculateAvailableBorrowsInNativeCurrency(
    uint256 totalCollateralInNativeCurrency,
    uint256 totalDebtInNativeCurrency,
    uint256 ltv
  ) internal pure returns (uint256) {
    uint256 availableBorrowsInNativeCurrency = totalCollateralInNativeCurrency.percentMul(ltv);

    if (availableBorrowsInNativeCurrency < totalDebtInNativeCurrency) {
      return 0;
    }

    availableBorrowsInNativeCurrency = availableBorrowsInNativeCurrency.sub(totalDebtInNativeCurrency);
    return availableBorrowsInNativeCurrency;
  }
}
