// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.6.12;

import {StableDebtToken} from "../../protocol/tokenization/StableDebtToken.sol";

contract MockStableDebtTokenV2 is StableDebtToken {
  function getRevision() internal pure override returns (uint256) {
    return 0x2;
  }
}
