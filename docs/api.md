# API Reference

NostrAddress.com exposes the standard NIP-05 resolution endpoint. It is a public,
read-only, unauthenticated JSON API — safe for agents and scripts to query.

## `GET /.well-known/nostr.json`

Resolves a registered username to its Nostr public key.

**Base URLs** — one per domain the service issues addresses on:

```
https://nostraddress.com/.well-known/nostr.json
https://nostrverified.com/.well-known/nostr.json
https://21million.fun/.well-known/nostr.json
https://nostrich.cool/.well-known/nostr.json
https://checkmark.club/.well-known/nostr.json
```

### Query parameters

| Parameter | Required | Description |
| --- | --- | --- |
| `name` | No | The local part of the address, i.e. the text before `@`. Omit to request the full mapping. |

### Response

`200 OK` with `Content-Type: application/json`. The body is a JSON object with a
`names` key mapping usernames to 64-character hex public keys:

```json
{
  "names": {
    "lucas": "d49a9023a21dba1b3c8306ca369bf3243d8b44b8f0b6d1196607f7b0990fa8df"
  }
}
```

An **unregistered** name returns `200` with an empty mapping, not a `404`:

```json
{ "names": {} }
```

Per NIP-05 the response may also include a `relays` key, mapping public keys to
arrays of recommended relay URLs. Treat it as optional and absent unless present.

### Examples

Look up a single name:

```bash
curl "https://nostraddress.com/.well-known/nostr.json?name=lucas"
```

Extract just the public key:

```bash
curl -s "https://nostraddress.com/.well-known/nostr.json?name=lucas" \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['names'].get('lucas','not registered'))"
```

Check whether a username is taken, in JavaScript:

```js
async function isTaken(name, domain = "nostraddress.com") {
  const res = await fetch(
    `https://${domain}/.well-known/nostr.json?name=${encodeURIComponent(name)}`
  );
  const { names = {} } = await res.json();
  return Boolean(names[name]);
}
```

Verify that an address really belongs to a public key:

```js
async function verify(address, expectedHexPubkey) {
  const [name, domain] = address.split("@");
  const res = await fetch(
    `https://${domain}/.well-known/nostr.json?name=${encodeURIComponent(name)}`
  );
  const { names = {} } = await res.json();
  return names[name]?.toLowerCase() === expectedHexPubkey.toLowerCase();
}
```

### Notes for implementers

- Lookups are **case-sensitive** on the name as registered.
- Public keys are returned in **hex**, never as `npub`.
- The endpoint returns permissive CORS headers, so it is callable from a browser.
- There is no authentication and no rate-limit documented; be a good citizen and
  cache results rather than polling.

## Relay information document (NIP-11)

```bash
curl -H "Accept: application/nostr+json" https://relay.nostraddress.com/
```

Returns the relay's name, description, contact, `supported_nips`, software URL,
and version. See [relay.md](relay.md).

## Relay WebSocket (NIP-01)

```
wss://relay.nostraddress.com
```

Standard Nostr relay protocol. Reads are open; writes require an active Purple or
Onyx subscription. See [relay.md](relay.md).

## What is *not* available via API

Registration itself is not an API. The free registration form at
<https://nostraddress.com/#free> is protected by hCaptcha and must be completed
by a person; premium registration goes through Stripe checkout. There is no
programmatic endpoint for creating, modifying, or deleting a registration.

To change a registration:

- **Free tier** — resubmit the form with the new username or key.
- **Paid tier** — email <support@NostrAddress.com>.
