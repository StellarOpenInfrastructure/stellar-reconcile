# Contributing to stellar-reconcile

Thanks for helping build **stellar-reconcile** — Accounting-grade reconciliation infrastructure for Stellar assets and transactions.

This file adds project-specific guidance on top of the organization-wide
[contributing guide](https://github.com/StellarOpenInfrastructure/.github/blob/main/CONTRIBUTING.md).

## Quick start

```bash
git clone https://github.com/StellarOpenInfrastructure/stellar-reconcile
cd stellar-reconcile
make setup
make lint
make test
make build
```

## Picking work

- Browse [`docs/drips-wave.md`](docs/drips-wave.md) — every entry is an
  independently actionable issue with acceptance criteria and a definition
  of done. Issues labelled `wave-trivial` are good first contributions.
- Comment on the GitHub issue to claim it before starting.
- Open a draft PR early if you want feedback on direction.

## Branch and commit conventions

- Branch from `main`: `feat/<topic>`, `fix/<topic>`, `docs/<topic>`.
- Conventional Commits: `feat(scope): summary`, `fix(scope): summary`.
- Squash merges are used; keep the PR title in Conventional Commit form.

## Pull request checklist

- [ ] `make lint` passes
- [ ] `make test` passes
- [ ] `make build` passes
- [ ] New behaviour is covered by tests (including failure paths)
- [ ] Documentation updated (`README.md`, `docs/`)
- [ ] No secrets or real credentials in the diff
- [ ] Security considerations described in the PR template

## Code style

- TypeScript strict mode, `eslint` + `prettier` (run `make lint`).

- Keep modules small and interfaces explicit.
- Errors are values with codes; do not throw raw strings.
- Never log secrets, authorization headers, private keys or full environment.

## Maintainers

The initial maintainer group is the Stellar Open Infrastructure steering
group (see the organization's `GOVERNANCE.md`). Additional maintainers will be
listed here as the project grows.

## Code of Conduct

This project follows the [Code of Conduct](CODE_OF_CONDUCT.md).
