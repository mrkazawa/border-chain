const EthCrypto = require('eth-crypto');
const fs = require('fs');

const ownerCredentialsPath = './keys/owner-credentials.json';
const ISPCredentialsPath = './keys/isp-credentials.json';
const vendorCredentialsPath = './keys/vendor-credentials.json';
const gatewayCredentialsPath = './keys/gateway-credentials.json';

module.exports = {
    create: function() {
        async function createAndStoreIdentity(path) {
            try {
                // check if file exists
                await fs.promises.access(path);
            } catch (error) {
                // does not exist
                identity = EthCrypto.createIdentity();
                let json = JSON.stringify(identity);
                fs.writeFileSync(path, json, 'utf8');
            }
        }
    
        createAndStoreIdentity(ownerCredentialsPath);
        createAndStoreIdentity(ISPCredentialsPath);
        createAndStoreIdentity(vendorCredentialsPath);
        createAndStoreIdentity(gatewayCredentialsPath);
    }
}