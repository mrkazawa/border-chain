const EthCrypto = require('eth-crypto');
const fs = require('fs');

const tools = require('./actor_tools');
const identity = require('./identity');

const ownerCredentialsPath = './keys/owner-credentials.json';
const ISPCredentialsPath = './keys/isp-credentials.json';

async function main() {
    const routerIP = '200.100.10.10';
    const username = 'john';
    const password = 'fish';
    const nonce = tools.randomValueBase64(32);

    // get owner credentials
    let data = fs.readFileSync(ownerCredentialsPath, 'utf8');
    const owner = JSON.parse(data);
    // we assume the author knows the ISP public key
    // we hardcoded the process by reading ISP credentials file
    data = fs.readFileSync(ISPCredentialsPath, 'utf8');
    const isp = JSON.parse(data);

    // preparing payload
    const auth = {
        routerIP:routerIP,
        username:username,
        password:password,
        nonce:nonce
    };
    const payload = JSON.stringify(auth);
    // encrypting using ISP public key
    const encrypted = await EthCrypto.encryptWithPublicKey(isp.publicKey, payload);
    const encryptedPayload = EthCrypto.cipher.stringify(encrypted);
    // signing using OWNER private key
    const payloadHash = EthCrypto.hash.keccak256(encryptedPayload);
    const signature = EthCrypto.sign(owner.privateKey, payloadHash);

    // sending transaction to register payload to the smart contract
    // sending authentication payload to the ISP
}

identity.create();
main();