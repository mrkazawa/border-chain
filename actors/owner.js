const EthCrypto = require('eth-crypto');
const fs = require('fs');
const rp = require('request-promise-native');
const Web3 = require('web3');

const tools = require('./actor_tools');

// the path to the preloaded info from ganache network
const ownerPath = './ganache_files/owner.json';
const ISPPath = './ganache_files/isp.json';
const gatewayPath = './ganache_files/gateway.json';
const contractPath = './ganache_files/contract.json';
const contractABIPath = '../build/contracts/RegistryContract.json';

// connect to ganache network
const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));

async function main() {
    // example of authentication payload for the ISP
    const routerIP = '200.100.10.10';
    const username = 'john';
    const password = 'fish';
    const nonce = tools.randomValueBase64(32);

    // get owner credentials
    let data = fs.readFileSync(ownerPath, 'utf8');
    const owner = JSON.parse(data);
    // we assume the author knows the ISP public key
    // we hardcoded the process by reading ISP credentials file
    data = fs.readFileSync(ISPPath, 'utf8');
    const ISP = JSON.parse(data);
    // owner also knows the credentials of the gateway
    data = fs.readFileSync(gatewayPath, 'utf8');
    const GW = JSON.parse(data);
    // parsing the local ABI from truffle
    // in live network, the ABI can be queried from etherscan.io
    data = fs.readFileSync(contractABIPath, 'utf8');
    const obj = JSON.parse(data);
    // instantiate by address
    data = fs.readFileSync(contractPath, 'utf8');
    const contract = JSON.parse(data);

    // checksuming all address
    const ownerAddres = web3.utils.toChecksumAddress(owner.address);
    const ISPAddress = web3.utils.toChecksumAddress(ISP.address);
    const GWAddress = web3.utils.toChecksumAddress(GW.address);
    const RCAddress = web3.utils.toChecksumAddress(contract.address);

    // creating RegistryContract from deployed contract at the given address
    const RC = new web3.eth.Contract(obj.abi, RCAddress);

    // preparing payload
    const auth = {
        routerIP: routerIP,
        username: username,
        password: password,
        nonce: nonce
    };
    const authPayload = JSON.stringify(auth);
    // encrypting using ISP public key
    const ISPPublicKey = EthCrypto.publicKeyByPrivateKey(ISP.privateKey);
    const authEncrypted = await EthCrypto.encryptWithPublicKey(ISPPublicKey, authPayload);
    const authEncryptedPayload = EthCrypto.cipher.stringify(authEncrypted);
    // signing using OWNER private key
    const authPayloadHash = EthCrypto.hash.keccak256(authEncryptedPayload);
    const authSignature = EthCrypto.sign(owner.privateKey, authPayloadHash);

    // sending transaction to register payload to the smart contract
    let tx = await RC.methods.storeAuthNPayload(authPayloadHash, GWAddress, ISPAddress).send({
        from: ownerAddres,
        gas: 1000000
    });
    if (typeof tx.events.NewPayloadAdded !== 'undefined') {
        const event = tx.events.NewPayloadAdded;
        if (event.returnValues['sender'] == ownerAddres &&
            event.returnValues['IPFSHash'] == authPayloadHash) {
            console.log('transaction received by contract!');
        }
    }

    const authEndpoint = 'http://localhost:3000/authenticate';
    let options = {
        method: 'POST',
        uri: authEndpoint,
        body: {
            authPayload: authEncryptedPayload,
            authSignature: authSignature
        },
        json: true // Automatically stringifies the body to JSON
    };
    // sending authentication payload to the ISP
    rp(options).then(function (parsedBody) {
        console.log('sent');
    }).catch(function (err) {
        console.log(err);
    });
}

main();