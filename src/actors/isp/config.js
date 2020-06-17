// for admin
const ADMIN_HOSTNAME = 'actor1.local';
const ADMIN_PORT = 3000;
const ADMIN_BASE_URL = 'http://' + ADMIN_HOSTNAME + ':' + ADMIN_PORT;
const ADMIN_ABI_URL = ADMIN_BASE_URL + '/contract-abi';
const ADMIN_SEED_ETHER_URL = ADMIN_BASE_URL + '/ether';

// for ethereum network
const ETH_NETWORK_ID = 2020;

module.exports = {
  ADMIN_ABI_URL,
  ADMIN_SEED_ETHER_URL,
  ETH_NETWORK_ID
};