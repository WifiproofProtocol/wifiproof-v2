"use client";

import { Attribution } from "ox/erc8021";

type HexString = `0x${string}`;

const builderCode = (process.env.NEXT_PUBLIC_BASE_BUILDER_CODE ?? "").trim();

let cachedBuilderCodeSuffix: HexString | null | undefined;

export function getBuilderCodeDataSuffix(): HexString | undefined {
  if (cachedBuilderCodeSuffix !== undefined) {
    return cachedBuilderCodeSuffix ?? undefined;
  }

  if (!builderCode) {
    cachedBuilderCodeSuffix = null;
    return undefined;
  }

  try {
    cachedBuilderCodeSuffix = Attribution.toDataSuffix({
      appCode: builderCode,
    }) as HexString;
    return cachedBuilderCodeSuffix;
  } catch (error) {
    console.error("[builder-codes] invalid NEXT_PUBLIC_BASE_BUILDER_CODE", error);
    cachedBuilderCodeSuffix = null;
    return undefined;
  }
}

export function withBuilderCode<const T extends object>(
  request: T
): T & { dataSuffix?: HexString } {
  const dataSuffix = getBuilderCodeDataSuffix();

  if (!dataSuffix) {
    return request as T & { dataSuffix?: HexString };
  }

  return {
    ...request,
    dataSuffix,
  };
}
