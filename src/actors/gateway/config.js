// for admin
const ADMIN_HOSTNAME = 'actor1.local';
const ADMIN_PORT = 3000;
const ADMIN_BASE_URL = 'http://' + ADMIN_HOSTNAME + ':' + ADMIN_PORT;
const ADMIN_GATEWAY_LIST_URL = ADMIN_BASE_URL + '/gateway';
const ADMIN_VENDOR_LIST_URL = ADMIN_BASE_URL + '/vendor';
const ADMIN_ABI_URL = ADMIN_BASE_URL + '/contract-abi';
const ADMIN_SEED_ETHER_URL = ADMIN_BASE_URL + '/ether';

// for vendor
const VENDOR_HOSTNAME = 'actor6.local';
const VENDOR_PORT = 3000;
const VENDOR_BASE_URL = 'http://' + VENDOR_HOSTNAME + ':' + VENDOR_PORT;
const VENDOR_AUTHN_URL = VENDOR_BASE_URL + '/authenticate';

// for ethereum network
const ETH_NETWORK_ID = 2020;

module.exports = {
  ADMIN_GATEWAY_LIST_URL,
  ADMIN_VENDOR_LIST_URL,
  ADMIN_ABI_URL,
  ADMIN_SEED_ETHER_URL,
  VENDOR_AUTHN_URL,
  ETH_NETWORK_ID
}