// for admin
const ADMIN_HOSTNAME = 'actor1.local';
const ADMIN_PORT = 3000;
const ADMIN_BASE_URL = 'http://' + ADMIN_HOSTNAME + ':' + ADMIN_PORT;
const ADMIN_ISP_LIST_URL = ADMIN_BASE_URL + '/isp';
const ADMIN_ABI_URL = ADMIN_BASE_URL + '/contract-abi';
const ADMIN_SEED_ETHER_URL = ADMIN_BASE_URL + '/ether';

// for isp
const ISP_HOSTNAME = 'actor4.local';
const ISP_PORT = 3000;
const ISP_BASE_URL = 'http://' + ISP_HOSTNAME + ':' + ISP_PORT;
const ISP_USER_REGISTRATION_URL = ISP_BASE_URL + '/register';
const ISP_AUTHN_URL = ISP_BASE_URL + '/authenticate';

// for gateway
const GATEWAY_HOSTNAME = 'actor5.local';
const GATEWAY_PORT = 3000;
const GATEWAY_BASE_URL = 'http://' + GATEWAY_HOSTNAME + ':' + GATEWAY_PORT;
const GATEWAY_SETUP_ADDRESS_URL = GATEWAY_BASE_URL + '/setup-address';

// for ethereum network
const ETH_NETWORK_ID = 2020;

module.exports = {
  ADMIN_ISP_LIST_URL,
  ADMIN_ABI_URL,
  ADMIN_SEED_ETHER_URL,
  ISP_USER_REGISTRATION_URL,
  ISP_AUTHN_URL,
  GATEWAY_SETUP_ADDRESS_URL,
  ETH_NETWORK_ID
}