#!/usr/bin/env sh
# Regenerate llms-full.txt from the documents in docs/.
#
# llms-full.txt is the single-fetch corpus for AI agents: every doc concatenated
# in reading order. Run this after editing anything in docs/ so the two stay in
# sync, then commit both.
#
# Usage:  ./scripts/build-llms-full.sh

set -eu

cd "$(dirname "$0")/.."

DOCS="
docs/README.md
docs/what-is-nip-05.md
docs/getting-started.md
docs/plans-and-pricing.md
docs/relay.md
docs/api.md
docs/faq.md
docs/troubleshooting.md
docs/nostr-protocol.md
"

OUT=llms-full.txt
TODAY=$(date -u +%Y-%m-%d)

{
  echo '# NostrAddress.com — Full Documentation'
  echo
  echo '> Free and premium Nostr Address (NIP-05) identifiers, plus a spam-free premium'
  echo '> Nostr relay. This file concatenates the complete documentation set for'
  echo '> single-fetch ingestion by AI agents. Source documents live at'
  echo '> https://nostraddress.com/docs/ and a linked index is at'
  echo '> https://nostraddress.com/llms.txt'
  echo
  echo "Last updated: $TODAY"
  echo
  echo '---'
  echo

  for f in $DOCS; do
    [ -f "$f" ] || { echo "missing: $f" >&2; exit 1; }
    echo "<!-- source: https://nostraddress.com/$f -->"
    echo
    cat "$f"
    echo
    echo '---'
    echo
  done
} > "$OUT"

echo "wrote $OUT ($(wc -c < "$OUT") bytes)"
