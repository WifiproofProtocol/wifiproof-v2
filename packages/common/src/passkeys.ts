export const PASSKEY_SCHEMA_STRING =
  "bytes32 credentialIdHash,address wallet,uint64 createdAt";

export type PasskeyBinding = {
  credentialIdHash: string;
  wallet: string;
  createdAt: number;
};
