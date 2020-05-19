const RC = artifacts.require("RegistryContract");

module.exports = function(deployer) {
  deployer.deploy(RC);
};