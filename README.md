# Nostr Address (NIP-05) Identifier

This service allows you to automatically identify your public key with an associated Nostr address (NIP-05). The service is free to use and the identifier addresses are hosted on the `NostrAddress.com` domain.

If you appreciate this free service:
- Zap us some sats `69420@wallet.yakihonne.com`

## Usage

To assign a Nostr Address with your public key, follow these steps:

1. Go to `https://NostrAddress.com`
2. Enter your username and public key (hex format) into the form provided.
3. If details are correct, it should return a success message stating what to do next.

If your public key is correctly associated with your Nostr address, you will see the `@vNostrAddress.com` checkmark appear on your Nostr account. If the identification fails, nothing will show and you will need to resubmit.

## How it works

The Nostr NIP-05 protocol is used to create an identifier between your public key and your Nostr address. When you enter your information into the Nostr address (NIP-05) field of a Nostr client (such as Damus or Primal), they send a request to confirm the Nostr address and public key are associated.

## Documentation

Full documentation lives in [`docs/`](docs/) and is published as raw Markdown so
that AI agents and assistants can read it directly:

| Document | Published at |
| --- | --- |
| [Documentation index](docs/README.md) | `/docs/README.md` |
| [What is a Nostr Address (NIP-05)](docs/what-is-nip-05.md) | `/docs/what-is-nip-05.md` |
| [Getting started](docs/getting-started.md) | `/docs/getting-started.md` |
| [Plans and pricing](docs/plans-and-pricing.md) | `/docs/plans-and-pricing.md` |
| [Premium relay](docs/relay.md) | `/docs/relay.md` |
| [API reference](docs/api.md) | `/docs/api.md` |
| [FAQ](docs/faq.md) | `/docs/faq.md` |
| [Troubleshooting](docs/troubleshooting.md) | `/docs/troubleshooting.md` |
| [The Nostr protocol](docs/nostr-protocol.md) | `/docs/nostr-protocol.md` |

The homepage, both post-checkout pages and `404.html` all link these documents
from their footers, so agents and crawlers can reach them without knowing the
convention.

### AI agent entry points

- [`llms.txt`](llms.txt) — concise, linked site summary following the [llmstxt.org](https://llmstxt.org) convention
- [`llms-full.txt`](llms-full.txt) — every document above concatenated for single-fetch ingestion
- [`robots.txt`](robots.txt) — crawler policy; AI crawlers are explicitly allowed
- [`sitemap.xml`](sitemap.xml) — canonical URL list

### 404 handling

[`404.html`](404.html) is served by GitHub Pages for any unmatched path, with a
real HTTP 404 status. It is `noindex, follow` and links onward to registration,
the docs and the NIP-05 endpoint.

> **If 404s still redirect to the homepage after deploying**, the redirect is
> coming from the CDN or DNS layer in front of GitHub Pages rather than from
> this repository — check for a Cloudflare redirect rule, bulk redirect, or
> custom error page. Verify the deployed behaviour with:
>
> ```sh
> curl -sSI https://nostraddress.com/this-page-does-not-exist | head -1
> # expect: HTTP/2 404
> ```
>
> A soft 404 (a redirect answering 200) makes search engines index every bad
> URL as a duplicate of the homepage.

> **Maintainer note:** files in `docs/`, along with `llms.txt`, `llms-full.txt`,
> `robots.txt` and `sitemap.xml`, must **not** be given YAML front matter.
> Without it, Jekyll copies them verbatim, which is what agents fetching raw
> Markdown expect. Regenerate `llms-full.txt` after editing any document in
> `docs/`:
>
> ```sh
> ./scripts/build-llms-full.sh
> ```

## Security and privacy

This free service is designed with security and privacy in mind. The service uses HTTPS to encrypt all communication between your browser and our server, ensuring that your data is protected in transit. The service does not require or store your private key on the server.

## Disclaimer

This service is not affiliated with the Nostr project. The service is offered "as is" without warranty of any kind, either expressed or implied. The creators of this service do not view or save your private key and are not responsible for any damages or losses resulting from the misuse of Nostr.
