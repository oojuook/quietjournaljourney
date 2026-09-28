#!/bin/sh
set -eu

if [ -f src.tar.gz ]; then
  rm -rf src
  tar -xzf src.tar.gz
fi

if [ -f public.tar.gz ]; then
  rm -rf public
  tar -xzf public.tar.gz
fi
