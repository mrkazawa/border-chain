const ADMIN_HOSTNAME = 'actor1.local';
const ADMIN_PORT = 3000;
const ADMIN_BASE_URL = 'http://' + ADMIN_HOSTNAME + ':' + ADMIN_PORT;
const ADMIN_VENDOR_LIST_URL = ADMIN_BASE_URL + '/vendor';
const ADMIN_DEVICE_LIST_URL = ADMIN_BASE_URL + '/device';

// for gateway
const GATEWAY_HOSTNAME = 'actor5.local';
const GATEWAY_PORT = 3000;
const GATEWAY_BASE_URL = 'http://' + GATEWAY_HOSTNAME + ':' + GATEWAY_PORT;
const GATEWAY_AUTHN_URL = GATEWAY_BASE_URL + '/authenticate';

// for device and vendor
const DEVICE_AUTHN_OPTION = {
  PKE: 1, // public-key-encryption
  SKE: 2, // secret-key-encryption
  FINGERPRINT: 3, // manufacturer-secret-fingerprint
  MAC: 4 // mac-address
};

module.exports = {
  ADMIN_VENDOR_LIST_URL,
  ADMIN_DEVICE_LIST_URL,
  GATEWAY_AUTHN_URL,
  DEVICE_AUTHN_OPTION
};