#!/bin/sh
# Privacy lint — blocks commits that would leak private identifiers.
#
# Usage:
#   sh scripts/privacy-lint.sh FILE...   scan the given files (lefthook passes staged files)
#   sh scripts/privacy-lint.sh --all     scan every tracked file (manual audit)
#
# Generic patterns (absolute local paths, IPs, email addresses) always apply;
# allowlists cover documentation values (RFC 5737 ranges, example domains, GitHub
# noreply). A gitignored private/blocklist.txt (one term per line, `#` starts a
# comment) adds project-private terms — when the file is absent (e.g. in CI),
# only the generic patterns run. POSIX sh + grep only, no other toolchain.
# Windows: run hooks from Git Bash or WSL (both ship sh + grep); a plain
# cmd/PowerShell setup without Git's sh on PATH fails loudly, never silently.

set -u

PATH_RE='/(Users|home)/[A-Za-z0-9_.-]+'
IP_RE='([0-9]{1,3}\.){3}[0-9]{1,3}'
EMAIL_RE='[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z][A-Za-z]+'
ALLOWED_IP_RE='^(0\.0\.0\.0|127\.0\.0\.1|255\.255\.255\.255|192\.0\.2\.[0-9]+|198\.51\.100\.[0-9]+|203\.0\.113\.[0-9]+)$'
ALLOWED_EMAIL_RE='@(users\.noreply\.github\.com|anthropic\.com|example\.com|example\.org)$'
BLOCKLIST='private/blocklist.txt'

# --all: re-invoke over every tracked file (NUL-safe for unusual file names)
if [ "${1:-}" = "--all" ]; then
  git ls-files -z | xargs -0 sh "$0"
  exit $?
fi

[ $# -eq 0 ] && exit 0

blocklist_terms=''
if [ -f "$BLOCKLIST" ]; then
  blocklist_terms=$(sed -e 's/#.*//' -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' \
    "$BLOCKLIST" | grep -v '^$' || true)
fi

scan() {
  for f in "$@"; do
    [ -f "$f" ] || continue
    case "$f" in
      private/*|*/private/*|mise.lock|*/mise.lock) continue ;;
    esac
    grep -qI . "$f" 2>/dev/null || continue # skip binary and empty files

    grep -nE "$PATH_RE" "$f" 2>/dev/null | cut -d: -f1 | while read -r ln; do
      printf '%s:%s: absolute local path leaked\n' "$f" "$ln"
    done

    grep -onE "$IP_RE" "$f" 2>/dev/null | while IFS=: read -r ln ip; do
      printf '%s' "$ip" | grep -qE "$ALLOWED_IP_RE" && continue
      printf '%s:%s: IP address leaked — %s\n' "$f" "$ln" "$ip"
    done

    grep -onE "$EMAIL_RE" "$f" 2>/dev/null | while IFS=: read -r ln mail; do
      printf '%s' "$mail" | grep -qiE "$ALLOWED_EMAIL_RE" && continue
      printf '%s:%s: email address leaked — %s\n' "$f" "$ln" "$mail"
    done

    if [ -n "$blocklist_terms" ]; then
      printf '%s\n' "$blocklist_terms" | while IFS= read -r term; do
        grep -inF "$term" "$f" 2>/dev/null | cut -d: -f1 | while read -r ln; do
          printf '%s:%s: blocklisted term leaked — %s\n' "$f" "$ln" "$term"
        done
      done
    fi
  done
}

findings=$(scan "$@")
if [ -n "$findings" ]; then
  printf '%s\n' "$findings"
  printf 'privacy-lint: %s finding(s) — fix or move to private/ before committing\n' \
    "$(printf '%s\n' "$findings" | wc -l | tr -d ' ')" >&2
  exit 1
fi
exit 0
