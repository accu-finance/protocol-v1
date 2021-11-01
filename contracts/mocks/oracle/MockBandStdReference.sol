// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import {IStdReference} from "../../interfaces/IStdReference.sol";
import {IPriceOracleSetter} from "../../interfaces/IPriceOracleSetter.sol";
import {BandPriceOracle} from "../../oracle/BandPriceOracle.sol";

contract MockBandStdReference is IStdReference, IPriceOracleSetter {
  mapping(string => mapping(string => IStdReference.ReferenceData)) _refData;
  address private _bandPriceOracle; // for asset to symbol mapping

  function setPriceOracle(address bandPriceOracle) external {
    _bandPriceOracle = bandPriceOracle;
  }

  function setReferenceData(
    string memory base,
    string memory quote,
    uint256 rate
  ) external {
    _refData[base][quote] = IStdReference.ReferenceData({
      rate: rate,
      lastUpdatedBase: uint256(0),
      lastUpdatedQuote: uint256(0)
    });
  }

  /// Returns the price data for the given base/quote pair. Revert if not available.
  function getReferenceData(string memory base, string memory quote)
    external
    view
    override
    returns (IStdReference.ReferenceData memory)
  {
    return _refData[base][quote];
  }

  /// Similar to getReferenceData, but with multiple base/quote pairs at once.
  function getReferenceDataBulk(string[] memory bases, string[] memory quotes)
    external
    view
    override
    returns (IStdReference.ReferenceData[] memory)
  {
    require(bases.length == quotes.length, "INVALID ARRAY SIZE");

    IStdReference.ReferenceData[] memory data = new IStdReference.ReferenceData[](bases.length);
    for (uint256 i = 0; i < bases.length; i++) {
      data[i] = _refData[bases[i]][quotes[i]];
    }

    return data;
  }

  function setAssetPrice(address asset, uint256 price) external override {
    string memory symbol = BandPriceOracle(_bandPriceOracle).getSymbolOfAsset(asset);
    string memory quote = BandPriceOracle(_bandPriceOracle).getQuote();
    _refData[symbol][quote].rate = price;
  }
}
