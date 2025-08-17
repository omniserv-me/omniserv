# omniserv
So here's the thing: this is the repo for my homelab project, which will include different microservices:
Butler (Orchestrator, CLI)
Smartlife (rewritten in x-Language)
Omniscient (rewritten in x-Language, add support for excel tables)
Leobot (rewritten in x-Language)
Cloud (selfhosted Nextcloud?)
DNS (which will resolve my own domain such as .omni inside of local network, as well as self-hosted webpage)
VPN (WireGuard?)
Custom logging (also into the db and in cli)
CI/CD pipeline (push from laptop, auto update on server)
Prod/Test environments, bc the server must be reliable for my fam to use

Communication means: mostly gRPC (protobuf), possibly MQTT(to choose which one) if needed

х-language: I think of Golang, possibly Java, worst-case Python
Gitignore is github's template for Go

This thingy I plan to run on Raspberry Pi 5 8/16GB with 512 SSD and 2TB HDD for starters

Very much later on when I get the MANEY I plan on adding some AI's (selfhosted ofc)
