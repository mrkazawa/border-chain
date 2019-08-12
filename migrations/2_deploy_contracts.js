const RC = artifacts.require("RegistryContract");
const IC = artifacts.require("ISPContract");

module.exports = function(deployer) {
  deployer.deploy(RC);
  //deployer.link(Broker, Owner);
  deployer.deploy(IC);
  //deployer.link(Broker, Network);
  //deployer.deploy(Network);
};