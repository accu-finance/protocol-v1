// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import {IPriceOracleSetter} from "../../interfaces/IPriceOracleSetter.sol";
import {MockChainlinkAggregatorV3} from "../../mocks/oracle/MockChainlinkAggregatorV3.sol";

contract MockChainlinkPriceFeed is IPriceOracleSetter {
  mapping(address => MockChainlinkAggregatorV3) private _aggregators;

  constructor(address[] memory assets, address[] memory sources) public {
    for (uint256 i = 0; i < assets.length; i++) {
      _aggregators[assets[i]] = MockChainlinkAggregatorV3(sources[i]);
    }
  }

  function setAssetPrice(address asset, uint256 price) external override {
    _aggregators[asset].setPrice(price);
  }
}
