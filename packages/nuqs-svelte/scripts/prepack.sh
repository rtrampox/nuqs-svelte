#!/usr/bin/env bash

set -e

# Place ourselves in the package directory
cd "$(dirname "$0")/.."

# Copy the README & License from the root of the repository
cp -f ../../README.md ../../LICENSE ./
