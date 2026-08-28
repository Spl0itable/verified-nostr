# Troubleshooting

Almost every "the checkmark is not showing" report comes down to one of the
causes below. Work through them in order.

## 1. Confirm the registration actually exists

Query the API directly. This is the ground truth — it is exactly what your Nostr
client asks for:

```bash
curl "https://nostraddress.com/.well-known/nostr.json?name=YOURNAME"
```

- Returns your hex public key → the registration is live; the problem is in your
  client (jump to step 4).
- Returns `{"names":{}}` → the name is not registered on that domain. Continue
  below.

## 2. Has enough time passed?

Free registrations are processed in **hourly batches**. If you submitted less
than an hour ago, wait. Premium registrations are instant — if a paid
registration has not appeared, contact support.

## 3. Check the key format

The most common failure. Your public key must be:

- **Hexadecimal**, 64 characters, `0–9` and `a–f`
- **Not** `npub1…`
- **Never** `nsec1…`

Convert with the [Damus Key Converter](https://damus.io/key), then re-register
with the hex value.

## 4. Check the username matches exactly

The name in your client's NIP-05 field must exactly match the registered name.
It is case-sensitive, and alphanumeric only. `Pleb` and `pleb` are different
registrations.

Also check the **domain**:

- Free and Purple: `nostraddress.com`, `nostrverified.com`
- Onyx only: `21million.fun`, `nostrich.cool`, `checkmark.club`

Using an Onyx-only domain without an Onyx subscription will never resolve.

## 5. Did you change your username or public key?

Changing either one breaks the binding. If you renamed yourself in your client
after registering, the NIP-05 field no longer matches. Either change it back, or
re-register under the new name.

Free tier: resubmit the form. Paid tier: email
<support@NostrAddress.com>.

## 6. Force your client to re-check

Clients cache NIP-05 lookups, sometimes for a long time. In rough order of
effort:

1. Save your profile again — this usually triggers a fresh lookup.
2. Clear the NIP-05 field, save, re-enter the address, save again.
3. Log out and back in.
4. Clear the client's cache, or reinstall it.
5. Check your profile in a *different* client — if the checkmark shows there, the
   registration is fine and the first client is caching.

A good neutral place to check is a Nostr web viewer such as
[njump.me](https://njump.me).

## 7. Your subscription lapsed

If a Purple or Onyx subscription ended, vanity-domain registrations are disabled
at the end of the billing period and the account falls back to
`@nostraddress.com` / `@nostrverified.com`. Edit the NIP-05 field in your client
and change the domain to one of those two.

Check subscription status in the
[billing portal](https://billing.stripe.com/p/login/6oE9Dk08F0XTe08fYY).

## 8. The username was already taken

Usernames are first come, first served. If registration returned "username is
already taken", it belongs to someone else — pick a different one. Confirm with:

```bash
curl "https://nostraddress.com/.well-known/nostr.json?name=YOURNAME"
```

If that returns a public key that is not yours, the name is taken.

## Relay problems

**Cannot connect to `wss://relay.nostraddress.com`** — confirm the URL includes
the `wss://` scheme and has no trailing path. Test the relay is up:

```bash
curl -H "Accept: application/nostr+json" https://relay.nostraddress.com/
```

**Connects, but notes will not publish** — writes require an active Purple or
Onyx subscription. Allow-listing happens automatically on activation, so if your
subscription is current and writes are still rejected, contact support. Your
client should surface the rejection reason as a NIP-20 `OK: false` message.

Note that certain event kinds and content are rejected by relay policy; those
rejections are intentional and affect all users equally.

## Still stuck

Email <support@NostrAddress.com> with:

- your username
- the domain you are using
- your **hex public key** (never your `nsec`)
- the client and version you are using
- the raw output of the `curl` command in step 1

You can also reach the operators on Nostr at
`npub10svpr6g7j2c5slxy2zm8k8mjm9qdm9zp5mkc0lhqw95a6jtesgaq4uycy8`.

## Security reminder

No one from NostrAddress.com will ever ask for your private key (`nsec`), seed
phrase, or password. Any message that does is a scam. NIP-05 registration only
ever requires your **public** key.
