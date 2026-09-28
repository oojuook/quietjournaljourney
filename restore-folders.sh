#!/bin/sh
set -eu

if [ -f src.tar.gz ] && [ ! -d src ]; then
  tar -xzf src.tar.gz
fi

if [ -f public.tar.gz ] && [ ! -d public ]; then
  tar -xzf public.tar.gz
fi
