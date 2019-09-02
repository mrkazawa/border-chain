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
npm install express --save
npm install --save request
npm install --save request-promise-native
```

## Running
cd to the application
git clone 
ganache-cli -m dongseo
truffle deploy

make sure to get the address of the registry contract and update the rc_address.json