import { encodeAbiParameters, keccak256 } from "viem";

export function computeEventMetadataHash(input: {
  venueName: string;
  eventDescription: string;
  venueCidr: string;
  posterImageUrl: string;
}) {
  return keccak256(
    encodeAbiParameters(
      [{ type: "string" }, { type: "string" }, { type: "string" }, { type: "string" }],
      [input.venueName, input.eventDescription, input.venueCidr, input.posterImageUrl],
    ),
  );
}
