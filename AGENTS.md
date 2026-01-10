# Agent Instructions

This project uses **bd** (beads) for issue tracking. Run `bd onboard` to get
started.

## Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --status in_progress  # Claim work
bd close <id>         # Complete work
bd sync               # Sync with git
```

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT
complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs
   follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**

- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds

## Security Best Practices

### XSS Prevention

- **Always escape user input**: Use `escapeHtml()` from `lib/security/xss.ts`
  when displaying user-generated content
- **Preact automatic escaping**: Preact/React automatically escapes JSX content,
  but use utilities for raw HTML strings or HTML attributes
- **Test XSS prevention**: Run `deno task test:xss` to verify XSS attack vectors
  are neutralised
- **Never use dangerouslySetInnerHTML**: Avoid `dangerouslySetInnerHTML` unless
  absolutely necessary, and always sanitise content first

### SQL Injection Prevention

- **Parameterised queries**: Always use parameterised queries with $1, $2, etc.
  placeholders
- **Never concatenate**: Never concatenate user input directly into SQL strings
- **Test SQL injection protection**: Run `deno task test:sql-injection` to
  verify protection
