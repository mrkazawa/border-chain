/**
 * The network id for the ethereum.
 */
const NETWORK_ID = '2020';

/**
 * The location of the deployed contract ABI object.
 * This file will be updated every Truffle compile.
 */
const REGISTRY_CONTRACT = require('./build/contracts/RegistryContract.json');

/**
 * The endpoint to get the contract abi.
 */
const ABI_URL = `http://10.0.0.51:3000/contract_abi`;

module.exports = {
  NETWORK_ID,
  REGISTRY_CONTRACT,
  ABI_URL
}