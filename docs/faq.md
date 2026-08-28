# Frequently Asked Questions

## How long does registration take?

**Premium (Purple and Onyx) registration is instant.**

**Free registrations are processed in hourly batches** — allow up to one hour
before adding the address to your Nostr client.

## Is registration automated?

Yes. Premium plans register instantly on checkout. Free submissions are collected
by the form and processed automatically in one-hour batches.

## How do I find my public hex key?

NIP-05 identifiers require the older-style **hexadecimal** public key, not the
newer `npub1…` bech32 form. Convert yours with the
[Damus Key Converter](https://damus.io/key): paste your `npub`, copy the 64
character hex string it returns.

## What is the difference between npub, nsec, and a hex key?

- **hex key** — your public key as 64 hex characters. This is what registration
  needs.
- **`npub1…`** — the same public key, bech32-encoded for display. Convert to hex
  first.
- **`nsec1…`** — your **private key**. Never share it with anyone, ever, and
  never paste it into a website. It is not needed for NIP-05.

## I've lost my private key (nsec), do you have it?

No. Registration never requires your private key, and it is never transmitted to
or stored by this service, so there is nothing to recover. A lost or compromised
`nsec` means creating a new Nostr account and registering a new address for it.

## What happens if I change my username?

The registration breaks. A NIP-05 identifier binds one username to one public
key; if you change the username in your Nostr client, the NIP-05 field no longer
matches what was registered and the checkmark disappears.

Free users: resubmit the registration form with the new username and your hex
key. Paid subscribers: email <support@NostrAddress.com> and it will be updated
for you.

The same applies if you change your **public key** — re-register with the new key.

## What are vanity domains?

Alternative domains for the part after the `@`. Free registrations always use
`@nostraddress.com` or `@nostrverified.com`. **Onyx** subscribers additionally
get:

- `21million.fun`
- `nostrich.cool`
- `checkmark.club`

They are available immediately. To use one, just change the domain in the NIP-05
field of your client — for example `pleb@21million.fun`.

## What is a premium Nostr relay?

A Nostr relay restricted to paying subscribers, at
`wss://relay.nostraddress.com`. Because only subscribed public keys can write to
it, it carries far less spam and is faster than open public relays. Your public
key is allow-listed automatically when your subscription activates. See
[relay.md](relay.md).

## How do I manage my Purple or Onyx subscription?

Through the Stripe
[billing portal](https://billing.stripe.com/p/login/6oE9Dk08F0XTe08fYY).

## What happens to my registration if I downgrade or cancel?

At the end of the billing period, registrations on vanity domains are disabled,
and your account automatically falls back to the free `@nostraddress.com` and
`@nostrverified.com` domains. Switch the domain in your client's NIP-05 field to
keep a working checkmark.

## Is the free tier really free?

Yes, and it is intended to stay that way. A free Nostr Address on
`@nostraddress.com` and `@nostrverified.com` will always be offered. Paid plans
buy instant registration, vanity domains, and the premium relay.

If you find the free service useful, you can zap sats to
`69420@wallet.yakihonne.com`.

## Are usernames reserved?

No. Usernames are **first come, first served**. Check availability with the
checker in the pricing section before subscribing.

## What characters can a username contain?

Alphanumeric only: `A–Z`, `a–z`, and `0–9`. No spaces or punctuation.

## Does a checkmark mean I am verified?

Not in the identity-document sense. NIP-05 is designed to *identify* users, not
to *verify* them — it proves the domain owner associated that name with that key.
It becomes a meaningful endorsement when the domain itself is reputable and
associated with a specific organization. See
[what-is-nip-05.md](what-is-nip-05.md).

## Is this affiliated with the Nostr project?

No. NostrAddress.com is an independent service operated by 21 Million LLC. It is
offered "as is" without warranty of any kind.

## The checkmark still is not showing. What now?

See [troubleshooting.md](troubleshooting.md).

## How do I contact support?

<support@NostrAddress.com>, or on Nostr at
`npub10svpr6g7j2c5slxy2zm8k8mjm9qdm9zp5mkc0lhqw95a6jtesgaq4uycy8`.
