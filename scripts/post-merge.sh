#!/bin/bash
set -e
pnpm install --frozen-lockfile
bash scripts/build-mobile.sh
