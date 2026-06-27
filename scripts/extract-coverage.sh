#!/bin/sh
docker compose run --rm --entrypoint "" test \
  sh -c "cp -r /app/coverage /tmp/coverage-out" || true
docker cp \
  "$(docker compose ps -q test 2>/dev/null | head -1)":/tmp/coverage-out ./coverage \
  2>/dev/null || \
docker run --rm \
  -v "$(basename $(pwd))_coverage:/data" \
  -v "$PWD:/host" \
  alpine sh -c "cp -r /data /host/coverage" 2>/dev/null || true
