// for admin
const ADMIN_HOSTNAME = 'actor1.local';
const ADMIN_PORT = 3000;
const ADMIN_BASE_URL = 'http://' + ADMIN_HOSTNAME + ':' + ADMIN_PORT;
const ADMIN_DEVICE_LIST_URL = ADMIN_BASE_URL + '/device';
const ADMIN_ABI_URL = ADMIN_BASE_URL + '/contract-abi';
const ADMIN_SEED_ETHER_URL = ADMIN_BASE_URL + '/ether';

// for device and vendor
const DEVICE_AUTHN_OPTION = {
  PKE: 1, // public-key-encryption
  SKE: 2, // secret-key-encryption
  FINGERPRINT: 3, // manufacturer-secret-fingerprint
  MAC: 4 // mac-address
};

// mock device properties
const DEVICE_PROPERTIES = {
  serialNumber: '1234-5678-1234-5678',
  secretKey: 'secret',
  fingerprint: 'cf23df2207d99a74fbe169e3eba035e633b65d94',
  mac: '00-14-22-01-23-45'
};

// for ethereum network
const ETH_NETWORK_ID = 2020;

module.exports = {
  ADMIN_DEVICE_LIST_URL,
  ADMIN_ABI_URL,
  ADMIN_SEED_ETHER_URL,
  DEVICE_AUTHN_OPTION,
  DEVICE_PROPERTIES,
  ETH_NETWORK_ID
};