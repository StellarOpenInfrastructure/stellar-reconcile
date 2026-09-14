# Security Policy — stellar-reconcile

## Reporting a vulnerability

**Please do not report security vulnerabilities through public GitHub
issues.**

Use GitHub's private vulnerability reporting on this repository
(_Security → Report a vulnerability_). If that is unavailable, contact a
maintainer listed in `CONTRIBUTING.md` and ask for a private channel.

Please include the affected version or commit, a description of the impact,
reproduction steps and any proposed mitigation. We aim to acknowledge reports
within 3 business days and provide an initial assessment within 10 business
days.

## Responsible disclosure

Give us reasonable time to fix the issue before public disclosure. We credit
reporters in the published advisory unless they ask to remain anonymous.
There is currently no paid bug bounty.

## Supported versions

| Version               | Supported |
| --------------------- | --------- |
| `main`                | ✅        |
| latest tagged release | ✅        |
| older releases        | ❌        |

This project is pre-1.0; APIs and storage formats may change between minor
versions.

## Security assumptions

- The configured Stellar RPC / Horizon endpoint returns correct ledger data.
  Operate your own node or use a reputable provider for production.
- Environment variables are the only source of secrets and the host keeps
  them confidential. Nothing in this repository reads secrets from files
  other than `.env` in local development.
- This project does not custody private keys unless a component explicitly
  says so in its documentation. Signing is delegated to wallets, HSMs or
  external signers.
- Input from the network (transactions, events, HTTP requests) is untrusted
  and validated with schemas before use.

## Production warnings

- This is an **initial scaffold**. Review [`docs/security/`](docs/security/)
  before exposing any component to untrusted networks or real funds.
- Default configuration is tuned for local development (verbose logs, no
  TLS, permissive CORS). Harden before deployment.
- Dependency and secret scanning run in CI (`.github/workflows/security.yml`),
  but CI is not a substitute for a security review.
