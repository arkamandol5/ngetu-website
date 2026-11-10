#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
remote=$(git remote get-url origin)
source_commit=$(git rev-parse --short HEAD)
if [[ "$(git branch --show-current)" != main || -n "$(git status --porcelain)" ]]; then
  echo "Commit the source changes on main before publishing." >&2
  exit 1
fi
python3 scripts/build-plesk.py
stage=$(mktemp -d)
trap 'rm -rf "$stage"' EXIT
refs=$(git ls-remote --heads "$remote" refs/heads/plesk)
if [[ -n "$refs" ]]; then
  git clone --quiet --single-branch --branch plesk "$remote" "$stage"
else
  git -C "$stage" init --quiet -b plesk
  git -C "$stage" remote add origin "$remote"
fi
rsync -a --delete --exclude='/.git/' .generated/plesk/ "$stage/"
git -C "$stage" add -A
if ! git -C "$stage" diff --cached --quiet; then
  git -C "$stage" -c user.name='NGETU Website' -c user.email='noreply@users.noreply.github.com' commit -qm "Build NGETU website from $source_commit"
  git -C "$stage" push origin HEAD:refs/heads/plesk
fi
