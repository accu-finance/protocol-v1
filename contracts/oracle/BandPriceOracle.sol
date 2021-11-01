// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import {Ownable} from "../dependencies/openzeppelin/contracts/Ownable.sol";
import {IERC20} from "../dependencies/openzeppelin/contracts/IERC20.sol";

import {IPriceOracleGetter} from "../interfaces/IPriceOracleGetter.sol";
import {IStdReference} from "../interfaces/IStdReference.sol";
import {SafeERC20} from "../dependencies/openzeppelin/contracts/SafeERC20.sol";

/**
 * @title BandPriceOracle
 * @author Accu
 **/
contract BandPriceOracle is IPriceOracleGetter, Ownable {
  using SafeERC20 for IERC20;

  event WethSet(address indexed weth);
  event AssetSymbolUpdated(address indexed asset, string indexed symbol);
  event FallbackOracleUpdated(address indexed fallbackOracle);
  event SourceUpdated(address indexed priceProvider);

  IStdReference private _stdReference;
  mapping(address => string) private _assetsSymbols;
  IPriceOracleGetter private _fallbackOracle;
  string private _quote;
  address public immutable WETH;
  address public immutable USD = address(0);

  constructor(
    address stdReference,
    address fallbackOracle,
    address weth,
    string memory quote
  ) public {
    _setStdReference(stdReference);
    _setFallbackOracle(fallbackOracle);
    _quote = quote;
    WETH = weth;
    emit WethSet(weth);
  }

  /// @notice External function called by the Aave governance to set or replace symbols of assets
  /// @param assets The addresses of the assets
  /// @param symbols The address of the source of each asset
  function setAssetsSymbols(address[] calldata assets, string[] calldata symbols) external onlyOwner {
    require(assets.length == symbols.length, "INCONSISTENT_PARAMS_LENGTH");
    for (uint256 i = 0; i < assets.length; i++) {
      _assetsSymbols[assets[i]] = symbols[i];
      emit AssetSymbolUpdated(assets[i], symbols[i]);
    }
  }

  /// @notice Sets the fallbackOracle
  /// - Callable only by the Aave governance
  /// @param fallbackOracle The address of the fallbackOracle
  function setFallbackOracle(address fallbackOracle) external onlyOwner {
    _setFallbackOracle(fallbackOracle);
  }

  function setMainOracle(address stdReference) external onlyOwner {
    _setStdReference(stdReference);
  }

  /// @notice Internal function to set the symbols for each asset
  /// @param assets The addresses of the assets
  /// @param symbols The address of the source of each asset
  function _setAssetsSymbols(address[] memory assets, string[] memory symbols) internal {
    require(assets.length == symbols.length, "INCONSISTENT_PARAMS_LENGTH");
    for (uint256 i = 0; i < assets.length; i++) {
      _assetsSymbols[assets[i]] = symbols[i];
      emit AssetSymbolUpdated(assets[i], symbols[i]);
    }
  }

  /// @notice Internal function to set the fallbackOracle
  /// @param fallbackOracle The address of the fallbackOracle
  function _setFallbackOracle(address fallbackOracle) internal {
    _fallbackOracle = IPriceOracleGetter(fallbackOracle);
    emit FallbackOracleUpdated(fallbackOracle);
  }

  function _setStdReference(address stdReference) internal {
    _stdReference = IStdReference(stdReference);
    emit SourceUpdated(stdReference);
  }

  /// @notice Gets an asset price by address
  /// @param asset The asset address
  function getAssetPrice(address asset) public view override returns (uint256) {
    string memory symbol = _assetsSymbols[asset];

    if (asset == WETH) {
      return 1 ether;
    } else {
      IStdReference.ReferenceData memory data = _stdReference.getReferenceData(symbol, _quote);
      if (data.rate > 0) {
        return uint256(data.rate);
      } else {
        return _fallbackOracle.getAssetPrice(asset);
      }
    }
  }

  /// @notice Gets a list of prices from a list of assets addresses
  /// @param assets The list of assets addresses
  function getAssetsPrices(address[] calldata assets) external view returns (uint256[] memory) {
    uint256[] memory prices = new uint256[](assets.length);
    for (uint256 i = 0; i < assets.length; i++) {
      prices[i] = getAssetPrice(assets[i]);
    }
    return prices;
  }

  /// @notice Gets the address of the source for an asset address
  /// @param asset The address of the asset
  /// @return address The address of the source
  function getSymbolOfAsset(address asset) external view returns (string memory) {
    return _assetsSymbols[asset];
  }

  /// @notice Gets the address of the fallback oracle
  /// @return address The addres of the fallback oracle
  function getFallbackOracle() external view returns (address) {
    return address(_fallbackOracle);
  }

  function getQuote() external view returns (string memory) {
    return _quote;
  }
}
