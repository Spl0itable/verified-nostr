# Plans and Pricing

NostrAddress.com offers one free tier and two premium subscription tiers.
Current prices are shown in the pricing table at
<https://nostraddress.com/#plan>.

## Comparison

| | **Free** | **Purple** | **Onyx** |
| --- | --- | --- | --- |
| Price | Free, always | Subscription | Subscription |
| Registration speed | Batched, within 1 hour | **Instant** | **Instant** |
| `nostraddress.com` | ✅ | ✅ | ✅ |
| `nostrverified.com` | ✅ | ✅ | ✅ |
| `21million.fun` | — | — | ✅ |
| `nostrich.cool` | — | — | ✅ |
| `checkmark.club` | — | — | ✅ |
| Premium relay access | — | ✅ | ✅ |
| Username changes by support | — | ✅ | ✅ |

## Free

A free Nostr Address on `@nostraddress.com` and `@nostrverified.com` will always
be offered. Registrations are collected through the form at
<https://nostraddress.com/#free> and processed in hourly batches, so allow up to
one hour before the checkmark appears.

## Purple

Purple adds **instant registration** and access to the premium relay. It uses the
two default domains:

- `username@nostraddress.com`
- `username@nostrverified.com`

## Onyx

Onyx includes everything in Purple, plus **vanity domains**:

- `username@21million.fun`
- `username@nostrich.cool`
- `username@checkmark.club`

Vanity domains are available immediately after subscribing. You can switch
between any domain included in your plan at any time — just change the domain
portion in the NIP-05 field of your Nostr client. The username stays the same.

## Managing a subscription

Purple and Onyx subscriptions are billed through Stripe. Manage, update, or
cancel a subscription in the
[billing portal](https://billing.stripe.com/p/login/6oE9Dk08F0XTe08fYY).

## What happens if you downgrade or cancel

At the end of your paid billing period:

- Registrations on **vanity domains** (`21million.fun`, `nostrich.cool`,
  `checkmark.club`) are automatically disabled.
- Your account **automatically falls back** to the free domains
  `@nostraddress.com` and `@nostrverified.com`.
- Premium relay access ends.

To keep a working checkmark after cancelling, edit the NIP-05 field in your Nostr
client and switch the domain to `nostraddress.com` or `nostrverified.com`.

## Notes

- Usernames are **first come, first served**. Check availability before
  subscribing using the checker in the pricing section.
- Support for plan and username questions: <support@NostrAddress.com>
- The service is operated by 21 Million LLC (<https://nostrservices.com>).

If you would rather not pay, the free tier is genuinely free and permanent — the
only differences are the one-hour batch delay, no vanity domains, and no premium
relay.
