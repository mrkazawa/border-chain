const Broker = artifacts.require("Broker");
const Owner = artifacts.require("Owner");
const Network = artifacts.require("Network");

module.exports = function(deployer) {
  deployer.deploy(Network);
  deployer.link(Network, Broker);
  deployer.deploy(Broker);
  deployer.link(Broker, Owner);
  deployer.deploy(Owner);
  //deployer.link(Broker, Network);
  //deployer.deploy(Network);
};