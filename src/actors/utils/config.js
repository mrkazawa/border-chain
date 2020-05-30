const NETWORK_ID = '2020';

const ADMIN_URL = `http://10.0.0.51:3000`;
const ISP_LIST_URL = ADMIN_URL + `/isp`;
const VENDOR_LIST_URL = ADMIN_URL + `/vendor`;
const ABI_URL = ADMIN_URL + `/contract-abi`;
const ETHER_URL = ADMIN_URL + `/ether`;

const ISP_URL = `http://10.0.0.54:3000`;
const ISP_AUTHN_URL = ISP_URL + `/authenticate`;

module.exports = {
  NETWORK_ID,
  ISP_LIST_URL,
  VENDOR_LIST_URL,
  ABI_URL,
  ETHER_URL,
  ISP_AUTHN_URL
}