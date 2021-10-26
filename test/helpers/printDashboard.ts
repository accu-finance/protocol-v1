import Table, {HorizontalTableRow} from 'cli-table3';
import colors from 'colors/safe';
import {constants} from 'ethers';
import {PERCENTAGE} from '../../constants';
import {ERC20Token, User} from '../../types';
import {getReserveData, getTreasuryBalance, getUserAccountData, getUserData} from './protocolTx';

const {MaxUint256} = constants;

const printDashboard = async (asset: ERC20Token, user: User, description = ''): Promise<void> => {
  const reserveData = await getReserveData(asset, user);
  const userData = await getUserData(asset, user);
  const userAccountData = await getUserAccountData(user);
  const table = new Table();
  const assetName = await asset.symbol();
  const assetDecimals = await asset.decimals();
  const assetPriceETH = await user.priceOracle.getAssetPrice(asset.address);
  const treasuryBalance = await getTreasuryBalance(asset, user);

  const assetHeader: HorizontalTableRow = [
    {
      hAlign: 'center',
      colSpan: 2,
      content: colors.bgWhite(colors.bold(colors.blue(`${assetName}`))),
    },
    {
      colSpan: 2,
      hAlign: 'right',
      content: `decimals: ${assetDecimals}, priceInNative: ${assetPriceETH.toWadUnit()}`,
    },
  ];

  const title: HorizontalTableRow = [
    {
      hAlign: 'center',
      colSpan: 2,
      content: colors.grey(`Reserve Information`),
    },
    {
      hAlign: 'center',
      colSpan: 2,
      content: colors.grey(`User Information`),
    },
  ];
  const subtitle: HorizontalTableRow = [
    {
      colSpan: 4,
      content: colors.italic(colors.yellow(description)),
    },
  ];
  const row0: HorizontalTableRow = [
    {
      content: colors.bold(colors.green(`Reserve`)),
      colSpan: 2,
    },
    {
      content: colors.bold(colors.green(`Deposit & Borrow`)),
      colSpan: 2,
    },
  ];
  const row1: HorizontalTableRow = [
    {
      content: `Total Liquidity`,
    },
    {
      content: reserveData.totalLiquidity.toUnit(assetDecimals),
    },
    {
      content: `Wallet balance`,
    },
    {
      content: `${userData.walletBalance.toUnit(assetDecimals)}`,
    },
  ];
  const row2: HorizontalTableRow = [
    {
      content: `Total Borrowed`,
    },
    {
      content: reserveData.totalStableDebt.add(reserveData.totalVariableDebt).toUnit(assetDecimals),
    },
    {
      content: `User borrowed`,
    },
    {
      content: userData.currentStableDebt.add(userData.currentVariableDebt).toUnit(assetDecimals),
    },
  ];
  const row3: HorizontalTableRow = [
    {
      content: `Available Liquidity`,
    },
    {
      content: reserveData.availableLiquidity.toUnit(assetDecimals),
    },
  ];
  const row4: HorizontalTableRow = [
    {
      content: `Total Treasury`,
    },
    {
      content: `${treasuryBalance.toUnit(assetDecimals)}`,
    },
  ];
  const row5: HorizontalTableRow = [
    {
      content: colors.bold(colors.green(`Deposit`)),
      colSpan: 2,
    },
    {
      content: colors.bold(colors.green(`Deposited`)),
      colSpan: 2,
    },
  ];
  const row6: HorizontalTableRow = [
    {
      content: `Liquidity Rate`,
    },
    {
      content: reserveData.liquidityRate.toRayUnit(),
    },
    {
      content: `AToken Balance`,
    },
    {
      content: userData.currentATokenBalance.toUnit(assetDecimals),
    },
  ];
  const row7: HorizontalTableRow = [
    {
      content: `Liquidity Index`,
    },
    {
      content: reserveData.liquidityIndex.toRayUnit(),
    },
  ];
  const row8: HorizontalTableRow = [
    {
      content: colors.bold(colors.green(`Variable Borrowing`)),
      colSpan: 2,
    },
    {
      content: colors.bold(colors.green(`Variable Borrowed`)),
      colSpan: 2,
    },
  ];
  const row9: HorizontalTableRow = [
    {
      content: `Variable Borrow Rate`,
    },
    {
      content: reserveData.variableBorrowRate.toRayUnit(),
    },
    {
      content: `Variabled Borrowed`,
    },
    {
      content: userData.currentVariableDebt.toUnit(assetDecimals),
    },
  ];
  const row10: HorizontalTableRow = [
    {
      content: `Variable Borrow Index`,
    },
    {
      content: reserveData.variableBorrowIndex.toRayUnit(),
    },
    {
      content: `Scaled Variable Debt`,
    },
    {
      content: userData.scaledVariableDebt.toUnit(assetDecimals),
    },
  ];
  const row11: HorizontalTableRow = [
    {
      content: colors.bold(colors.green(`Stable Borrowing`)),
      colSpan: 2,
    },
    {
      content: colors.bold(colors.green(`Stable Borrowed`)),
      colSpan: 2,
    },
  ];
  const row12: HorizontalTableRow = [
    {
      content: `Stable Borrow Rate`,
    },
    {
      content: reserveData.stableBorrowRate.toRayUnit(),
    },
    {
      content: 'Stable Borrowed',
    },
    {
      content: userData.currentStableDebt.toUnit(assetDecimals),
    },
  ];
  const row13: HorizontalTableRow = [
    {
      content: `Average Stable BorrowRate`,
    },
    {
      content: reserveData.averageStableBorrowRate.toRayUnit(),
    },
    {
      content: `Principal Stable Debt`,
    },
    {
      content: userData.principalStableDebt.toUnit(assetDecimals),
    },
  ];
  const row14: HorizontalTableRow = [
    {
      content: colors.bold(colors.green(`Configuration`)),
      colSpan: 2,
    },
    {
      content: colors.bold(colors.blue(`Account Collateral`)),
      colSpan: 2,
    },
  ];
  const row15: HorizontalTableRow = [
    {
      content: `Max TLV`,
    },
    {
      content: `${reserveData.reserveConfigData.ltv.toPercentUnit()} %`,
    },
    {
      content: `Current TLV`,
    },
    {
      content: `${userAccountData.ltv.toPercentUnit()} %`,
    },
  ];
  const row16: HorizontalTableRow = [
    {
      content: `Liquidiation threshold`,
    },
    {
      content: `${reserveData.reserveConfigData.liquidationThreshold.toPercentUnit()} %`,
    },
    {
      content: `Current liquidation threshold`,
    },
    {
      content: `${userAccountData.currentLiquidationThreshold.toPercentUnit()} %`,
    },
  ];
  const row17: HorizontalTableRow = [
    {
      content: `Liquidiation Bonus`,
    },
    {
      content: `${reserveData.reserveConfigData.liquidationBonus.sub(PERCENTAGE).toPercentUnit()} %`,
    },
    {
      content: `Health Factor`,
    },
    {
      content: `${userAccountData.healthFactor.eq(MaxUint256) ? 'MAX' : userAccountData.healthFactor.toWadUnit()}`,
    },
  ];
  const row18: HorizontalTableRow = [
    {
      content: `Usage As Collateral Enabled`,
    },
    {
      content: `${reserveData.reserveConfigData.usageAsCollateralEnabled}`,
    },
    {
      content: `Total Collateral NATIVE`,
    },
    {
      content: `${userAccountData.totalCollateralInNativeCurrency.toWadUnit()}`,
    },
  ];
  const row19: HorizontalTableRow = [
    {
      content: `Stable Borrow Rate Enabled`,
    },
    {
      content: `${reserveData.reserveConfigData.stableBorrowRateEnabled}`,
    },
    {
      content: `Total Debt NATIVE`,
    },
    {
      content: `${userAccountData.totalDebtInNativeCurrency.toWadUnit()}`,
    },
  ];
  const row20: HorizontalTableRow = [
    {
      content: `Reserve Factor`,
    },
    {
      content: `${reserveData.reserveConfigData.reserveFactor.toPercentUnit()} %`,
    },
    {
      content: `Available Borrows NATIVE`,
    },
    {
      content: `${userAccountData.availableBorrowsInNativeCurrency.toWadUnit()}`,
    },
  ];

  table.push(assetHeader);
  table.push(title);
  table.push(subtitle);
  table.push(row0);
  table.push(row1);
  table.push(row2);
  table.push(row3);
  table.push(row4);
  table.push(row5);
  table.push(row6);
  table.push(row7);
  table.push(row8);
  table.push(row9);
  table.push(row10);
  table.push(row11);
  table.push(row12);
  table.push(row13);
  table.push(row14);
  table.push(row15);
  table.push(row16);
  table.push(row17);
  table.push(row18);
  table.push(row19);
  table.push(row20);

  console.log(table.toString());
};

export default printDashboard;
