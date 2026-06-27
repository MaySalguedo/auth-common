#!/bin/sh
jq ".version = \"${GITHUB_REF_NAME#v}\"" package.json > package.tmp.json && mv package.tmp.json package.json
