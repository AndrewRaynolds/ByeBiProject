#!/usr/bin/env bash
set -euo pipefail

die() {
  echo "ERROR: $*" >&2
  exit 1
}

if [[ $# -ne 1 ]]; then
  echo 'Usage: bash scripts/start-task.sh "fix/checkout-mobile"'
  exit 2
fi

task_branch="$1"

case "$task_branch" in
  ""|main|master)
    die "Choose a dedicated task branch, not '$task_branch'."
    ;;
esac

if [[ "$task_branch" =~ [[:space:]] ]]; then
  die "Branch name must not contain spaces."
fi

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || die "Not inside a Git repository."

root="$(git rev-parse --show-toplevel)"
cd "$root"

origin="$(git remote get-url origin 2>/dev/null || true)"
[[ -n "$origin" ]] || die "No 'origin' remote configured."

case "$origin" in
  *github.com/AndrewRaynolds/ByeBiProject*|*github.com:AndrewRaynolds/ByeBiProject*)
    ;;
  *)
    die "Unexpected origin remote: $origin"
    ;;
esac

if [[ -n "$(git status --porcelain)" ]]; then
  git status --short
  die "Working tree is not clean. Commit, stash, or discard changes first."
fi

git fetch origin

git switch main

local_main="$(git rev-parse main)"
remote_main="$(git rev-parse origin/main)"
merge_base="$(git merge-base main origin/main)"

if [[ "$local_main" != "$remote_main" ]]; then
  if [[ "$merge_base" != "$local_main" ]]; then
    die "Local main has diverged from origin/main. Resolve it manually before starting a task."
  fi

  git merge --ff-only origin/main
fi

if git show-ref --verify --quiet "refs/heads/$task_branch"; then
  die "Local branch '$task_branch' already exists."
fi

if git show-ref --verify --quiet "refs/remotes/origin/$task_branch"; then
  die "Remote branch 'origin/$task_branch' already exists."
fi

git switch -c "$task_branch"

echo
echo "Ready."
echo "Branch: $task_branch"
echo "Base:   $(git rev-parse --short main)"
echo
echo "Work can now modify the code."
echo "When ready to commit and push:"
echo "  ./scripts/ship.sh \"type: short description\""
