#!/bin/bash

gnome-extensions pack -f --extra-source=org.gnome.gitg-symbolic.svg --extra-source=git-monitor.json

gnome-extensions install git@eexpss.gmail.com.shell-extension.zip -f
