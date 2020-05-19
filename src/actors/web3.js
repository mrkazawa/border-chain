const Web3 = require('web3');

// Specify the location of the ethereum network
const web3 = new Web3(new Web3.providers.WebsocketProvider('ws://10.0.0.51:8545'));

module.exports = web3;