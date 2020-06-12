// for admin
const ADMIN_HOSTNAME = 'actor1.local';
const ADMIN_PORT = 3000;
const ADMIN_BASE_URL = 'http://' + ADMIN_HOSTNAME + ':' + ADMIN_PORT;
const ADMIN_ISP_LIST_URL = ADMIN_BASE_URL + '/isp';
const ADMIN_VENDOR_LIST_URL = ADMIN_BASE_URL + '/vendor';
const ADMIN_GATEWAY_LIST_URL = ADMIN_BASE_URL + '/gateway';
const ADMIN_DEVICE_LIST_URL = ADMIN_BASE_URL + '/device';
const ADMIN_ABI_URL = ADMIN_BASE_URL + '/contract-abi';
const ADMIN_DEVICE_PROPERTIES_URL = ADMIN_BASE_URL + '/device-properties';
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
const GATEWAY_AUTHN_URL = GATEWAY_BASE_URL + '/authenticate';
const GATEWAY_AUTHZ_URL = GATEWAY_BASE_URL + '/authorize';
const GATEWAY_ACCESS_URL = GATEWAY_BASE_URL + '/access';

// for device and vendor
const DEVICE_AUTHN_OPTION = {
  PKE: 1, // public-key-encryption
  SKE: 2, // secret-key-encryption
  FINGERPRINT: 3, // manufacturer-secret-fingerprint
  MAC: 4 // mac-address
};

// for vendor
const VENDOR_HOSTNAME = 'actor6.local';
const VENDOR_PORT = 3000;
const VENDOR_BASE_URL = 'http://' + VENDOR_HOSTNAME + ':' + VENDOR_PORT;
const VENDOR_AUTHN_URL = VENDOR_BASE_URL + '/authenticate';

// for ethereum network
const ETH_NETWORK_ID = 2020;
const ETH_PORT = 8545;
const ETH_HOSTNAME = 'actor1.local';
const ETH_PROVIDER_URL = 'ws://' + ETH_HOSTNAME + ':' + ETH_PORT;

module.exports = {
  ADMIN_ISP_LIST_URL,
  ADMIN_VENDOR_LIST_URL,
  ADMIN_GATEWAY_LIST_URL,
  ADMIN_DEVICE_LIST_URL,
  ADMIN_ABI_URL,
  ADMIN_DEVICE_PROPERTIES_URL,
  ADMIN_SEED_ETHER_URL,
  ISP_USER_REGISTRATION_URL,
  ISP_AUTHN_URL,
  GATEWAY_AUTHN_URL,
  GATEWAY_AUTHZ_URL,
  GATEWAY_ACCESS_URL,
  DEVICE_AUTHN_OPTION,
  VENDOR_AUTHN_URL,
  ETH_NETWORK_ID,
  ETH_PORT,
  ETH_HOSTNAME,
  ETH_PROVIDER_URL
}