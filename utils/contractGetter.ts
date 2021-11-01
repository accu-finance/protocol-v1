import {Contract} from 'ethers';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {AToken, DelegationAwareAToken, StableDebtToken, VariableDebtToken} from '../typechain';
import {AssetId, ContractId} from '../types';

export const getContractAt = async <T extends Contract>(
  hre: HardhatRuntimeEnvironment,
  contractId: ContractId | string,
  address: string
): Promise<T> => (await hre.ethers.getContractAt(contractId, address)) as T;

export const getATokenContract = async (hre: HardhatRuntimeEnvironment, assetId: AssetId): Promise<AToken> => {
  const {name, contract} = getATokenContractName(hre, assetId);
  if (contract == ContractId.DelegationAwareAToken) {
    return (await hre.ethers.getContract(name)) as DelegationAwareAToken;
  }
  return (await hre.ethers.getContract(name)) as AToken;
};

export const getATokenContractName = (
  hre: HardhatRuntimeEnvironment,
  assetId: AssetId,
  isDelegationAwareAtoken?: boolean
): {name: string; contract: ContractId} => {
  const contract = isDelegationAwareAtoken ? ContractId.DelegationAwareAToken : ContractId.AToken;
  const prefix = 'a';
  const name = `${prefix}${assetId}`;
  return {name, contract};
};

export const getStableDebtTokenContract = async (
  hre: HardhatRuntimeEnvironment,
  assetId: AssetId
): Promise<StableDebtToken> => {
  const {name} = getStableDebtTokenContractName(hre, assetId);
  return (await hre.ethers.getContract(name)) as StableDebtToken;
};

export const getStableDebtTokenContractName = (
  hre: HardhatRuntimeEnvironment,
  assetId: AssetId
): {name: string; contract: ContractId} => {
  const contract = ContractId.StableDebtToken;
  const prefix = 'sd';
  const name = `${prefix}${assetId}`;
  return {name, contract};
};

export const getVariableDebtTokenContract = async (
  hre: HardhatRuntimeEnvironment,
  assetId: AssetId
): Promise<VariableDebtToken> => {
  const {name} = getVariableDebtTokenContractName(hre, assetId);
  return (await hre.ethers.getContract(name)) as VariableDebtToken;
};

export const getVariableDebtTokenContractName = (
  hre: HardhatRuntimeEnvironment,
  assetId: AssetId
): {name: string; contract: ContractId} => {
  const contract = ContractId.VariableDebtToken;
  const prefix = 'vd';
  const name = `${prefix}${assetId}`;
  return {name, contract};
};
