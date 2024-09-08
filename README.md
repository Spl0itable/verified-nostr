# Nostr Address (NIP-05) Identifier

This service allows you to automatically identify your public key with an associated Nostr address (NIP-05). The service is free to use and the identifier addresses are hosted on the `NostrAddress.com` domain.

If you appreciate this free service:
- Zap us some sats `69420@walletofsatoshi.com`
- Donate Bitcoin on `CoinFund.app` here: https://coinfund.app/wallet/#/campaign/502a78c3d425873bbcec26d567f2dab1

## Usage

To assign a Nostr Address with your public key, follow these steps:

1. Go to `https://NostrAddress.com`
2. Enter your username and public key (hex format) into the form provided.
3. If details are correct, it should return a success message stating what to do next.

If your public key is correctly associated with your Nostr address, you will see the `@vNostrAddress.com` checkmark appear on your Nostr account. If the identification fails, nothing will show and you will need to resubmit.

## How it works

The Nostr NIP-05 protocol is used to create an identifier between your public key and your Nostr address. When you enter your information into the Nostr address (NIP-05) field of a Nostr client (such as Damus or Primal), they send a request to confirm the Nostr address and public key are associated.

## Security and privacy

This free service is designed with security and privacy in mind. The service uses HTTPS to encrypt all communication between your browser and our server, ensuring that your data is protected in transit. The service does not require or store your private key on the server.

## Disclaimer

This service is not affiliated with the Nostr project. The service is offered "as is" without warranty of any kind, either expressed or implied. The creators of this service do not view or save your private key and are not responsible for any damages or losses resulting from the misuse of Nostr.
