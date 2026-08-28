# The Premium Nostr Relay

Purple and Onyx subscribers get access to a paid, allow-listed Nostr relay.

## Connection details

```
wss://relay.nostraddress.com
```

Add that URL to the relay list of your Nostr client (Damus, Amethyst, Primal,
Nostur, Snort, or any other NIP-01 client). No password or token is needed —
access is granted by public key.

## Why a paid relay

Public relays are free to write to, which means they carry the full weight of
spam and bot traffic on the network. This relay only accepts writes from public
keys attached to an active paid subscription. The result is a smaller, faster
relay with essentially no spam.

## Access control

Your public key is added to the relay's allow-list **automatically** when your
Purple or Onyx subscription becomes active. There is nothing to configure.

Access ends when the subscription ends. Your notes already stored on the relay
are unaffected; you simply lose write access, and should switch back to public
relays.

## Technical details

The relay runs [Nosflare](https://github.com/Spl0itable/nosflare), a Nostr relay
implementation for Cloudflare Workers. Events are validated with Schnorr
signatures over secp256k1, per NIP-01.

Supported NIPs at the time of writing:

| NIP | Purpose |
| --- | --- |
| 01 | Basic protocol flow |
| 02 | Contact list and petnames |
| 04 | Encrypted direct messages |
| 05 | DNS-based identifiers (Nostr Address) |
| 09 | Event deletion |
| 11 | Relay information document |
| 12 | Generic tag queries |
| 15 | End of stored events notice |
| 16 | Event treatment |
| 20 | Command results |
| 22 | Event `created_at` limits |
| 33 | Parameterized replaceable events |
| 40 | Expiration timestamp |

The relay's live capabilities are always discoverable via its NIP-11 information
document, which is the authoritative source:

```bash
curl -H "Accept: application/nostr+json" https://relay.nostraddress.com/
```

That returns the relay's name, description, contact, supported NIPs, software
URL, and version as JSON.

## Moderation

The relay applies server-side filtering before accepting an event:

- Writes are restricted to allow-listed (subscribed) public keys.
- Certain event kinds are rejected.
- Events containing blocked words or phrases are rejected.

Rejections are returned to the client as a NIP-20 `OK` message with `false` and a
reason string.

## Connecting programmatically

The relay speaks standard Nostr over WebSocket, so any NIP-01 library works:

```js
const ws = new WebSocket("wss://relay.nostraddress.com");

ws.onopen = () => {
  // Subscribe to the 20 most recent text notes
  ws.send(JSON.stringify(["REQ", "sub1", { kinds: [1], limit: 20 }]));
};

ws.onmessage = (msg) => {
  const [type, ...rest] = JSON.parse(msg.data);
  if (type === "EVENT") console.log(rest[1]);
  if (type === "EOSE") console.log("end of stored events");
};
```

Reads are open. **Writes require an active subscription.**

## Support

Relay problems: <support@NostrAddress.com>
