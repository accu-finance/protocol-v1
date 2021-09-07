import {Contract} from 'ethers';
import hre from 'hardhat';
import {AToken, DelegationAwareAToken, StableDebtToken, VariableDebtToken} from '../typechain';
import {AssetId, ContractId} from '../types';

export const getContractAt = async <T extends Contract>(contractId: ContractId, address: string): Promise<T> =>
  (await hre.ethers.getContractAt(contractId, address)) as T;

export const getATokenContract = async (assetId: AssetId): Promise<AToken> => {
  const {name, contract} = getATokenContractName(assetId);
  if (contract == ContractId.DelegationAwareAToken) {
    return (await hre.ethers.getContract(name)) as DelegationAwareAToken;
  }
  return (await hre.ethers.getContract(name)) as AToken;
};

export const getATokenContractName = (
  assetId: AssetId,
  isDelegationAwareAtoken?: boolean
): {name: string; contract: ContractId} => {
  const contract = isDelegationAwareAtoken ? ContractId.DelegationAwareAToken : ContractId.AToken;
  const prefix = 'a';
  const name = `${prefix}${assetId}`;
  return {name, contract};
};

export const getStableDebtTokenContract = async (assetId: AssetId): Promise<StableDebtToken> => {
  const {name} = getStableDebtTokenContractName(assetId);
  return (await hre.ethers.getContract(name)) as StableDebtToken;
};

export const getStableDebtTokenContractName = (assetId: AssetId): {name: string; contract: ContractId} => {
  const contract = ContractId.StableDebtToken;
  const prefix = 'sd';
  const name = `${prefix}${assetId}`;
  return {name, contract};
};

export const getVariableDebtTokenContract = async (assetId: AssetId): Promise<VariableDebtToken> => {
  const {name} = getVariableDebtTokenContractName(assetId);
  return (await hre.ethers.getContract(name)) as VariableDebtToken;
};

export const getVariableDebtTokenContractName = (assetId: AssetId): {name: string; contract: ContractId} => {
  const contract = ContractId.VariableDebtToken;
  const prefix = 'vd';
  const name = `${prefix}${assetId}`;
  return {name, contract};
};
