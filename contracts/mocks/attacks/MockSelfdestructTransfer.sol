// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.6.12;

contract MockSelfdestructTransfer {
  function destroyAndTransfer(address payable to) external payable {
    selfdestruct(to);
  }
}
