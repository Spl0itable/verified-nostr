# Getting Started

How to register a Nostr Address (NIP-05) identifier with NostrAddress.com.

## Before you start: get your hex public key

Registration requires your public key in **hexadecimal** format: exactly 64
characters, using `0–9` and `a–f`.

You cannot use:

- `npub1…` — the bech32 encoding of your public key. Convert it first.
- `nsec1…` — this is your **private key**. Never paste it into any website,
  including this one. Anyone with your `nsec` controls your account permanently.

To convert an `npub` to hex, use the [Damus Key Converter](https://damus.io/key).
Paste your `npub`, and copy the hex value it returns.

A valid hex key looks like this:

```
d49a9023a21dba1b3c8306ca369bf3243d8b44b8f0b6d1196607f7b0990fa8df
```

## Choose a username

Usernames are **alphanumeric only** — letters `A–Z`, `a–z` and digits `0–9`. No
spaces, dots, hyphens, or underscores.

Usernames are allocated on a **first come, first served** basis. You can check
whether a name is still free before subscribing to a paid plan using the
availability checker on the pricing section of the site.

## Option 1 — Free registration

1. Go to <https://nostraddress.com/#free>.
2. Enter your **Nostr username**.
3. Enter your **public hex key** (64 hex characters).
4. Complete the hCaptcha challenge.
5. Press **Submit Registration**.

Free submissions are processed in **hourly batches**. Wait up to one hour, then:

6. Open your Nostr client (Damus, Amethyst, Primal, Nostur, Snort, …).
7. Edit your profile and find the **Nostr Address (NIP-05)** field.
8. Enter either `username@nostraddress.com` or `username@nostrverified.com`.
9. Save your profile.

The checkmark should appear once the client re-resolves your address. Some
clients cache aggressively — see [troubleshooting.md](troubleshooting.md).

## Option 2 — Premium registration (Purple or Onyx)

Premium registration is **instant** — there is no hourly batch to wait for.

1. Go to <https://nostraddress.com/#plan>.
2. Use the availability checker to confirm your desired username is free.
3. Choose the **Purple** or **Onyx** plan and complete checkout.
4. Enter your username at checkout.
5. On the confirmation page, add `username@domain` to the **Nostr Address
   (NIP-05)** field of your Nostr client, using any domain included in your plan.
6. Add the premium relay `wss://relay.nostraddress.com` to your client. Your
   public key is allow-listed on the relay automatically.

See [plans-and-pricing.md](plans-and-pricing.md) for which domains each plan
includes, and [relay.md](relay.md) for relay setup.

## What you never have to provide

- Your private key (`nsec`)
- Your seed phrase or any recovery material
- Government ID or any identity documents

The NIP-05 protocol only ever needs your **public** key. If a service asks for
your `nsec`, it is a scam.

## Keeping your registration working

Your registration binds one username to one public key. It breaks if either side
changes:

- **Change your public key** → re-register with the new key.
- **Change your username in the client** → the NIP-05 field no longer matches
  what is registered; re-register, or set the field back.

Free users can simply resubmit the registration form. Paid subscribers should
email <support@NostrAddress.com> and the change will be made for them.
