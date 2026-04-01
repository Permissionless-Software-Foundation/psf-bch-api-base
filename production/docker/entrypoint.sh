#!/bin/bash
set -euo pipefail

cd /home/safeuser/psf-bch-api-base

node scripts/patch-apidoc-from-env.js

npm run docs

exec npm start
