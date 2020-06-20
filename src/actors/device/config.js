const ADMIN_HOSTNAME = 'actor1.local';
const ADMIN_PORT = 3000;
const ADMIN_BASE_URL = 'http://' + ADMIN_HOSTNAME + ':' + ADMIN_PORT;
const ADMIN_DEVICE_INFO_URL = ADMIN_BASE_URL + '/device';

// for gateway
const GATEWAY_HOSTNAME = 'actor5.local';
const GATEWAY_PORT = 3000;
const GATEWAY_BASE_URL = 'http://' + GATEWAY_HOSTNAME + ':' + GATEWAY_PORT;
const GATEWAY_AUTHN_URL = GATEWAY_BASE_URL + '/authenticate';

// for device and vendor
const DEVICE_AUTHN_OPTION = {
  PKSIG: 1, // public-key-signature
  HMAC: 2, // symmetric-key-signature
  FINGERPRINT: 3, // manufacturer-secret-fingerprint
  MAC: 4 // mac-address
};

module.exports = {
  ADMIN_DEVICE_INFO_URL,
  GATEWAY_AUTHN_URL,
  DEVICE_AUTHN_OPTION
};