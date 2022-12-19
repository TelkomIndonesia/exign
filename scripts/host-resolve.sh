#!/bin/sh

for HOST in "$@"; do
    nslookup $HOST |\
        grep 'Address: ' |\
            cut -d ' ' -f 2 > /ip/$HOST
done