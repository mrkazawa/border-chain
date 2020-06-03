// for admin
const ADMIN_HOSTNAME = 'actor1.local';
const ADMIN_PORT = 3000;
const ADMIN_BASE_URL = 'http://' + ADMIN_HOSTNAME + ':' + ADMIN_PORT;
const ADMIN_GET_ISP_LIST_URL = ADMIN_BASE_URL + '/isp';
const ADMIN_GET_VENDOR_LIST_URL = ADMIN_BASE_URL + '/vendor';
const ADMIN_GET_ABI_URL = ADMIN_BASE_URL + '/contract-abi';
const ADMIN_SEED_ETHER_URL = ADMIN_BASE_URL + '/ether';

// for isp
const ISP_HOSTNAME = 'actor4.local';
const ISP_PORT = 3000;
const ISP_BASE_URL = 'http://' + ISP_HOSTNAME + ':' + ISP_PORT;
const ISP_AUTHN_URL = ISP_BASE_URL + '/authenticate';

// for ethereum network
const ETH_NETWORK_ID = 2020;
const ETH_PORT = 8545;
const ETH_HOSTNAME = 'actor1.local';
const ETH_PROVIDER_URL = 'ws://' + ETH_HOSTNAME + ':' + ETH_PORT;

module.exports = {
  ADMIN_GET_ISP_LIST_URL,
  ADMIN_GET_VENDOR_LIST_URL,
  ADMIN_GET_ABI_URL,
  ADMIN_SEED_ETHER_URL,
  ISP_AUTHN_URL,
  ETH_NETWORK_ID,
  ETH_PORT,
  ETH_HOSTNAME,
  ETH_PROVIDER_URL
}