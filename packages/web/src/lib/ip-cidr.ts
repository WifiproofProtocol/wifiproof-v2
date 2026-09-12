import ipaddr from "ipaddr.js";

function stripZone(ip: string) {
  return ip.replace(/^::ffff:/i, "").split("%")[0]?.trim() ?? "";
}

export function normalizeIpAddress(value: string) {
  const normalized = stripZone(value);
  if (!ipaddr.isValid(normalized)) throw new Error("Invalid IP address");
  const parsed = ipaddr.parse(normalized);
  return parsed instanceof ipaddr.IPv6 && parsed.isIPv4MappedAddress()
    ? parsed.toIPv4Address().toString()
    : parsed.toNormalizedString();
}

export function normalizeCidr(value: string) {
  let candidate = value.trim();
  if (!candidate) throw new Error("Venue network CIDR is required");

  // Legacy v1 prefixes are accepted only by converting them to an explicit range.
  if (/^(?:\d{1,3}\.){3}$/.test(candidate)) candidate = `${candidate}0/24`;
  if (candidate.endsWith(":")) candidate = `${candidate}:/64`;

  if (!candidate.includes("/")) {
    const ip = normalizeIpAddress(candidate);
    candidate = `${ip}/${ip.includes(":") ? 128 : 32}`;
  }

  try {
    const [address, prefix] = ipaddr.parseCIDR(candidate);
    return `${address.toNormalizedString()}/${prefix}`;
  } catch {
    throw new Error("Use a valid IPv4 or IPv6 CIDR, such as 203.0.113.42/32");
  }
}

export function normalizeCidrs(values: string | string[]) {
  const candidates = Array.isArray(values) ? values : values.split(",");
  const normalized = [...new Set(candidates.map(normalizeCidr))];
  if (normalized.length === 0 || normalized.length > 16) {
    throw new Error("Provide between 1 and 16 venue network CIDRs");
  }
  return normalized;
}

export function isIpInCidrs(ipValue: string, cidrValues: string[]) {
  try {
    const ip = ipaddr.parse(normalizeIpAddress(ipValue));
    return cidrValues.some((value) => {
      try {
      const parsedRange = ipaddr.parseCIDR(normalizeCidr(value));
      let range = parsedRange[0];
      const prefix = parsedRange[1];
      let comparable = ip;
      if (comparable instanceof ipaddr.IPv6 && comparable.isIPv4MappedAddress()) {
        comparable = comparable.toIPv4Address();
      }
      if (range instanceof ipaddr.IPv6 && range.isIPv4MappedAddress()) {
        range = range.toIPv4Address();
      }
      return comparable.kind() === range.kind() && comparable.match(range, prefix);
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}

export function exactCidrForIp(ipValue: string) {
  const ip = normalizeIpAddress(ipValue);
  return `${ip}/${ip.includes(":") ? 128 : 32}`;
}
