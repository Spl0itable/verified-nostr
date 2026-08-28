# What is a Nostr Address (NIP-05)?

A **Nostr Address** is an identifier defined by [NIP-05](https://github.com/nostr-protocol/nips/blob/master/05.md),
one of the Nostr Implementation Possibilities. It maps a short, human-readable
name to a Nostr public key.

The format looks exactly like an email address:

```
username@nostraddress.com
```

It is *not* an email address and cannot receive mail. It is an identifier.

## Why it exists

A Nostr account is really a public key — a 64-character hexadecimal string, or
its `npub1…` bech32 encoding. Both are unreadable and impossible to remember:

```
d49a9023a21dba1b3c8306ca369bf3243d8b44b8f0b6d1196607f7b0990fa8df
npub10svpr6g7j2c5slxy2zm8k8mjm9qdm9zp5mkc0lhqw95a6jtesgaq4uycy8
```

NIP-05 lets you hand out `lucas@nostraddress.com` instead. Nostr clients resolve
that address back to the underlying public key, so people can find and follow you
without copying a key around.

## How resolution works

When you enter a Nostr Address into the NIP-05 field of a client, the client
performs a single HTTPS request:

```
GET https://nostraddress.com/.well-known/nostr.json?name=username
```

The server responds with JSON mapping names to hex public keys:

```json
{
  "names": {
    "username": "d49a9023a21dba1b3c8306ca369bf3243d8b44b8f0b6d1196607f7b0990fa8df"
  }
}
```

If the returned public key matches the public key of the profile being displayed,
the client considers the address valid and shows a checkmark. If it does not
match — or the name is absent — nothing is shown.

See [api.md](api.md) for the full endpoint specification.

## What a checkmark actually means

This is the part most people get wrong.

NIP-05 is designed to **identify** users, not to **verify** them. It is closer to
a username registry than to a legacy social-media blue check. A NIP-05 address
proves exactly one thing: *whoever controls the domain agreed to associate this
name with this public key.*

There is one meaningful exception. When an individual or entity is associated
with a reputable domain — a company, a project, a publication — a NIP-05 address
on that domain does act as an endorsement of their connection to that
organization, and that carries a real degree of trust. `alice@example-corp.com`
tells you Example Corp vouches for Alice.

A NIP-05 address does **not** prove:

- that you are a particular real-world person
- that any identity document was checked
- that the account is endorsed by the Nostr project
- that the account is trustworthy

That said, registering with NostrAddress.com does cause the "verified" checkmark
to render on your account across Nostr clients, which is what most people are
looking for.

## Where it shows up

Clients known to display NIP-05 identifiers include Damus, Amethyst, Primal,
Nostur, and Snort. Support and presentation vary by client — some show a
checkmark, some show the address itself, some show both.

## Next steps

- [getting-started.md](getting-started.md) — register an address
- [plans-and-pricing.md](plans-and-pricing.md) — free vs. Purple vs. Onyx
- [troubleshooting.md](troubleshooting.md) — checkmark not appearing
