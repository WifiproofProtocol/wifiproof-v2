/**
 * WiFiProof authorization signer.
 *
 * Pin this exact immutable source to IPFS, bind its CID and the one PKP to a
 * Lit Group, then grant the production usage key execute-only access to that
 * Group. Never interpolate request data into this source.
 */
// Replace this address with the final WiFiProofV2 deployment before pinning.
const ALLOWED_CHAIN_ID = 8453;
const ALLOWED_VERIFYING_CONTRACT = "0x0000000000000000000000000000000000000000";

// Lit invokes this named entrypoint inside its Action runtime.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function main({ pkpId, authorization }) {
  if (typeof pkpId !== "string" || pkpId.length < 1) {
    throw new Error("Invalid pkpId");
  }
  if (!authorization || typeof authorization !== "object") {
    throw new Error("Invalid authorization");
  }
  if (ALLOWED_VERIFYING_CONTRACT === "0x0000000000000000000000000000000000000000") {
    throw new Error("Configure the allowed WiFiProofV2 contract before pinning");
  }

  const bytes32Fields = [
    "eventId",
    "attendanceNullifier",
    "evidenceCommitment",
    "publicInputsHash",
    "policyHash",
  ];
  for (const field of bytes32Fields) {
    if (typeof authorization[field] !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(authorization[field])) {
      throw new Error(`Invalid ${field}`);
    }
  }
  const factorBitmap = Number(authorization.factorBitmap);
  const deadline = Number(authorization.deadline);
  if (!Number.isSafeInteger(factorBitmap) || factorBitmap < 0 || factorBitmap > 0xffffffff) {
    throw new Error("Invalid factorBitmap");
  }
  if (!Number.isSafeInteger(deadline) || deadline <= Math.floor(Date.now() / 1000)) {
    throw new Error("Invalid deadline");
  }

  const domain = {
    name: "WiFiProof",
    version: "2",
    chainId: ALLOWED_CHAIN_ID,
    verifyingContract: ALLOWED_VERIFYING_CONTRACT,
  };
  const types = {
    AttendanceAuthorization: [
      { name: "eventId", type: "bytes32" },
      { name: "attendanceNullifier", type: "bytes32" },
      { name: "factorBitmap", type: "uint32" },
      { name: "evidenceCommitment", type: "bytes32" },
      { name: "publicInputsHash", type: "bytes32" },
      { name: "policyHash", type: "bytes32" },
      { name: "deadline", type: "uint64" },
    ],
  };
  const digest = ethers.utils._TypedDataEncoder.hash(domain, types, authorization);
  const privateKey = await Lit.Actions.getPrivateKey({ pkpId });
  const signingKey = new ethers.utils.SigningKey(privateKey);
  const signature = signingKey.signDigest(digest);
  return ethers.utils.joinSignature(signature);
}
