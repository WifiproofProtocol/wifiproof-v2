# Lit Protocol migration: old integration to Chipotle

## Decision

Lit is usable for WiFiProof V2, but the early-2026 integration was not production-safe as written.

The previous path used either old Naga SDK packages or sent newly generated JavaScript for every digest to a development API hostname. Dynamic code changes the Action CID on every request, so Lit Groups cannot restrict execution to one reviewed Action. It also gave the Action a generic digest-signing role.

The current production path now:

- calls `https://api.chipotle.litprotocol.com/core/v1/lit_action`;
- uses a fixed `ipfs_id` and `js_params`;
- requires a Group-scoped execute-only usage key;
- binds one immutable Action CID and one PKP;
- reconstructs only the `AttendanceAuthorization` EIP-712 digest;
- fixes the allowed chain and WiFiProofV2 verifying contract inside the pinned Action;
- verifies the returned signature against `LIT_PKP_SIGNER_ADDRESS` on every request.

The Naga SDK branch and its deprecated packages have been removed from the web runtime. The documented Base Sepolia prototype contract remains available, but V2 authorization signing has one current implementation.

## Exact provisioning steps

1. Open the [Lit Chipotle dashboard](https://dashboard.chipotle.litprotocol.com) and request a new account.
2. Save the Master Account key when it is shown. It is a management credential and must not be placed in the web deployment.
3. Fund the account with at least the current minimum. Lit’s quickstart currently states $5.
4. Create a PKP wallet. Record its PKP ID and EVM signer address separately.
5. Deploy WiFiProofV2 first so its immutable address is known.
6. Edit `packages/web/lit-actions/sign-attendance.js`:
   - use `84532` for a Base Sepolia Action or `8453` for a Base mainnet Action;
   - replace the zero address in `ALLOWED_VERIFYING_CONTRACT` with that deployment.
7. Review the resulting file. It must accept only `AttendanceAuthorization` fields and must not contain a fetch, arbitrary `code`, arbitrary digest, or dynamic contract address.
8. Upload/pin the exact source through the Lit dashboard’s Actions flow. Copy the returned IPFS CID.
9. Create a Group named for the environment, such as `wifiproof-v2-sepolia-authorizer`.
10. Add only the pinned CID to the Group.
11. Add only the selected PKP ID to the Group.
12. Create a Usage API key with:
    - `can_create_groups=false`
    - `can_delete_groups=false`
    - `can_create_pkps=false`
    - `manage_ipfs_ids_in_groups=[]`
    - `add_pkp_to_groups=[]`
    - `remove_pkp_from_groups=[]`
    - `execute_in_groups=[THE_EXACT_GROUP_ID]`
13. Never use `[0]`; Lit documents it as a wildcard for all groups.
14. Store the one-time usage key as `LIT_USAGE_API_KEY`. Store the PKP ID, signer address, and CID in their matching environment variables.
15. Poll the real Action call until the permission becomes active. Lit permissions are eventually consistent, so do not rely on a fixed sleep.
16. Submit a known `AttendanceAuthorization`, recover its signer locally, and compare it with the PKP address.
17. Submit a non-attendance typed-data request and confirm it fails.
18. Submit a request against another contract/chain and confirm the Action rejects it.
19. Through the Safe, set `authorizer` on WiFiProofV2 to the PKP signer address.
20. Remove the Master Account key from runtime systems. Keep it offline for rotation/recovery.

## Runtime variables

```bash
SIGNER_MODE=lit
SIGNER_FALLBACK_TO_KEY=false
LIT_NETWORK=chipotle
LIT_API_BASE_URL=https://api.chipotle.litprotocol.com/core/v1
LIT_USAGE_API_KEY=...
LIT_PKP_ID=...
LIT_PKP_SIGNER_ADDRESS=0x...
LIT_ACTION_IPFS_CID=...
```

## Rotation

1. Create and test a new PKP, Group, CID, and usage key in parallel.
2. Update the contract authorizer through the Safe.
3. Update runtime secrets.
4. Complete a real test authorization.
5. Revoke the old usage key and remove the old PKP/CID from its Group.

Do not update only the runtime signer. The contract authorizer and Lit signer must rotate together.

Official references: [Lit quickstart](https://developer.litprotocol.com/quickstart), [management API](https://developer.litprotocol.com/management/api_direct), [Groups](https://developer.litprotocol.com/architecture/groups), [API keys](https://developer.litprotocol.com/management/api_keys), and [API vs ChainSecured mode](https://developer.litprotocol.com/management/account_modes).
