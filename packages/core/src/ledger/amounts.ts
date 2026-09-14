import { ReconcileError } from "../errors.js";

const SCALE = 10_000_000n;

/** Parse a signed decimal string (≤ 7 fractional digits) to integer units. */
export function toUnits(amount: string): bigint {
  const m = /^(-)?(\d+)(?:\.(\d{1,7}))?$/.exec(amount.trim());
  if (!m) throw new ReconcileError("INVALID_AMOUNT", `invalid amount: ${amount}`);
  const [, sign, whole, frac = ""] = m;
  const units = BigInt(whole!) * SCALE + BigInt(frac.padEnd(7, "0"));
  return sign ? -units : units;
}

export function fromUnits(units: bigint): string {
  const neg = units < 0n;
  const abs = neg ? -units : units;
  const whole = abs / SCALE;
  const frac = (abs % SCALE).toString().padStart(7, "0").replace(/0+$/, "");
  return `${neg ? "-" : ""}${whole}${frac ? "." + frac : ""}`;
}

export function sum(amounts: Iterable<string>): string {
  let total = 0n;
  for (const a of amounts) total += toUnits(a);
  return fromUnits(total);
}

export function abs(amount: string): string {
  return amount.startsWith("-") ? amount.slice(1) : amount;
}

export function equals(a: string, b: string): boolean {
  return toUnits(a) === toUnits(b);
}

export function stroopsToDecimal(stroops: string | number | bigint): string {
  return fromUnits(BigInt(stroops));
}
