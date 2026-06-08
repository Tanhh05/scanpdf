#!/bin/sh
set -e

npm run db:deploy

node dist/src/workers/conversion.worker.js &
worker_pid=$!

cleanup() {
  kill "$worker_pid" 2>/dev/null || true
  wait "$worker_pid" 2>/dev/null || true
}

trap cleanup INT TERM

node dist/src/server.js &
server_pid=$!
wait "$server_pid"
server_status=$?
cleanup
exit "$server_status"
