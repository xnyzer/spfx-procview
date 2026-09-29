#!/usr/bin/env python3
"""Template validation: JSON/YAML syntax, placeholder registry, privacy lint.

Run via `just check` (uv provides PyYAML). Exits non-zero on any finding.
"""

from __future__ import annotations

import json
import re
import sys
import tomllib
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parent.parent

SKIP_DIRS = {".git", "node_modules", ".venv", "private"}
SKIP_FILES = {"mise.lock"}

# Must match the registry in MANIFEST.md (## Placeholders).
ALLOWED_PLACEHOLDERS = {
    "PROJECT_NAME",
    "PROJECT_NAME_SNAKE",
    "PROJECT_DESCRIPTION",
    "OWNER",
    "YEAR",
    "GROUP_ID",
    "CODEQL_LANGUAGES",
    "LANG_LIVING_DOCS",
    "LANG_CLAUDE_MD",
    "LANG_COMMENTS",
    "LANG_COMMITS",
    "LANG_README",
    "LICENSE_SPDX",
    "TEMPLATE_VERSION",
}

# Uppercase-only tokens; GitHub Actions' ${{ github.* }} is lowercase and never matches.
PLACEHOLDER_RE = re.compile(r"\{\{\s*([A-Z][A-Z0-9_]*)\s*\}\}")

ABS_PATH_RE = re.compile(r"/(?:Users|home)/[A-Za-z0-9_.-]+")
IPV4_RE = re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")
ALLOWED_IPS = {"0.0.0.0", "127.0.0.1", "255.255.255.255"}
ALLOWED_IP_PREFIXES = ("192.0.2.", "198.51.100.", "203.0.113.")  # RFC 5737 doc ranges
# Last label must be alphabetic — keeps version pins like tool@1.2.3 from matching.
EMAIL_RE = re.compile(r"\b[\w.+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}\b")
ALLOWED_EMAIL_DOMAINS = (
    "users.noreply.github.com",
    "anthropic.com",
    "example.com",
    "example.org",
)

# Private name blocklist: gitignored, so absent in CI — the check silently skips there.
# One term per line; `#` starts a comment. The file itself is never scanned (private/ is
# in SKIP_DIRS), so listed terms never leak through validator output in CI.
BLOCKLIST_FILE = REPO_ROOT / "private" / "blocklist.txt"

# Real fragment/section markers use lowercase-kebab names; documentation placeholders
# (`fragment:NAME`, `section:<name>`) are uppercase or bracketed and never match.
PAIRED_MARKER_RE = re.compile(r"<!--\s*(/?)(fragment|section):([a-z0-9][a-z0-9-]*)\s*-->")
STANDARDS_DECL_RE = re.compile(r"Standards fragments:(.*)")


def iter_files() -> list[Path]:
    files = []
    for path in sorted(REPO_ROOT.rglob("*")):
        if not path.is_file():
            continue
        if any(part in SKIP_DIRS for part in path.relative_to(REPO_ROOT).parts):
            continue
        if path.name in SKIP_FILES:
            continue
        files.append(path)
    return files


def check_syntax(path: Path, text: str, findings: list[str]) -> None:
    rel = path.relative_to(REPO_ROOT)
    if path.suffix == ".json":
        try:
            json.loads(text)
        except json.JSONDecodeError as exc:
            findings.append(f"{rel}: invalid JSON — {exc}")
    elif path.suffix in {".yml", ".yaml"}:
        try:
            list(yaml.safe_load_all(text))
        except yaml.YAMLError as exc:
            findings.append(f"{rel}: invalid YAML — {exc}")
    elif path.suffix == ".toml":
        try:
            tomllib.loads(text)
        except tomllib.TOMLDecodeError as exc:
            findings.append(f"{rel}: invalid TOML — {exc}")


def check_placeholders(path: Path, text: str, findings: list[str]) -> None:
    rel = path.relative_to(REPO_ROOT)
    for match in PLACEHOLDER_RE.finditer(text):
        token = match.group(1)
        if token not in ALLOWED_PLACEHOLDERS:
            findings.append(
                f"{rel}: unknown placeholder {{{{{token}}}}} — register it in MANIFEST.md"
            )


def check_privacy(path: Path, text: str, findings: list[str]) -> None:
    rel = path.relative_to(REPO_ROOT)
    for match in ABS_PATH_RE.finditer(text):
        findings.append(f"{rel}: absolute local path leaked — {match.group(0)!r}")
    for match in IPV4_RE.finditer(text):
        ip = match.group(0)
        if ip in ALLOWED_IPS or ip.startswith(ALLOWED_IP_PREFIXES):
            continue
        findings.append(f"{rel}: IP address leaked — {ip}")
    for match in EMAIL_RE.finditer(text):
        email = match.group(0)
        if email.endswith(ALLOWED_EMAIL_DOMAINS):
            continue
        findings.append(f"{rel}: email address leaked — {email}")


def load_blocklist() -> list[str]:
    if not BLOCKLIST_FILE.is_file():
        return []
    terms = []
    for line in BLOCKLIST_FILE.read_text(encoding="utf-8").splitlines():
        term = line.strip()
        if term and not term.startswith("#"):
            terms.append(term.lower())
    return terms


def check_blocklist(path: Path, text: str, findings: list[str], terms: list[str]) -> None:
    rel = path.relative_to(REPO_ROOT)
    lower = text.lower()
    for term in terms:
        if term in lower:
            findings.append(f"{rel}: blocklisted term leaked — {term!r}")


def check_paired_markers(path: Path, text: str, findings: list[str]) -> None:
    """Every `<!-- fragment:NAME -->` / `<!-- section:NAME -->` must be balanced by a
    matching close, in order; section names must be unique within a file."""
    rel = path.relative_to(REPO_ROOT)
    stacks: dict[str, list[str]] = {"fragment": [], "section": []}
    seen_sections: set[str] = set()
    for match in PAIRED_MARKER_RE.finditer(text):
        closing, kind, name = match.group(1), match.group(2), match.group(3)
        stack = stacks[kind]
        if not closing:
            if kind == "section":
                if name in seen_sections:
                    findings.append(f"{rel}: duplicate section marker '{name}'")
                seen_sections.add(name)
            stack.append(name)
        elif not stack:
            findings.append(f"{rel}: closing {kind} marker for '{name}' without a matching open")
        elif stack[-1] != name:
            findings.append(
                f"{rel}: {kind} marker mismatch — expected close for '{stack[-1]}', got '{name}'"
            )
        else:
            stack.pop()
    for kind, stack in stacks.items():
        for name in stack:
            findings.append(f"{rel}: {kind} '{name}' is opened but never closed")


def check_fragment_declarations(findings: list[str]) -> None:
    """Every fragment a `MODULE.md` declares must exist in the `modules/standards/` catalog."""
    catalog_dir = REPO_ROOT / "modules" / "standards"
    if not catalog_dir.is_dir():
        return
    catalog = {p.stem for p in catalog_dir.glob("*.md") if p.name != "README.md"}
    for module_doc in sorted(REPO_ROOT.glob("modules/*/MODULE.md")):
        rel = module_doc.relative_to(REPO_ROOT)
        match = STANDARDS_DECL_RE.search(module_doc.read_text(encoding="utf-8"))
        if not match:
            continue
        head = re.split(r"\s[—–]\s", match.group(1).lstrip("*").strip())[0].strip()
        if head.lower() in ("", "(none)", "none"):
            continue
        for name in (n.strip().strip("`") for n in head.split(",")):
            if name and name.lower() != "none" and name not in catalog:
                findings.append(
                    f"{rel}: declares standards fragment '{name}' not found in modules/standards/"
                )


def main() -> int:
    findings: list[str] = []
    blocklist = load_blocklist()
    for path in iter_files():
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue  # binary file
        check_syntax(path, text, findings)
        check_placeholders(path, text, findings)
        check_privacy(path, text, findings)
        check_blocklist(path, text, findings, blocklist)
        check_paired_markers(path, text, findings)

    check_fragment_declarations(findings)

    if findings:
        print(f"validate: {len(findings)} finding(s):")
        for finding in findings:
            print(f"  - {finding}")
        return 1
    print("validate: OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
