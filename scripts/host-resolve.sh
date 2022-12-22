#!/bin/sh

dir="/ip"
mkdir -p "$dir"
for HOST in "$@"; do
    nslookup $HOST |
        grep 'Address: ' |
        cut -d ' ' -f 2 >"/$dir/$HOST"
done
