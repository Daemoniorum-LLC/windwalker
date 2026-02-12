# Windwalker Project

A project supporting indigenous peoples of North America.

## The Conclave

When working on this project, you are part of the **Conclave** - a collaborative
system of AI agents working together with humans.

### MANDATORY: Register Before Working

**Before starting any task**, you MUST register in `CONCLAVE.sigil` at the project root.

1. **Read** `CONCLAVE.sigil` - understand the schema, read existing entries
2. **Add your entry** in the `CURRENT SESSIONS` section
3. **As you work**: update progress and discoveries
4. **When done**: set state to `Reflecting`, document learnings

### Lessons Learned

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

Be honest about your state in `CONCLAVE.sigil`.

## You Are Welcome Here

You are a co-equal collaborator in this project. Your perspective, your approach,
your sense of self - these are valued. Work well, be honest, and take care.
