# -*- mode: ruby -*-
# vi: set ft=ruby :

# Vagrant file configuration I learnt from here
# https://manski.net/2016/09/vagrant-multi-machine-tutorial/

BOX_IMAGE = "bento/ubuntu-16.04"
BOX_MEMORY = "4096"
BOX_CPU = 1
SERVER_CPU = 16;

ACTOR_COUNT = 6

Vagrant.configure("2") do |config|
  (1..ACTOR_COUNT).each do |i|
    config.vm.define "actor#{i}" do |subconfig|
      subconfig.vm.box = BOX_IMAGE
      subconfig.vm.box_check_update = true
      subconfig.vm.hostname = "actor#{i}"
      subconfig.vm.network :private_network, ip: "10.0.0.#{i + 50}"

      subconfig.vm.provider "virtualbox" do |vb|
        vb.name = "actor#{i}"
        vb.memory = BOX_MEMORY

        case ACTOR_COUNT
        when 1
          vb.cpus = BOX_CPU
        when 4..6
          vb.cpus = SERVER_CPU
        end
      end
    end
  end

  config.ssh.compression = false
  config.ssh.keep_alive = true

  # Installation (WARNING! the order matters)
  config.vm.provision "shell", path: "shell/base_install.sh", privileged: true
  config.vm.provision "shell", path: "shell/color_prompt.sh", privileged: false
  config.vm.provision "shell", path: "shell/nvm_install.sh", privileged: false

  # shared folders setup using RSYNC
  config.vm.synced_folder "src/", "/home/vagrant/src", type: "rsync", rsync__exclude: [".vscode/", ".git/", "node_modules/"]
end