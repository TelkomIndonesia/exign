#!/bin/sh

HOSTNAME=${1:-"host.docker.internal"}

nslookup $HOSTNAME |\
    grep 'Address: ' |\
        cut -d ' ' -f 2 > /ip/$HOSTNAME