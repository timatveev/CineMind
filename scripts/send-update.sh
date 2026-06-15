#!/usr/bin/env bash
# Send a fake Telegram update to the local wrangler dev webhook.
#
#   ./scripts/send-update.sh "/profile"
#   ./scripts/send-update.sh "Посоветуй комедию на вечер"
#   CHAT_ID=371455188 ./scripts/send-update.sh "/start"
#
# Handles the two manual-testing gotchas automatically:
#   * unique message_id every call (otherwise the bot's dedup drops it)
#   * a bot_command entity when the text starts with "/" (otherwise grammy
#     does not treat it as a command and routes it to the free-text handler)

set -euo pipefail

TEXT="${1:-/profile}"
CHAT_ID="${CHAT_ID:-371455188}"
URL="${URL:-http://localhost:8787/webhook}"

SECRET="$(grep '^TELEGRAM_WEBHOOK_SECRET=' .dev.vars | cut -d= -f2-)"
MID="$RANDOM$RANDOM"

# If it's a command, attach a bot_command entity covering the first token.
ENTITIES=""
if [[ "$TEXT" == /* ]]; then
  CMD="${TEXT%% *}"               # first word, e.g. "/profile"
  LEN="${#CMD}"
  ENTITIES=", \"entities\": [{ \"type\": \"bot_command\", \"offset\": 0, \"length\": $LEN }]"
fi

# Escape double quotes in the user text for safe JSON embedding.
ESCAPED="${TEXT//\"/\\\"}"

read -r -d '' BODY <<JSON || true
{
  "update_id": $MID,
  "message": {
    "message_id": $MID,
    "date": 0,
    "chat": { "id": $CHAT_ID, "type": "private" },
    "from": { "id": $CHAT_ID, "is_bot": false, "first_name": "Test" },
    "text": "$ESCAPED"$ENTITIES
  }
}
JSON

echo "→ POST $URL  text=$TEXT  message_id=$MID"
curl -s -X POST "$URL" \
  -H 'content-type: application/json' \
  -H "X-Telegram-Bot-Api-Secret-Token: $SECRET" \
  -d "$BODY"
echo
