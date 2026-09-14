# ADR 0001: Record architecture decisions

- Status: Accepted
- Date: 2026-09-14

## Context

This project will evolve through many independent contributions. Decisions
about structure, dependencies and protocols need to be discoverable without
reading the whole git history.

## Decision

We record architecturally significant decisions as numbered Markdown files
in `docs/adr/`, following the lightweight format popularised by Michael
Nygard: Context, Decision, Consequences.

## Consequences

- Contributors proposing structural changes open a PR containing a new ADR.
- ADRs are never edited after acceptance; superseding ADRs link back.
- `docs/adr/README.md` lists every ADR with its status.
