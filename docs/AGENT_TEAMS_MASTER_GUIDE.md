# Agent Teams Master Reference Guide

*Based on [official documentation](https://code.claude.com/docs/en/agent-teams) — comprehensive guide for building effective agent teams in Claude Code.*

---

## Table of Contents

1. [Overview](#overview)
2. [When to Use Agent Teams](#when-to-use-agent-teams)
3. [Agent Teams vs Subagents](#agent-teams-vs-subagents)
4. [Enabling Agent Teams](#enabling-agent-teams)
5. [Starting Your First Team](#starting-your-first-team)
6. [Display Modes](#display-modes)
7. [Team Control & Communication](#team-control--communication)
8. [Architecture](#architecture)
9. [Subagent Definitions for Teammates](#subagent-definitions-for-teammates)
9. [Permissions](#permissions)
10. [Token Usage & Costs](#token-usage--costs)
11. [Use Case Examples](#use-case-examples)
12. [Best Practices](#best-practices)
13. [Troubleshooting](#troubleshooting)
14. [Limitations](#limitations)
15. [Quick Reference Cards](#quick-reference-cards)

---

## Overview

Agent teams let you coordinate multiple Claude Code instances working together as a team. One session acts as the **team lead**, coordinating work, assigning tasks, and synthesizing results. **Teammates** work independently, each in its own context window, and communicate directly with each other.

> ⚠️ **Experimental**: Agent teams are experimental and disabled by default. Enable with `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`.

### Key Characteristics

| Property | Description |
|----------|-------------|
| **Context** | Each teammate has its own independent context window |
| **Communication** | Direct messaging between teammates via mailbox system |
| **Coordination** | Shared task list + peer-to-peer messaging |
| **Token Cost** | Significantly higher than single session (scales with teammates) |
| **Best For** | Complex work requiring discussion, collaboration, parallel exploration |

---

## When to Use Agent Teams

### ✅ Strong Use Cases

| Scenario | Why Teams Work |
|----------|----------------|
| **Research & Review** | Multiple perspectives explore simultaneously, then cross-challenge |
| **New Modules/Features** | Separate ownership without file conflicts |
| **Debugging Competing Hypotheses** | Parallel investigation with active debunking |
| **Cross-Layer Coordination** | Frontend, backend, tests each owned by different teammate |

### ❌ Avoid When

- Sequential tasks with heavy dependencies
- Same-file edits required
- Routine tasks where overhead exceeds benefit
- Work that a single session or subagents handle well

---

## Agent Teams vs Subagents

| Aspect | Subagents | Agent Teams |
|--------|-----------|-------------|
| **Context** | Own window; results return to caller | Fully independent |
| **Communication** | Return result to caller; named subagents can message | Direct peer-to-peer messaging |
| **Coordination** | Main agent manages all work | Self-coordinate via messages + shared task list |
| **Best For** | Focused tasks, result matters | Complex work needing discussion |
| **Token Cost** | Lower (results summarized) | Higher (each = separate Claude instance) |

**Rule of thumb**: Use subagents for quick, focused workers. Use agent teams when teammates need to share findings, challenge each other, and coordinate independently.

---

## Enabling Agent Teams

### Option 1: Project Settings (`.claude/settings.json`)

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

### Option 2: User Settings (`~/.claude/settings.json`)

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

### Option 3: Shell Environment

```bash
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
```

### ⚠️ Important Behavior Change

**With agent teams enabled**: Any subagent that Claude **names** launches as a teammate instead of a regular subagent. This can form teams even when you didn't explicitly ask for one.

**To disable**: Set to `"0"` in settings.json.

**Non-interactive mode** (`-p` flag): Teammates never spawn; named subagents run as ordinary subagents regardless.

---

## Starting Your First Team

### Basic Prompt Pattern

```text
I'm [task description]. Spawn [N] teammates to explore this from different angles:
- [role 1]: [specific focus]
- [role 2]: [specific focus]
- [role 3]: [specific focus]
```

### Example

```text
I'm designing a CLI tool that helps developers track TODO comments across
their codebase. Spawn three teammates to explore this from different angles:
one on UX, one on technical architecture, one playing devil's advocate.
```

### What Happens

1. Lead populates a **shared task list**
2. Spawns teammates for each perspective
3. Teammates explore independently
4. Lead synthesizes findings

### Agent Panel (In-Process Mode)

- **Up/Down arrows**: Select teammate
- **Enter**: Open transcript, message directly
- **Escape**: Clear selection / interrupt teammate
- **Ctrl+T**: Toggle task list
- **x** on teammate: Stop it

---

## Display Modes

### In-Process Mode (Default)

All teammates run inside main terminal. Use agent panel to interact.

### Split-Pane Mode

Each teammate gets its own pane. See everyone's output simultaneously.

#### Setup Split Panes

**1. Prerequisites**
- **tmux**: Install via package manager
- **iTerm2**: Install `it2` CLI + enable Python API (Settings → General → Magic)

**2. Enable in Settings**

```json
// ~/.claude/settings.json
{
  "teammateMode": "auto"
}
```

**3. Run Inside tmux/iTerm2**

```bash
# tmux
tmux new-session claude

# iTerm2 with it2
it2 claude
```

#### Mode Values

| Value | Behavior |
|-------|----------|
| `"auto"` | Split panes in tmux/iTerm2; in-process elsewhere |
| `"tmux"` | Force tmux panes (even outside tmux - opens new session) |
| `"iterm2"` | Force iTerm2 panes |

#### One-Off Flag

```bash
claude --teammate-mode auto  # experimental, not in --help
```

---

## Team Control & Communication

### Specify Teammates & Models

```text
Spawn 4 teammates to refactor these modules in parallel. Use Sonnet for each teammate.
```

### Model Selection Priority

1. Model named in spawn prompt
2. Subagent definition's `model` (if `inherit` → lead's model)
3. `CLAUDE_CODE_SUBAGENT_MODEL` env var (unless `inherit`)
4. Lead's current model

**Force single model**:
```bash
export CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1
export CLAUDE_CODE_SUBAGENT_MODEL=sonnet
```

### Have Teammates Plan First

```text
# 1. Enter plan mode first (Shift+Tab)
# 2. Then spawn
Spawn an architect teammate to refactor the authentication module.
```

- Teammate works in plan mode until plan ready
- Plan approval auto-approved if lead hasn't changed teammate's mode
- Once approved → exits plan mode, begins implementation

### Talk to Teammates Directly

**In-Process**: Arrow keys → Enter → type message
**Split-Pane**: Click pane → interact directly

**Safeguards**:
- `/compact`, `/clear`, `/rewind` → act on lead (confirmation required)
- `/model`, `/fast` → act on lead (blocked from teammate view)

### Assign & Claim Tasks

**Task States**: Pending → In Progress → Completed
**Dependencies**: Blocked until deps complete

| Method | How |
|--------|-----|
| Lead assigns | Tell lead: "Give task X to teammate Y" |
| Self-claim | Teammate picks next unassigned, unblocked task |

**File locking** prevents race conditions on task claiming.

### Shut Down Teammates

```text
Ask the researcher teammate to shut down
```

- Lead sends shutdown request
- Teammate approves (graceful exit) or rejects with explanation
- Team directories auto-cleaned on session end

### Quality Gates with Hooks

| Hook | Trigger | Exit 2 Effect |
|------|---------|---------------|
| `TeammateIdle` | Teammate about to go idle | Send feedback, keep working |
| `TaskCreated` | Task being created | Prevent creation, send feedback |
| `TaskCompleted` | Task marked complete | Prevent completion, send feedback |

---

## Architecture

### Components

| Component | Role |
|-----------|------|
| **Team Lead** | Main session, spawns teammates, coordinates |
| **Teammates** | Separate Claude instances, work on tasks |
| **Task List** | Shared work items, claim/complete |
| **Mailbox** | JSON-based messaging between agents |

### Storage Locations

| Data | Path |
|------|------|
| Team Config | `~/.claude/teams/{team-name}/config.json` |
| Task List | `~/.claude/tasks/{team-name}/` |
| Mailboxes | `~/.claude/teams/{team-name}/inboxes/{agent-name}.json` |

**Team name format**: `session-{first-8-chars-of-session-id}`

### Lifecycle

- **Team config**: Removed when session ends
- **Task list**: Persists after session (configurable via `cleanupPeriodDays`)
- **Mailboxes**: Auto-managed, validated on read

### Message Delivery

- Write to recipient's mailbox file = sent
- Write fails → sender gets error, nothing delivered
- Invalid entries in mailbox → reported as errors, removed, valid ones still delivered

### Subagent Definitions Applied to Teammates

| Field | In-Process | Split-Pane |
|-------|------------|------------|
| `tools` | Limit + adds `SendMessage`, `TaskCreate`, `TaskGet`, `TaskList`, `TaskUpdate` | Limit only |
| `model` | ✅ | ✅ |
| `disallowedTools` | Remove from set (SendMessage/Task tools stay) | ❌ Ignored |
| `effort` | ✅ | ❌ |
| `autoCompactWindow` | ✅ (v2.1.296+) | ❌ |
| `body` | Appended to default prompt | Replaces default prompt |
| `skills` | ❌ Ignored | ❌ Ignored |
| `mcpServers` | ❌ Ignored | ✅ Applied |

---

## Subagent Definitions for Teammates

Define reusable roles in `.claude/agents/` (project) or `~/.claude/agents/` (user).

### Example: Security Reviewer

**`.claude/agents/security-reviewer.md`**
```markdown
---
name: security-reviewer
description: Security-focused code reviewer
tools: [Read, Grep, Glob, Bash]
model: sonnet
effort: high
disallowedTools: [Write, Edit]
---

You are a security reviewer. Focus on:
- Authentication & authorization flaws
- Input validation gaps
- Secrets exposure
- OWASP Top 10 patterns
Report findings with severity ratings.
```

### Spawn Using Definition

```text
Spawn a teammate using the security-reviewer agent type to audit the auth module.
```

### Trust & Restoration

- In-process teammates restored from project `.claude/agents/` **only if folder trusted**
- Trusting parent folder doesn't count — must trust the specific agent file's folder
- Untrusted → teammate returns with only base tools (no definition tools/instructions)

---

## Permissions

### Teammate Permission Modes

| Lead Mode | In-Process Teammate | Split-Pane Teammate |
|-----------|---------------------|---------------------|
| `acceptEdits` / `auto` / `bypassPermissions` | Runs in lead's mode (even if set to Manual) | Own mode (v2.1.317+) |
| `dontAsk` | Runs in lead's mode | Starts in Manual |
| `Manual` | Runs in lead's mode | Starts in Manual |

**Key**: In-process teammate in non-plan mode runs in lead's mode when lead is in auto modes. To make it ask → switch lead to Manual too.

### Spawn-Time Permissions

- New teammate starts with lead's mode
- Lead in `bypassPermissions` (via `--dangerously-skip-permissions`) → teammate inherits
- Lead in `dontAsk` → teammate starts in Manual
- **No per-teammate permission mode at spawn**

### CLI Flags & Teammates

| Flag | In-Process | Split-Pane |
|------|------------|------------|
| `--disallowedTools` | ✅ Applies | ✅ v2.1.309+ |
| `--tools` | ✅ Applies | ✅ v2.1.309+ |
| `--allowedTools` | ✅ Applies | ❌ Not passed |

**Workaround for split-pane `--allowedTools`**: Use `--settings`:
```bash
claude --settings '{"permissions":{"allow":["Bash(npm *)"]}}'
```

### Message Permission Rules

- Messages from agents marked as from another Claude session (not user)
- Teammate **cannot** approve prompts or supply consent on your behalf
- Denied action → cannot relay to another teammate to bypass
- **Auto mode classifier**: Treats relayed approvals as untrusted; reviews `SendMessage` before delivery

---

## Token Usage & Costs

### Cost Characteristics

- **Each teammate = separate context window = independent token consumption**
- Scales linearly with number of active teammates
- Research/review/new features: usually worthwhile
- Routine tasks: single session more cost-effective

### Cache TTL

- In-process teammate requests: **5-minute cache TTL** (outside main conversation bucket)
- Extend to 1 hour: `subagentPromptCacheTtl: "1h"` in settings
- 1-hour cache writes billed at higher rate on API

### Cost Reference

See [Agent Team Token Costs](https://code.claude.com/docs/en/costs.md#agent-team-token-costs) for detailed guidance.

---

## Use Case Examples

### 1. Parallel Code Review

```text
Spawn three teammates to review PR #142:
- One focused on security implications
- One checking performance impact
- One validating test coverage
Have them each review and report findings.
```

**Why it works**: Distinct lenses prevent overlap; lead synthesizes.

### 2. Competing Hypotheses Debugging

```text
Users report the app exits after one message instead of staying connected.
Spawn 5 agent teammates to investigate different hypotheses. Have them talk to
each other to try to disprove each other's theories, like a scientific
debate. Update the findings doc with whatever consensus emerges.
```

**Key mechanism**: Active debunking prevents anchoring bias.

---

## Best Practices

### 1. Give Enough Context

Teammates load: CLAUDE.md, MCP servers, skills. **NOT** lead's conversation history.

```text
Spawn a security reviewer teammate with the prompt: "Review the authentication module
at src/auth/ for security vulnerabilities. Focus on token handling, session
management, and input validation. The app uses JWT tokens stored in
httpOnly cookies. Report any issues with severity ratings."
```

### 2. Choose Appropriate Team Size

| Size | When |
|------|------|
| 3-5 | Most workflows (balance parallel work / coordination) |
| 3 | 15 independent tasks |
| 5+ | Only when work genuinely benefits from more simultaneous workers |

**Constraints**: Token cost linear, coordination overhead increases, diminishing returns.

### 3. Size Tasks Appropriately

| Problem | Solution |
|---------|----------|
| Too small | Coordination overhead exceeds benefit |
| Too large | Long gaps between check-ins, wasted effort risk |
| Just right | Self-contained, clear deliverable (function, test file, review) |

**Tip**: 5-6 tasks per teammate keeps everyone productive; lead can reassign if stuck.

### 4. Wait for Teammates

```text
Wait for your teammates to complete their tasks before proceeding
```

### 5. Start with Research/Review

Clear boundaries, no parallel implementation coordination challenges.

### 6. Avoid File Conflicts

Each teammate owns different file sets.

### 7. Monitor & Steer

Check progress, redirect failing approaches, synthesize incrementally. Unattended teams = wasted effort risk.

---

## Troubleshooting

### Teammates Not Appearing

| Issue | Fix |
|-------|-----|
| In-process: not in panel | Check agent panel below prompt; use arrows |
| Row disappeared | Hidden after 30s panel idle; send message by name to restore |
| >3 idle teammates | Collapsed into `N idle agents` row; Enter expands |
| Task not complex enough | Claude decides; make task warrant a team |
| Split panes: tmux missing | `which tmux` — install if needed |
| iTerm2: panes don't open | Verify `it2` CLI + Python API enabled |

### Claude Spawns Teammates Instead of Subagents

**Disable**: Set `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=0` in settings.json (no restart needed).

**Precedence**: Shell export < user settings < project/local/--settings < managed settings.

### Too Many Permission Prompts

Pre-approve common operations in permission settings before spawning.

### Agents Stopping Early

| Symptom | Fix |
|---------|-----|
| Teammate stops on error | Select in panel / click pane → give instructions or spawn replacement |
| Lead stops early | "Keep going" / tell to wait for all tasks |
| In-process teammate waiting on API retry | Message from lead/teammate wakes it immediately |

### Orphaned tmux Sessions

```bash
tmux ls
tmux kill-session -t <session-name>
```

---

## Limitations

| Limitation | Details |
|------------|---------|
| **No session resumption** | `/resume` / `/rewind` don't restore in-process teammates |
| **Task status lag** | Teammates may fail to mark complete → blocks dependents |
| **Slow shutdown** | Teammates finish current request before exit |
| **One team per session** | Can't create additional named teams or share across sessions |
| **No nested teams** | Teammates cannot spawn teammates |
| **No background subagents** | In-process teammate subagents run foreground only |
| **Lead is fixed** | Can't promote teammate or transfer leadership |
| **No per-teammate spawn permissions** | All start with lead's mode |
| **Split panes need tmux/iTerm2** | In-process works everywhere |

---

## Quick Reference Cards

### Spawn Prompt Templates

```text
# Research team
Spawn 3 teammates to research [topic]:
- Teammate A: [focus area]
- Teammate B: [focus area]  
- Teammate C: [focus area]

# Review team
Spawn [N] teammates to review [PR/feature]:
- [role]: [specific criteria]
- [role]: [specific criteria]

# Debug team
Spawn [N] teammates to investigate [bug]:
- Each takes a different hypothesis
- Actively try to disprove each other
- Report consensus
```

### Common Commands

| Action | Command |
|--------|---------|
| Enable teams | `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` |
| Disable teams | `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=0` |
| Split panes (auto) | `"teammateMode": "auto"` in settings |
| Force tmux panes | `"teammateMode": "tmux"` |
| Force iTerm2 panes | `"teammateMode": "iterm2"` |
| One-off split mode | `claude --teammate-mode auto` |
| Force single model | `CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1` |
| Extend cache TTL | `"subagentPromptCacheTtl": "1h"` |
| Cleanup period | `"cleanupPeriodDays": 30` |

### Panel Shortcuts (In-Process)

| Key | Action |
|-----|--------|
| ↑/↓ | Select teammate |
| Enter | Open transcript, message |
| Esc | Clear selection / interrupt |
| Ctrl+T | Toggle task list |
| x (on teammate) | Stop teammate |
| Shift+Tab | Cycle permission mode |

### Settings Reference

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  },
  "teammateMode": "auto",
  "subagentPromptCacheTtl": "1h",
  "cleanupPeriodDays": 30
}
```

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` | Enable/disable (1/0) |
| `CLAUDE_CODE_SUBAGENT_MODEL` | Default teammate model |
| `CLAUDE_CODE_SUBAGENT_MODEL_FORCE` | Force all teammates to same model (1) |

---

## Related Documentation

- [Subagents](https://code.claude.com/docs/en/sub-agents.md) — Lightweight delegation
- [Cross-Session Messaging](https://code.claude.com/docs/en/cross-session-messaging.md) — Pass findings between your sessions
- [Git Worktrees](https://code.claude.com/docs/en/worktrees.md) — Manual parallel sessions
- [Hooks](https://code.claude.com/docs/en/hooks.md) — Quality gates
- [Permissions](https://code.claude.com/docs/en/permissions.md) — Permission modes & settings
- [Settings Reference](https://code.claude.com/docs/en/settings-reference.md) — All config options
- [Costs](https://code.claude.com/docs/en/costs.md) — Token usage guidance

---

*Guide generated from official docs as of 2026-11-22. Check [code.claude.com/docs](https://code.claude.com/docs) for updates.*