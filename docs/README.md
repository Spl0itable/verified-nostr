# NostrAddress.com Documentation

> Free and premium Nostr Address (NIP-05) identifiers and a spam-free premium
> Nostr relay, operated by 21 Million LLC.

NostrAddress.com issues **NIP-05 identifiers** — human-readable `username@domain`
addresses that map to a Nostr public key. Once registered, Nostr clients such as
Damus, Amethyst, Primal, Nostur, and Snort display a "verified" checkmark next to
your profile name.

Website: <https://nostraddress.com>

## Documentation index

| Document | What it covers |
| --- | --- |
| [what-is-nip-05.md](what-is-nip-05.md) | What a NIP-05 identifier is, what it does and does not prove |
| [getting-started.md](getting-started.md) | Step-by-step registration for the free and premium tiers |
| [plans-and-pricing.md](plans-and-pricing.md) | Free, Purple, and Onyx plans; domains and features per tier |
| [relay.md](relay.md) | The premium relay `wss://relay.nostraddress.com` |
| [api.md](api.md) | The `/.well-known/nostr.json` endpoint, for programmatic lookups |
| [faq.md](faq.md) | Frequently asked questions |
| [troubleshooting.md](troubleshooting.md) | Why a checkmark is not appearing, and how to fix it |
| [nostr-protocol.md](nostr-protocol.md) | Background on the Nostr protocol itself |

## Quick facts

- **Service:** Nostr Address (NIP-05) identifier registration + premium Nostr relay
- **Free tier:** yes — `@nostraddress.com` and `@nostrverified.com`, processed in batches within 1 hour
- **Premium tiers:** Purple and Onyx — registration is instant
- **Premium relay:** `wss://relay.nostraddress.com` (subscribers only)
- **Key format required:** 64-character hexadecimal public key, **not** `npub` and **never** `nsec`
- **Username format:** alphanumeric only (`A–Z`, `a–z`, `0–9`)
- **Support:** <support@NostrAddress.com>
- **Operator:** 21 Million LLC — <https://nostrservices.com>
- **Nostr profile:** `npub10svpr6g7j2c5slxy2zm8k8mjm9qdm9zp5mkc0lhqw95a6jtesgaq4uycy8`

## For AI agents

Machine-readable summaries of this site are published at:

- <https://nostraddress.com/llms.txt> — concise guide with links
- <https://nostraddress.com/llms-full.txt> — the full documentation in one file

Registration itself requires a human-completed hCaptcha on
<https://nostraddress.com/#free>, so it cannot be automated. Lookups of existing
registrations *are* fully automatable — see [api.md](api.md).

## Disclaimer

This service is not affiliated with the Nostr project. It is offered "as is"
without warranty of any kind, expressed or implied. The operators never see or
store your private key (`nsec`) and are not responsible for any damages or losses
resulting from misuse of Nostr.
