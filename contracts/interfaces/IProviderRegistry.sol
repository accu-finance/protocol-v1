// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.6.12;

/**
 * @title ProviderRegistry contract
 * @dev Main registry of AddressProvider of multiple Aave protocol's markets
 * - Used for indexing purposes of Aave protocol's markets
 * - The id assigned to a AddressProvider refers to the market it is connected with,
 *   for example with `0` for the Aave main market and `1` for the next created
 * @author Aave
 **/
interface IProviderRegistry {
  event AddressProviderRegistered(address indexed newAddress);
  event AddressProviderUnregistered(address indexed newAddress);

  function getAddressProvidersList() external view returns (address[] memory);

  function getAddressProviderIdByAddress(address addressProvider) external view returns (uint256);

  function registerAddressProvider(address provider, uint256 id) external;

  function unregisterAddressProvider(address provider) external;
}
