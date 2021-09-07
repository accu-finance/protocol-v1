// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.6.12;

import {IChainlinkAggregatorV3} from "../../interfaces/IChainlinkAggregatorV3.sol";

contract MockChainlinkAggregatorV3 is IChainlinkAggregatorV3 {
  uint8 private _decimals;
  int256 private _price;

  constructor(uint8 decimals) public {
    _decimals = decimals;
  }

  function decimals() external view override returns (uint8) {
    return _decimals;
  }

  function description() external view override returns (string memory) {
    return "";
  }

  function version() external view override returns (uint256) {
    return uint256(1);
  }

  // getRoundData and latestRoundData should both raise "No data present"
  // if they do not have data to report, instead of returning unset values
  // which could be misinterpreted as actual reported values.
  function getRoundData(uint80 _roundId)
    external
    view
    override
    returns (
      uint80 roundId,
      int256 answer,
      uint256 startedAt,
      uint256 updatedAt,
      uint80 answeredInRound
    )
  {
    answer = _price;
  }

  function latestRoundData()
    external
    view
    override
    returns (
      uint80 roundId,
      int256 answer,
      uint256 startedAt,
      uint256 updatedAt,
      uint80 answeredInRound
    )
  {
    answer = _price;
  }

  function setPrice(uint256 price) external {
    _price = int256(price);
  }
}
