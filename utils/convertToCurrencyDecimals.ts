import {BigNumber} from 'ethers';
import {parseUnits} from 'ethers/lib/utils';
import {IERC20Detailed} from '../typechain';

const convertToCurrencyDecimals = async (token: IERC20Detailed, amount: string): Promise<BigNumber> => {
  const decimals = (await token.decimals()).toString();

  return parseUnits(amount, decimals);
};

export default convertToCurrencyDecimals;
