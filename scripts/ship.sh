#!/usr/bin/env bash
set -euo pipefail

die() {
  echo "ERROR: $*" >&2
  exit 1
}

if [[ $# -lt 1 ]]; then
  echo 'Usage: bash scripts/ship.sh "fix: short description"'
  exit 2
fi

message="$*"

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || die "Not inside a Git repository."

root="$(git rev-parse --show-toplevel)"
cd "$root"

branch="$(git symbolic-ref --quiet --short HEAD || true)"
[[ -n "$branch" ]] || die "Detached HEAD. Switch to a working branch first."

case "$branch" in
  main|master)
    die "Refusing to commit or push directly from '$branch'. Create a task branch first."
    ;;
esac

origin="$(git remote get-url origin 2>/dev/null || true)"
[[ -n "$origin" ]] || die "No 'origin' remote configured."

case "$origin" in
  *github.com/AndrewRaynolds/ByeBiProject*|*github.com:AndrewRaynolds/ByeBiProject*)
    ;;
  *)
    die "Unexpected origin remote: $origin"
    ;;
esac

if git rev-parse -q --verify MERGE_HEAD >/dev/null 2>&1   || git rev-parse -q --verify CHERRY_PICK_HEAD >/dev/null 2>&1   || git rev-parse -q --verify REVERT_HEAD >/dev/null 2>&1; then
  die "A merge/cherry-pick/revert is in progress. Finish or abort it first."
fi

if [[ -z "$(git status --porcelain)" ]]; then
  echo "Nothing to ship: working tree is clean."
  exit 0
fi

git add -A

if git diff --cached --quiet; then
  echo "Nothing staged after git add."
  exit 0
fi

unsafe=0
while IFS= read -r file; do
  case "$file" in
    .env|*/.env|.env.*|*/.env.*)
      case "$file" in
        .env.example|*/.env.example) ;;
        *)
          echo "Blocked sensitive file: $file" >&2
          unsafe=1
          ;;
      esac
      ;;
    *.pem|*.key|*.p12|*.pfx)
      echo "Blocked key/certificate file: $file" >&2
      unsafe=1
      ;;
  esac
done < <(git diff --cached --name-only)

if [[ "$unsafe" -ne 0 ]]; then
  git reset -q
  die "Sensitive files were staged. Nothing was committed."
fi

echo
echo "Branch: $branch"
echo "Commit: $message"
echo
git diff --cached --stat
echo

git commit -m "$message"
git push -u origin "$branch"

echo
echo "Shipped branch '$branch'."
echo "Open a PR:"
echo "https://github.com/AndrewRaynolds/ByeBiProject/compare/main...${branch}?expand=1"
