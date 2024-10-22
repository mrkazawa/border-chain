# Bash file for Vagrant provisioning only
# It will called automatically during the FIRST 'vagrant up'
# When boxes already created, we can provision again by adding '--provision' param

# For instance,
# vagrant up --provision
# vagrant reload --provision

# update linux package repo
apt-get update

# -------------------------------- For Networking -------------------------------- #

apt-get install -y avahi-daemon libnss-mdns
apt-get install -y sshpass

# -------------------------------- For Crypto Stuff -------------------------------- #

apt-get install -y build-essential g++

# -------------------------------- For Database -------------------------------- #

apt-get install memcached