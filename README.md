## Install Node JS using NVM
```
sudo apt-get update
sudo apt-get install build-essential libssl-dev
curl -sL https://raw.githubusercontent.com/creationix/nvm/v0.33.8/install.sh -o install_nvm.sh
bash install_nvm.sh
source ~/.profile
nvm install 8.9.4
nvm use 8.9.4
```

## Install dependencies
```
npm install truffle
npm install truffle-assertions
npm install ganache-cli
npm install --save bs58
npm install --save web3
npm install eth-crypto --save
npm install --save ipfs-http-client
```

## Install IPFS hosts
We use the dockerized version of the IPFS deamon. So you need to have docker in your machine.
A guide for docker can be found here (URL). Once, the docker is installed, we download the IPFS contrainer with this command
```
docker pull ipfs/go-ipfs:latest
run-docker.sh
```


## Running
cd to the application
git clone 
ganache-cli -m dongseo
truffle deploy
make sure to get the address of the registry contract and update the rc_address.json