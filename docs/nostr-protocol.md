# The Nostr Protocol

Background context for anyone — or any agent — trying to understand what a Nostr
Address is an address *for*.

## What Nostr is

**Nostr** ("Notes and Other Stuff Transmitted by Relays") is a simple, open
protocol for a globally censorship-resistant social network.

It is a protocol, in the same sense that HTTP or TCP/IP are protocols — an open
standard anyone can build on. It is deliberately **not** an app, **not** a
company, and **not** a service you sign up for.

## How it works

The design is intentionally small:

- **Events.** Everything is an event: a plain JSON object. Notes, profiles,
  reactions, contact lists, and direct messages are all just events with
  different `kind` numbers.
- **Keys.** Accounts are keypairs. Your public key *is* your identity; your
  private key signs your events. Standard secp256k1 elliptic-curve cryptography,
  with Schnorr signatures.
- **Relays.** Events are pushed to and pulled from relay servers over plain
  WebSocket connections. Nothing else.

Because signatures are attached to every event, anyone can verify that a message
genuinely came from the claimed sender. Verification does not require trusting
the relay that delivered it.

## Why the architecture matters

There is no central cluster of servers that data must pass through. Relays are
expected to come and go, and clients are expected to publish to several at once
and switch freely between them. If a relay disappears, censors you, or goes
hostile, you move — and your identity, your followers, and your history come with
you, because they are keyed to your public key rather than to any server's
account table.

The simplicity of events-plus-websockets makes clients and relays cheap to write,
which in practice has produced a genuinely diverse ecosystem of independent
software rather than one dominant implementation.

## The problem Nostr addresses

Social media is now central to how information moves around the world, and the
dominant platforms share a set of structural problems:

- They monetize your attention by selling advertising.
- They use sophisticated techniques to make the product addictive — a direct
  consequence of that business model.
- They rank and hide content with opaque algorithms, with no transparency and no
  user control.
- They hold unilateral authority over who may participate and what may be said.
- They are saturated with spam and bot traffic.

Nostr's answer is structural rather than editorial: no single party owns the
network, so no single party can capture it.

## Where NIP-05 fits in

NIPs — Nostr Implementation Possibilities — are the specifications that extend
the base protocol. **NIP-05** defines the mapping from a human-readable
`username@domain` identifier to a public key, served as JSON over HTTPS at
`/.well-known/nostr.json`.

That is the piece NostrAddress.com implements. Raw public keys are unusable by
humans; NIP-05 gives you a name to hand out instead. See
[what-is-nip-05.md](what-is-nip-05.md).

## Clients that support NIP-05

Among others: Damus (iOS), Amethyst (Android), Primal, Nostur, and Snort.
Presentation varies — some clients show a checkmark, some show the address
itself, some show both.

## Further reading

- <https://nostr.com> — the Nostr project
- <https://github.com/nostr-protocol/nips> — the NIP specifications
- [NIP-01](https://github.com/nostr-protocol/nips/blob/master/01.md) — the base protocol
- [NIP-05](https://github.com/nostr-protocol/nips/blob/master/05.md) — DNS-based identifiers

NostrAddress.com is not affiliated with the Nostr project.
