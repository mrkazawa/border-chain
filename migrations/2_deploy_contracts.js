const RC = artifacts.require("RegistryContract");
const Owner = artifacts.require("Owner");
const Network = artifacts.require("Network");

module.exports = function(deployer) {
  deployer.deploy(RC);
  //deployer.link(Broker, Owner);
  //deployer.deploy(Owner);
  //deployer.link(Broker, Network);
  //deployer.deploy(Network);
};