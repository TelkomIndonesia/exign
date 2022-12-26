#!/bin/bash
set -euo pipefail
        
CONFIG_DIR=${CONFIG_DIR:-"config"}

cd "$CONFIG_DIR"
git init
git add .
git diff --cached --exit-code \
    || git \
        -c user.name=nobody \
        -c user.email='<>' \
        commit -a -m "config updated"