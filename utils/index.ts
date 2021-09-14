import {Assertion} from 'chai';
import {BigNumber} from 'ethers';
import {formatUnits} from 'ethers/lib/utils';
import {
  HALF_PERCENTAGE,
  HALF_RAY,
  HALF_WAD,
  PERCENTAGE,
  PERCENTAGE_DECIMALS,
  RAY,
  RAY_DECIMALS,
  WAD,
  WAD_DECIMALS,
  WAD_TO_RAY,
} from '../constants';
import {AddressProviderId, Network, ReserveData, UserData} from '../types';

export const enumKeys = <O extends Record<string, unknown>, K extends keyof O = keyof O>(obj: O): K[] => {
  return Object.keys(obj).filter((k) => Number.isNaN(+k)) as K[];
};

const getKeyValue = <T, K extends keyof T>(obj: T, key: K): T[K] => obj[key];

export const parseNetworkAddressProvider = (
  networkName: string,
  addressProviderIdNumber: any
): {network: Network; addressProviderId: AddressProviderId} => {
  const network: Network | undefined = Network[networkName as keyof typeof Network];
  if (!network) {
    throw new Error(`unsupported network ${networkName}`);
  }

  const addressProviderId: AddressProviderId | undefined =
    AddressProviderId[AddressProviderId[addressProviderIdNumber] as keyof typeof AddressProviderId];
  if (!addressProviderId) {
    throw new Error(`unsupported addressProviderId  '${addressProviderIdNumber}'`);
  }

  return {
    network,
    addressProviderId,
  };
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  export namespace Chai {
    interface Assertion {
      almostEqualOrEqual<T extends UserData | ReserveData | BigNumber>(expected: T): void;
    }
  }
}

Assertion.addMethod('almostEqualOrEqual', function (expected: UserData | ReserveData | BigNumber) {
  const actual = this._obj;

  if (actual instanceof BigNumber) {
    const expectedValue = expected as BigNumber;
    this.assert(
      actual.eq(expectedValue) ||
        actual.add(1).eq(expectedValue) ||
        actual.eq(expectedValue.add(1)) ||
        actual.add(2).eq(expectedValue) ||
        actual.eq(expectedValue.add(2)) ||
        actual.add(3).eq(expectedValue) ||
        actual.eq(expectedValue.add(3)),
      `expected #{act} to be almost equal or equal #{exp}`,
      `expected #{act} to be almost equal or equal #{exp}`,
      expectedValue.toString(),
      actual.toString()
    );
    return;
  }

  for (const key of Object.keys(actual)) {
    if (key === 'totalStableDebtLastUpdated' || key === 'lastUpdateTimestamp' || key === 'marketStableRate') {
      continue;
    }

    const actualValue = actual[key];
    const expectedValue = getKeyValue(expected as UserData | ReserveData, key as keyof (UserData | ReserveData));

    if (actualValue instanceof BigNumber) {
      this.assert(
        actualValue.eq(expectedValue) ||
          actualValue.add(1).eq(expectedValue) ||
          actualValue.eq(expectedValue.add(1)) ||
          actualValue.add(2).eq(expectedValue) ||
          actualValue.eq(expectedValue.add(2)) ||
          actualValue.add(3).eq(expectedValue) ||
          actualValue.eq(expectedValue.add(3)),
        `expected #{act} to be almost equal or equal #{exp} for property ${key}`,
        `expected #{act} to be almost equal or equal #{exp} for property ${key}`,
        expectedValue.toString(),
        actualValue.toString()
      );
    } else {
      this.assert(
        actualValue !== null && expectedValue != null && actualValue.toString() === expectedValue.toString(),
        `expected #{act} to be almost equal or equal #{exp} for property ${key}`,
        `expected #{act} to be almost equal or equal #{exp} for property ${key}`,
        expectedValue,
        actualValue
      );
    }
  }
});

declare module 'ethers' {
  interface BigNumber {
    wadMul: (y: BigNumber) => BigNumber;
    rayMul: (y: BigNumber) => BigNumber;
    wadDiv: (y: BigNumber) => BigNumber;
    rayDiv: (y: BigNumber) => BigNumber;
    percentMul: (y: BigNumber) => BigNumber;
    percentDiv: (y: BigNumber) => BigNumber;
    wadToRay: () => BigNumber;
    rayToWad: () => BigNumber;
    toRayUnit: () => string;
    toWadUnit: () => string;
    toPercentUnit: () => string;
    toUnit: (x: number) => string;
    convertUnits: (from: number, to: number) => BigNumber;
  }
}

BigNumber.prototype.wadMul = function (y: BigNumber): BigNumber {
  return wmul(this, y);
};

BigNumber.prototype.rayMul = function (y: BigNumber): BigNumber {
  return rmul(this, y);
};

BigNumber.prototype.percentMul = function (y: BigNumber): BigNumber {
  return pmul(this, y);
};

BigNumber.prototype.wadDiv = function (y: BigNumber): BigNumber {
  return wdiv(this, y);
};

BigNumber.prototype.rayDiv = function (y: BigNumber): BigNumber {
  return rdiv(this, y);
};

BigNumber.prototype.wadToRay = function (): BigNumber {
  return this.mul(WAD_TO_RAY);
};

BigNumber.prototype.rayToWad = function (): BigNumber {
  return this.add(WAD_TO_RAY.div(2)).div(WAD_TO_RAY);
};

BigNumber.prototype.toWadUnit = function (): string {
  return formatUnits(this, WAD_DECIMALS);
};

BigNumber.prototype.toRayUnit = function (): string {
  return formatUnits(this, RAY_DECIMALS);
};

BigNumber.prototype.toPercentUnit = function (): string {
  return formatUnits(this, PERCENTAGE_DECIMALS);
};

BigNumber.prototype.toUnit = function (x: number): string {
  return formatUnits(this, x);
};

BigNumber.prototype.convertUnits = function (from: number, to: number): BigNumber {
  if (from === to) {
    return this;
  } else if (from > to) {
    const ratio = BigNumber.from(10).pow(from - to);
    return this.add(ratio.div(2)).div(ratio);
  } else {
    const ratio = BigNumber.from(10).pow(to - from);
    return this.mul(ratio);
  }
};

const wmul = (x: BigNumber, y: BigNumber): BigNumber => {
  return x.mul(y).add(HALF_WAD).div(WAD);
};

const rmul = (x: BigNumber, y: BigNumber): BigNumber => {
  return x.mul(y).add(HALF_RAY).div(RAY);
};

const pmul = (x: BigNumber, y: BigNumber): BigNumber => {
  return x.mul(y).add(HALF_PERCENTAGE).div(PERCENTAGE);
};

const wdiv = (x: BigNumber, y: BigNumber): BigNumber => {
  return x.mul(WAD).add(y.div(2)).div(y);
};

const rdiv = (x: BigNumber, y: BigNumber): BigNumber => {
  return x.mul(RAY).add(y.div(2)).div(y);
};
