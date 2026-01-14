#!/bin/bash
# Wrapper script for running tests that maid test can execute
# Usage: scripts/run-tests.sh [test-pattern]

if [ -z "$1" ]; then
  npm test
else
  npm test -- "$1"
fi
