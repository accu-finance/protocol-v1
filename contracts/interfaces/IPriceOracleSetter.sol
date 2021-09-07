// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.6.12;

/**
 * @title IPriceOracleSetter interface
 * @notice Interface for the Aave price oracle.
 **/

interface IPriceOracleSetter {
  /***********
    @dev sets the asset price, in wei
     */
  function setAssetPrice(address asset, uint256 price) external;
}
