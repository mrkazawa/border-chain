const ADMIN_HOSTNAME = 'actor1.local';
const ADMIN_PORT = 3000;
const ADMIN_BASE_URL = 'http://' + ADMIN_HOSTNAME + ':' + ADMIN_PORT;
const ADMIN_VENDOR_LIST_URL = ADMIN_BASE_URL + '/vendor';

// for gateway
const GATEWAY_HOSTNAME = 'actor5.local';
const GATEWAY_PORT = 3000;
const GATEWAY_BASE_URL = 'http://' + GATEWAY_HOSTNAME + ':' + GATEWAY_PORT;
const GATEWAY_AUTHN_URL = GATEWAY_BASE_URL + '/authenticate';

// for vendor
const VENDOR_HOSTNAME = 'actor6.local';
const VENDOR_PORT = 3000;
const VENDOR_BASE_URL = 'http://' + VENDOR_HOSTNAME + ':' + VENDOR_PORT;
const VENDOR_DEVICE_REGISTRATION_URL = VENDOR_BASE_URL + '/register';

// for device and vendor
const DEVICE_AUTHN_OPTION = {
  PKE: 1, // public-key-encryption
  SKE: 2, // secret-key-encryption
  FINGERPRINT: 3, // manufacturer-secret-fingerprint
  MAC: 4 // mac-address
};

// mock device properties
const DEVICE_PROPERTIES = {
  vendorId: 'samsung',
  serialNumber: '1234-5678-1234-5678',
  secretKey: 'secret',
  fingerprint: 'cf23df2207d99a74fbe169e3eba035e633b65d94',
  mac: '00-14-22-01-23-45'
}

module.exports = {
  ADMIN_VENDOR_LIST_URL,
  GATEWAY_AUTHN_URL,
  VENDOR_DEVICE_REGISTRATION_URL,
  DEVICE_AUTHN_OPTION,
  DEVICE_PROPERTIES
}