import { describe, expect, it } from "vitest";
import { normalizeHorizonPayment, type HorizonPaymentLike } from "./horizon.js";
import { ACC, CP1 } from "../test-support/fixtures.js";

const base: HorizonPaymentLike = {
  id: "12345-1",
  paging_token: "12345",
  type: "payment",
  transaction_hash: "abc",
  transaction_successful: true,
  created_at: "2026-03-01T10:00:00Z",
  source_account: CP1,
  from: CP1,
  to: ACC,
  amount: "25.0000000",
  asset_type: "native",
  transaction: {
    fee_charged: "100",
    fee_account: CP1,
    memo: "inv-1",
    memo_type: "text",
    ledger: 500,
  },
};

describe("normalizeHorizonPayment", () => {
  it("credits incoming payments", () => {
    const [e] = normalizeHorizonPayment(base, ACC);
    expect(e).toMatchObject({
      kind: "payment",
      amount: "25.0000000",
      asset: "native",
      counterparty: CP1,
      memo: "inv-1",
      ledger: 500,
    });
  });

  it("debits outgoing payments and emits a fee entry once per tx", () => {
    const rec = {
      ...base,
      from: ACC,
      to: CP1,
      source_account: ACC,
      transaction: { ...base.transaction, fee_account: ACC },
    };
    const seen = new Set<string>();
    const first = normalizeHorizonPayment(rec, ACC, seen);
    expect(first.map((e) => e.kind)).toEqual(["payment", "fee"]);
    expect(first[0]!.amount).toBe("-25.0000000");
    expect(first[1]).toMatchObject({ amount: "-0.00001", feeStroops: "100", id: "abc:fee" });
    const second = normalizeHorizonPayment({ ...rec, id: "12345-2" }, ACC, seen);
    expect(second.map((e) => e.kind)).toEqual(["payment"]);
  });

  it("uses source amount for outgoing path payments", () => {
    const rec: HorizonPaymentLike = {
      ...base,
      type: "path_payment_strict_send",
      from: ACC,
      to: CP1,
      asset_type: "credit_alphanum4",
      asset_code: "EURC",
      asset_issuer: CP1,
      amount: "9.5",
      source_asset_type: "native",
      source_amount: "10",
    };
    const [e] = normalizeHorizonPayment(rec, ACC);
    expect(e).toMatchObject({ kind: "path_payment", asset: "native", amount: "-10" });
  });

  it("handles create_account for both sides", () => {
    const rec: HorizonPaymentLike = {
      ...base,
      type: "create_account",
      funder: CP1,
      account: ACC,
      starting_balance: "5",
    };
    expect(normalizeHorizonPayment(rec, ACC)[0]).toMatchObject({
      kind: "create_account",
      amount: "5",
    });
    expect(normalizeHorizonPayment(rec, CP1)[0]).toMatchObject({
      kind: "create_account",
      amount: "-5",
      counterparty: ACC,
    });
  });

  it("ignores records not involving the account", () => {
    expect(normalizeHorizonPayment({ ...base, to: CP1, from: CP1 }, ACC)).toEqual([]);
  });
});
