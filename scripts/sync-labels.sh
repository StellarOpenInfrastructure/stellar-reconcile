#!/usr/bin/env bash
# Sync repository labels from .github/labels.yml using the GitHub CLI.
# Usage: scripts/sync-labels.sh <owner/repo>
set -euo pipefail
REPO="${1:?usage: sync-labels.sh <owner/repo>}"
FILE="$(dirname "$0")/../.github/labels.yml"
python3 - "$FILE" "$REPO" <<'PY'
import subprocess, sys, re
path, repo = sys.argv[1], sys.argv[2]
labels, cur = [], {}
for line in open(path):
    line = line.rstrip("\n")
    m = re.match(r"^- name: (.+)$", line)
    if m:
        if cur: labels.append(cur)
        cur = {"name": m.group(1).strip()}
    elif line.strip().startswith("color:"):
        cur["color"] = line.split(":",1)[1].strip().strip('"')
    elif line.strip().startswith("description:"):
        cur["description"] = line.split(":",1)[1].strip()
if cur: labels.append(cur)
for l in labels:
    subprocess.run(["gh","label","create",l["name"],"--repo",repo,"--color",l["color"],
                    "--description",l.get("description",""),"--force"],check=True)
print(f"synced {len(labels)} labels to {repo}")
PY
