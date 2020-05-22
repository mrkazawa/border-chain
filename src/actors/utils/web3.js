const Web3 = require('web3');

const web3 = new Web3(new Web3.providers.WebsocketProvider('ws://10.0.0.56:8545'));

module.exports = web3;