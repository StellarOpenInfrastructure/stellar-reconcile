import { describe, expect, it } from "vitest";
import { equals, fromUnits, stroopsToDecimal, sum, toUnits } from "./amounts.js";
import { ReconcileError } from "../errors.js";

describe("amounts", () => {
  it("round-trips decimals exactly", () => {
    for (const a of ["0", "1", "1.5", "-2.0000001", "123456789.1234567"]) {
      expect(fromUnits(toUnits(a))).toBe(a.replace(/\.0+$/, ""));
    }
  });
  it("sums without floating point drift", () => {
    expect(sum(["0.1", "0.2"])).toBe("0.3");
    expect(sum(["10", "-2.5", "-7.5"])).toBe("0");
  });
  it("rejects too many decimals and garbage", () => {
    expect(() => toUnits("1.12345678")).toThrowError(ReconcileError);
    expect(() => toUnits("abc")).toThrowError(ReconcileError);
  });
  it("compares numerically", () => {
    expect(equals("1.50", "1.5")).toBe(true);
  });
  it("converts stroops", () => {
    expect(stroopsToDecimal("100")).toBe("0.00001");
    expect(stroopsToDecimal(10_000_000)).toBe("1");
  });
});
