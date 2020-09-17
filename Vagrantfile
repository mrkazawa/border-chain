# -*- mode: ruby -*-
# vi: set ft=ruby :

# Vagrant file configuration I learnt from here
# https://manski.net/2016/09/vagrant-multi-machine-tutorial/

BOX_IMAGE = "bento/ubuntu-16.04"
BOX_MEMORY = "4096"
NODE_COUNT = 7

Vagrant.configure("2") do |config|
  config.ssh.compression = false
  config.ssh.keep_alive = true

  (1..NODE_COUNT).each do |i|
    config.vm.define "actor#{i}" do |subconfig|
      subconfig.vm.box = BOX_IMAGE
      subconfig.vm.box_check_update = true
      subconfig.vm.hostname = "actor#{i}"
      subconfig.vm.network :private_network, ip: "10.0.0.#{i + 10}"

      subconfig.vm.provider "virtualbox" do |vb|
        vb.name = "actor#{i}"
        vb.memory = BOX_MEMORY
        case i
        when 1 # for admin
          vb.cpus = 1
        when 2 # for iot domain owner
          vb.cpus = 1
        when 3 # for iot device
          vb.cpus = 1
        when 4 # for isp
          vb.cpus = 2
        when 5 # for iot gateway
          vb.cpus = 2
        when 6 # for iot vendor
          vb.cpus = 2
        when 7 # for iot service
          vb.cpus = 1
        end
      end
    end
  end

  # Installation (WARNING! the order matters)
  config.vm.provision "shell", path: "shell/base_install.sh", privileged: true
  config.vm.provision "shell", path: "shell/color_prompt.sh", privileged: false
  config.vm.provision "shell", path: "shell/nvm_install.sh", privileged: false

  # shared folders setup using RSYNC
  config.vm.synced_folder "src/", "/home/vagrant/src", type: "rsync", rsync__exclude: [".vscode/", ".git/", "node_modules/"]
end