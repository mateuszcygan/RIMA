#!/usr/bin/env bash
set -euo pipefail

: $GLOVE_MODEL_GDRIVE_ID
: $GLOVE_MODEL_FILE_PATH

echo "Migrating database ..."
python manage.py migrate

if [ -f "$GLOVE_MODEL_FILE_PATH" ]; then
  echo "GloVe model present: $GLOVE_MODEL_FILE_PATH"
else
  echo "GloVe model missing; downloading now ..."
  $HOME/.local/bin/gdown --id $GLOVE_MODEL_GDRIVE_ID -O $GLOVE_MODEL_FILE_PATH
fi

echo "Starting Celery job queue ..."
celery worker --app=interest_miner_api -l info
