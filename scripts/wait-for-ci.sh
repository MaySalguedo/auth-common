#!/bin/sh
[ -n "$ACT" ] && { echo "act detected — skipping CI gate"; exit 0; }
SHA="$1"
RUN=$(gh run list --workflow ci.yml --commit "$SHA" --json status,conclusion --jq '.[0]')
if [ -z "$RUN" ] || [ "$RUN" = "null" ]; then
  echo "No CI run found for this commit — proceeding"
  exit 0
fi
STATUS=$(echo "$RUN" | jq -r '.status')
CONCLUSION=$(echo "$RUN" | jq -r '.conclusion')
if [ "$STATUS" = "completed" ]; then
  if [ "$CONCLUSION" = "success" ]; then
    echo "CI passed"
    exit 0
  else
    echo "CI failed: $CONCLUSION"
    exit 1
  fi
fi
echo "CI in progress (status: $STATUS), waiting..."
for i in $(seq 1 60); do
  sleep 10
  RUN=$(gh run list --workflow ci.yml --commit "$SHA" --json status,conclusion --jq '.[0]')
  STATUS=$(echo "$RUN" | jq -r '.status')
  CONCLUSION=$(echo "$RUN" | jq -r '.conclusion')
  if [ "$STATUS" = "completed" ]; then
    if [ "$CONCLUSION" = "success" ]; then
      echo "CI passed"
      exit 0
    else
      echo "CI failed: $CONCLUSION"
      exit 1
    fi
  fi
  echo "Still waiting (status: $STATUS)..."
done
echo "Timed out waiting for CI (10 min)"
exit 1
