-- Sample internal records for local development. Safe to run repeatedly.
insert into internal_records (account, id, external_ref, counterparty, asset, amount, ts, memo)
values
  ('GAEB2QI5MVRGIBBJRSPYLQQ7WCLDFYFQ3Q2PRVMQBZQMEG3XF32OLBGA', 'inv-1001', 'ERP-77', 'GCXQCY4DKUJDJ2FUJQYKBR5ULK2XKYQZGIHWDMPGA2N5UNCHBGRCRCFH', 'native', 100.0000000, '2026-03-01T10:00:00Z', 'inv-1001'),
  ('GAEB2QI5MVRGIBBJRSPYLQQ7WCLDFYFQ3Q2PRVMQBZQMEG3XF32OLBGA', 'payout-42', 'ERP-78', 'GCXQCY4DKUJDJ2FUJQYKBR5ULK2XKYQZGIHWDMPGA2N5UNCHBGRCRCFH', 'native', -40.0000000, '2026-03-01T12:00:00Z', null)
on conflict (account, id) do nothing;
