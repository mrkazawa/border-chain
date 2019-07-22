const Broker = artifacts.require("Broker");
const Owner = artifacts.require("Owner");
//const Network = artifacts.require("Network");

module.exports = function(deployer) {
  deployer.deploy(Broker);
  deployer.link(Broker, Owner);
  deployer.deploy(Owner);
  //deployer.deploy(Network);
};