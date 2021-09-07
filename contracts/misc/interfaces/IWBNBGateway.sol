// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.6.12;

interface IWBNBGateway {
  function depositBNB(
    address lendingPool,
    address onBehalfOf,
    uint16 referralCode
  ) external payable;

  function withdrawBNB(
    address lendingPool,
    uint256 amount,
    address onBehalfOf
  ) external;

  function repayBNB(
    address lendingPool,
    uint256 amount,
    uint256 rateMode,
    address onBehalfOf
  ) external payable;

  function borrowBNB(
    address lendingPool,
    uint256 amount,
    uint256 interesRateMode,
    uint16 referralCode
  ) external;
}
