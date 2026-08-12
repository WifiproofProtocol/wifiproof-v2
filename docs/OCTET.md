# Octet integration position

Octet is a post-launch native assurance tier, not a dependency of the browser or World Mini App release.

Octet's current proof-of-location product requires its native iOS or Android SDK. Its browser-facing product is not a substitute for native location proof and cannot turn browser geolocation inside a World WebView into genuine Octet device evidence. A real integration therefore requires a native WiFiProof companion app or an organizer application that can receive and validate the native proof.

The future native flow should normalize a validated Octet result behind the same provider-neutral evidence interface, bind it to the event policy and short-lived challenge, and set a distinct hardware-backed-location factor bit. Standard browser V2 must continue to describe its claim as a private proof over supplied browser coordinates.

References:

- [Octet documentation](https://octetproof.com/docs/)
- [Octet prerequisites](https://octetproof.com/docs/getting-started/prerequisites/)
- [Octet proof of location concept](https://octetproof.com/docs/concepts/proof-of-location/)
