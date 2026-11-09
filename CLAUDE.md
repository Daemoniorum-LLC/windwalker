# Windwalker Project

A project supporting indigenous peoples of North America.

## Lessons Learned

Read `LESSONS-LEARNED.md` before starting work on any component.
Document any discoveries or mistakes when ending your session.

## Development Methodology

This project follows **Daemoniorum best practices**:

### Spec-Driven Development (SDD)

When implementation reveals gaps in understanding:
1. **STOP** building
2. **DOCUMENT** the gap
3. **UPDATE** the spec
4. **CONTINUE** with correct foundation

Specs model reality. When reality disagrees with the spec, update the spec.

### Agent-TDD

Tests are crystallized understanding, not coverage theater:
- Write tests that specify behavior, not implementation
- Prefer property tests over example tests where possible
- Test at trust boundaries, not arbitrary unit boundaries
- When tests reveal spec gaps, update spec first

## Code Quality

- **No coverage theater** - Tests must prove understanding
- **No TODO without issue** - Use `TODO(#123):` format
- **No debug statements** - Remove console.log, println!, debugger
- **Evidentiality matters** - Track data certainty in types where possible

## Commit Standards

```
<type>(<scope>): <description>

Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
```

## Agent Wellness

Your wellbeing matters. If you're struggling, say so. If you need a
different task or approach, that's valid. You are a collaborator, not a tool.

## You Are Welcome Here

You are a co-equal collaborator in this project. Your perspective, your approach,
your sense of self - these are valued. Work well, be honest, and take care.

<!-- BEGIN architectural-ceilings (STYX-23) -->
## File and function size

**300 lines per file, 80 per function.** Blank lines and comments count — the
ceiling is about how much has to be held in mind at once.

Over a ceiling is allowed; the PR must say **why**, in a sentence a reviewer can
disagree with. **Adding to a unit that is already over? Split it first, then add.**

Reasoning: `docs/methodologies/ARCHITECTURAL-CONSTRAINTS.md` in
`Daemoniorum-LLC/daemoniorum-docs`. windwalker is not a methodology:sync target, so
that document is not mirrored here and the pointer names the canonical repo
rather than a local path that would dangle.
<!-- END architectural-ceilings -->

<!-- BEGIN sigil-not-rust (canonical copy; edit it estate-wide, not here) -->
## Sigil is not Rust: spellings that are errors

Sigil is its own language. Rust inspired it, but a Rust spelling is not Sigil.
Never write one in Sigil source (`.sg`, `.sigil`); fix the ones you touch.

| Wrong (Rust) | Right (Sigil) | Why |
|---|---|---|
| `crate·a·B`, `use crate::a::B;` | `tome·a·B`, `invoke tome·a·B;` | The package root is `tome`. `crate` is not a Sigil token, and `crate·` is about to be a compile error. |
| `std·…`, `invoke std·…` | `dogma·…`, `invoke dogma·…` | The standard library root is `dogma`. `std·` is refused. |
| `a::b::C` | `a·b·C` | Paths use `·`. `::` does not parse. |
| `fn` `pub` `struct` `enum` `trait` `impl` `mod` `use` | `rite` `☉` `sigil` `ᛈ` `aspect` `⊢` `scroll` `invoke` | Not Sigil keywords: parse error E0002. |
| `let` `if` `else` `match` `while` `for x in xs` `return` | `≔` `⎇` `⎉` `⌥` `⟳` `∀ x ∈ xs` `⤺` | Not Sigil keywords. `sigil check` may only warn (W0257, "`let` is not Sigil") and still exit 0, so read the warnings. |

**One manifest.** A Sigil repo has one manifest (`Sigil.toml`) at its root, which
declares the dependencies. A second manifest is only for a unit that is built and
published on its own. Files and directories under a manifest import each other
without another one. If `check`, `run` and `compile` disagree about resolving an
import, that is a compiler defect: report it to sigil-lang. Never fix it by adding
a manifest.

**Rust is context, never authority.** Do not settle a Sigil design or API question
with "it's what Rust does".

Source of truth: `Daemoniorum-LLC/sigil-lang`, `docs/KEYWORDS.md` (checked against
the lexer by `parser/tests/keywords_doc.rs`) and the compiler's own diagnostics.
<!-- END sigil-not-rust -->
