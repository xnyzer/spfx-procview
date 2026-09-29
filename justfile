# project-template — repo-level recipes (never shipped to projects; those get core/justfile)

default:
    @just --list

# Install git hooks
setup:
    lefthook install

# Full template validation: JSON/YAML syntax, placeholder registry, privacy lint
check:
    uv run --with pyyaml python3 scripts/validate.py
