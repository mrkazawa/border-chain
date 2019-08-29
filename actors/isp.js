const express = require('express');
const EthCrypto = require('eth-crypto');
const fs = require('fs');
const Web3 = require('web3');

const ownerPath = './ganache_files/owner.json';
const ISPPath = './ganache_files/isp.json';
const contractPath = './ganache_files/contract.json';
const contractABIPath = '../build/contracts/RegistryContract.json';

// connect to ganache network
const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));

const app = express();
app.use(express.json());
app.use(function (err, req, res, next) {
    res.status(err.status || 500).json({status: err.status, message: err.message});
});

app.post('/authenticate', async (req, res) => {
    /**
     * our mock of users data stored in the ISP
     * in real life, this data is collected by ISP during users
     * registration and then stored in database.
     */
    const storedData = {
        routerIP: '200.100.10.10',
        username: 'john',
        password: 'fish'
    };

    // get owner credentials from file
    // in real life, this will be database connection
    let data = fs.readFileSync(ownerPath, 'utf8');
    const owner = JSON.parse(data);
    // get isp credentials from file
    data = fs.readFileSync(ISPPath, 'utf8');
    const ISP = JSON.parse(data);
    // parsing the local ABI from truffle
    // in live network, the ABI can be queried from etherscan.io
    data = fs.readFileSync(contractABIPath, 'utf8');
    const obj = JSON.parse(data);
    // instantiate by address
    data = fs.readFileSync(contractPath, 'utf8');
    const contract = JSON.parse(data);

    // checksumming all addresses
    const ISPAddress = web3.utils.toChecksumAddress(ISP.address);
    const RCAddress = web3.utils.toChecksumAddress(contract.address);
    const ownerAddress = web3.utils.toChecksumAddress(owner.address);

    // creating RegistryContract from deployed contract at the given address
    const RC = new web3.eth.Contract(obj.abi, RCAddress);

    const authPayloadHash = EthCrypto.hash.keccak256(req.body.authPayload);

    // get payload detail here
    const payloadStatus = await RC.methods.isValidPayloadForVerifier(authPayloadHash).call({
        from: ISPAddress
    });
    if (payloadStatus) {
        const signerAddress = EthCrypto.recover(req.body.authSignature, authPayloadHash);

        if (web3.utils.toChecksumAddress(signerAddress) == ownerAddress) {
            const encrypted = EthCrypto.cipher.parse(req.body.authPayload);
            const authString = await EthCrypto.decryptWithPrivateKey(ISP.privateKey, encrypted);
            const auth = JSON.parse(authString);

            if (auth.username == storedData.username &&
                auth.password == storedData.password &&
                auth.routerIP == storedData.routerIP) {
                    
                // temporary code
                const gatewayPath = './ganache_files/gateway.json';
                data = fs.readFileSync(gatewayPath, 'utf8');
                const GW = JSON.parse(data);
                const GWAddress = web3.utils.toChecksumAddress(GW.address);

                // sending transaction to varify payload
                // with hash only should be enough
                let tx = await RC.methods.verifyAuthNGateway(authPayloadHash, GWAddress).send({
                    from: ISPAddress
                });
                if (typeof tx.events.GatewayVerified !== 'undefined') {
                    const event = tx.events.GatewayVerified;
                    if (event.returnValues['sender'] == ISPAddress &&
                        event.returnValues['gateway'] == GWAddress) {
                        console.log('transaction received by contract!');
                        res.status(200).send('authentication attempt successful');
                    }
                }
            }
        }
    }
});

// main
app.listen(3000, () =>
    console.log('ISP Authentication Server is listening on port 3000!'),
);