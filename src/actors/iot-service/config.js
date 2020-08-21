const ADMIN_HOSTNAME = 'actor1.local';
const ADMIN_PORT = 3000;
const ADMIN_BASE_URL = 'http://' + ADMIN_HOSTNAME + ':' + ADMIN_PORT;
const ADMIN_ABI_URL = ADMIN_BASE_URL + '/contract-abi';
const ADMIN_SEED_ETHER_URL = ADMIN_BASE_URL + '/seed-ether';
const ADMIN_GATEWAY_INFO_URL = ADMIN_BASE_URL + '/gateway';

// for gateway
const GATEWAY_HOSTNAME = 'actor5.local';
const GATEWAY_PORT = 3000;
const GATEWAY_BASE_URL = 'http://' + GATEWAY_HOSTNAME + ':' + GATEWAY_PORT;
const GATEWAY_ACCESS_LIST_URL = GATEWAY_BASE_URL + '/accesses';
const GATEWAY_AUTHZ_URL = GATEWAY_BASE_URL + '/authorize';
const GATEWAY_RESOURCE_URL = GATEWAY_BASE_URL + '/resource';

// for ethereum network
const ETH_NETWORK_ID = 2020;

module.exports = {
  ADMIN_ABI_URL,
  ADMIN_SEED_ETHER_URL,
  ADMIN_GATEWAY_INFO_URL,
  GATEWAY_ACCESS_LIST_URL,
  GATEWAY_AUTHZ_URL,
  GATEWAY_RESOURCE_URL,
  ETH_NETWORK_ID
};