#!/bin/sh
jq '.name = "@MaySalguedo/auth-common"' package.json > package.tmp.json && mv package.tmp.json package.json
echo "@MaySalguedo:registry=https://npm.pkg.github.com" > .npmrc
echo "//npm.pkg.github.com/:_authToken=$PACKAGES_GITHUB_TOKEN" >> .npmrc
npm publish --access public
