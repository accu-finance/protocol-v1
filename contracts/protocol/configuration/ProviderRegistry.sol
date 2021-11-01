// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.6.12;

import {Ownable} from "../../dependencies/openzeppelin/contracts/Ownable.sol";
import {IProviderRegistry} from "../../interfaces/IProviderRegistry.sol";
import {Errors} from "../libraries/helpers/Errors.sol";

/**
 * @title ProviderRegistry contract
 * @dev Main registry of AddressProvider of multiple Aave protocol's markets
 * - Used for indexing purposes of Aave protocol's markets
 * - The id assigned to a AddressProvider refers to the market it is connected with,
 *   for example with `0` for the Aave main market and `1` for the next created
 * @author Aave (modified by Accu)
 **/
contract ProviderRegistry is Ownable, IProviderRegistry {
  mapping(address => uint256) private _addressProviders;
  address[] private _addressProvidersList;

  /**
   * @dev Returns the list of registered address provider
   * @return The list of address provider, potentially containing address(0) elements
   **/
  function getAddressProvidersList() external view override returns (address[] memory) {
    address[] memory addressProvidersList = _addressProvidersList;

    uint256 maxLength = addressProvidersList.length;

    address[] memory activeProviders = new address[](maxLength);

    for (uint256 i = 0; i < maxLength; i++) {
      if (_addressProviders[addressProvidersList[i]] > 0) {
        activeProviders[i] = addressProvidersList[i];
      }
    }

    return activeProviders;
  }

  /**
   * @dev Registers an address provider
   * @param provider The address of the new AddressProvider
   * @param id The id for the new AddressProvider, referring to the market it belongs to
   **/
  function registerAddressProvider(address provider, uint256 id) external override onlyOwner {
    require(id != 0, Errors.PR_INVALID_ADDRESSES_PROVIDER_ID);

    _addressProviders[provider] = id;
    _addToAddressProvidersList(provider);
    emit AddressProviderRegistered(provider);
  }

  /**
   * @dev Removes a AddressProvider from the list of registered address provider
   * @param provider The AddressProvider address
   **/
  function unregisterAddressProvider(address provider) external override onlyOwner {
    require(_addressProviders[provider] > 0, Errors.PR_PROVIDER_NOT_REGISTERED);
    _addressProviders[provider] = 0;
    emit AddressProviderUnregistered(provider);
  }

  /**
   * @dev Returns the id on a registered AddressProvider
   * @return The id or 0 if the AddressProvider is not registered
   */
  function getAddressProviderIdByAddress(address addressProvider) external view override returns (uint256) {
    return _addressProviders[addressProvider];
  }

  function _addToAddressProvidersList(address provider) internal {
    uint256 providersCount = _addressProvidersList.length;

    for (uint256 i = 0; i < providersCount; i++) {
      if (_addressProvidersList[i] == provider) {
        return;
      }
    }

    _addressProvidersList.push(provider);
  }
}
