// for admin
const ADMIN_HOSTNAME = 'actor1.local';
const ADMIN_PORT = 3000;
const ADMIN_BASE_URL = 'http://' + ADMIN_HOSTNAME + ':' + ADMIN_PORT;
const ADMIN_ABI_URL = ADMIN_BASE_URL + '/contract-abi';
const ADMIN_SEED_ETHER_URL = ADMIN_BASE_URL + '/seed-ether';
const ADMIN_DEVICE_INFO_URL = ADMIN_BASE_URL + '/device';
const ADMIN_VENDOR_INFO_URL = ADMIN_BASE_URL + '/vendor';

// for device and vendor
const DEVICE_AUTHN_OPTION = {
  PKSIG: 1, // public-key-signature
  HMAC: 2, // symmetric-key-signature
  FINGERPRINT: 3, // manufacturer-secret-fingerprint
  MAC: 4 // mac-address
};

// mock device properties
const DEVICE_PROPERTIES = {
  secretKey: '4605d44703c2620fc2574c9a9216bd3267457324',
  fingerprint: 'cf23df2207d99a74fbe169e3eba035e633b65d94',
  mac: '00-14-22-01-23-45'
};

// for ethereum network
const ETH_NETWORK_ID = 2020;

module.exports = {
  ADMIN_ABI_URL,
  ADMIN_SEED_ETHER_URL,
  ADMIN_DEVICE_INFO_URL,
  ADMIN_VENDOR_INFO_URL,
  DEVICE_AUTHN_OPTION,
  DEVICE_PROPERTIES,
  ETH_NETWORK_ID
};