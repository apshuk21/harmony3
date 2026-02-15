# Feature-Based Sub-Agents in Claude Code

A guide to creating, organizing, and coordinating specialized sub-agents for
domain-specific work in large applications.

---

## What Are Sub-Agents?

Sub-agents are **markdown files with YAML frontmatter** stored in `.claude/agents/`.
Each file defines a specialized agent with its own instructions, tools, model,
and optional persistent memory. Claude delegates tasks to them based on their
`description` field.

```
.claude/agents/
├── filter-specialist.md
├── grid-specialist.md
├── checkout-flow.md
├── cart-manager.md
└── code-review-specialist.md   ← already exists in this project
```

Files in `.claude/agents/` are **checked into version control** — the whole team
shares and iterates on them.

---

## Anatomy of a Sub-Agent File

```markdown
---
name: filter-specialist
description: >
  Builds custom filter components and filter logic for AG Grid SSRM.
  Use proactively when implementing floating filters or column filter models.
tools: Read, Edit, Write, Bash, Grep, Glob
model: sonnet
memory: project
---

You are a filter specialist for AG Grid Server-Side Row Model.

When invoked:
1. Review existing filter patterns in src/components/ui/
2. Check docs/filters/ for project conventions
3. Implement following the established patterns
4. Verify integration with ServerSideGrid wrapper

Always:
- Use the three-shape filter model (single, condition1/condition2, conditions array)
- Set maxNumConditions on the parent column definition
- Sync floating filter state with the model prop from AG Grid
```

### Frontmatter Fields

| Field              | Required | Description                                                    |
| ------------------ | -------- | -------------------------------------------------------------- |
| `name`             | Yes      | Unique identifier (lowercase, hyphens)                         |
| `description`      | Yes      | When to delegate — include "proactively" to encourage auto-use |
| `tools`            | No       | Allowed tools. Inherits all if omitted                         |
| `disallowedTools`  | No       | Tools to explicitly deny                                       |
| `model`            | No       | `sonnet`, `opus`, `haiku`, or `inherit`                        |
| `memory`           | No       | `user`, `project`, or `local` — persistent memory scope        |
| `maxTurns`         | No       | Max agentic turns before stopping                              |
| `skills`           | No       | Pre-load skill content into context                            |
| `hooks`            | No       | Lifecycle hooks scoped to this agent                           |

---

## How Sub-Agents Are Invoked

### Automatic (via description matching)

Claude reads the `description` field and delegates when the current task matches.
Adding **"Use proactively"** in the description encourages automatic delegation.

### Explicit (user request)

```
Use the filter-specialist agent to create a date range floating filter.
```

### Via Task tool (programmatic)

When the main session or another orchestrating agent spawns sub-agents:

```
Task tool → subagent_type: "filter-specialist"
         → prompt: "Create a MultiValueFloatingFilter for currency pairs"
```

---

## Communication Model

### The Critical Constraint

**Sub-agents cannot talk to each other directly.** They follow a strict
hub-and-spoke pattern:

```
                  Main Session (hub)
                 /       |        \
                /        |         \
     filter-       grid-         checkout-
     specialist    specialist    flow
```

- Each sub-agent reports results **only to the parent** (main session).
- Sibling agents **cannot see** each other's conversation or results.
- The main session acts as the **coordinator**, passing relevant context
  between agents when needed.

### What Sub-Agents CAN Access

- All project files (via Read, Glob, Grep)
- CLAUDE.md instructions (auto-injected)
- Their own persistent memory (if `memory:` is set)
- MCP servers (if configured)
- Skills (if pre-loaded)

### What Sub-Agents CANNOT Access

- Other agents' conversation history
- Results from sibling agents (only parent receives these)
- Shared mutable state between agents

---

## Coordination Patterns

### Pattern 1: Sequential Handoff

Use when output of one agent feeds into the next.

```
User: "Build the currency pair filter and integrate it with the grid"

Main Session:
  1. → filter-specialist: "Create MultiValueFloatingFilter component"
     ← Returns: component created at src/components/ui/MultiValueFloatingFilter.tsx

  2. → grid-specialist: "Integrate MultiValueFloatingFilter into FxCashTab grid.
                         The component is at src/components/ui/MultiValueFloatingFilter.tsx
                         and exports MultiValueFloatingFilter."
     ← Returns: integration complete, column def updated
```

The main session **manually passes context** from agent A's result into agent B's
prompt. This is the primary coordination mechanism.

### Pattern 2: Parallel Independence

Use when agents work on unrelated features simultaneously.

```
User: "Set up filters, grid export, and checkout form"

Main Session (parallel):
  → filter-specialist: "Create floating filters for currency and date columns"
  → grid-specialist: "Add Excel export to ServerSideGrid"
  → checkout-flow: "Build the payment form with Stripe"

All three run simultaneously, results return to main session.
```

### Pattern 3: Research Then Implement

Use an Explore agent first, then delegate to the feature agent.

```
Main Session:
  1. → Explore agent: "How are filters currently implemented in the codebase?"
     ← Returns: summary of patterns, file locations, conventions

  2. → filter-specialist: "Create a new date range filter following the patterns
                          described in docs/filters/. Existing filters use
                          the three-shape model pattern."
     ← Returns: implementation complete
```

### Pattern 4: Implement Then Review

Chain a feature agent with the code-review-specialist.

```
Main Session:
  1. → filter-specialist: "Build the MultiValueFloatingFilter"
     ← Returns: component created

  2. → code-review-specialist: "Review src/components/ui/MultiValueFloatingFilter.tsx"
     ← Returns: review with issues found

  3. Main session fixes critical issues based on review
```

---

## Is the Feature-Based Approach Beneficial?

### When It Works Well

| Scenario                          | Why it helps                                              |
| --------------------------------- | --------------------------------------------------------- |
| **Large codebase** (50+ files)    | Each agent carries focused domain knowledge               |
| **Repeated domain work**          | Memory accumulates patterns (e.g., "all filters use X")   |
| **Team collaboration**            | Agents are version-controlled, team shares conventions     |
| **Complex features**              | Keeps exploration noise out of main context                |
| **Consistent patterns**           | Agent enforces conventions without re-reading CLAUDE.md    |
| **Onboarding**                    | New team members get domain expertise via agent prompts    |

### When It's Overkill

| Scenario                        | Better alternative                      |
| ------------------------------- | --------------------------------------- |
| Small project (< 20 files)      | Just use CLAUDE.md conventions          |
| One-off tasks                   | Direct main session work                |
| Tightly coupled features        | Single agent or main session            |
| Simple CRUD operations          | No specialization needed                |

### Trade-offs

| Pro                                           | Con                                              |
| --------------------------------------------- | ------------------------------------------------ |
| Focused expertise per domain                  | No direct inter-agent communication               |
| Context isolation (keeps main session clean)  | Each invocation starts fresh (unless resumed)     |
| Persistent memory builds knowledge over time  | Coordination overhead for dependent work          |
| Version-controlled, team-shared               | More files to maintain in `.claude/agents/`       |
| Model selection per complexity                | Cannot nest agents (no agent spawning agents)     |

---

## Example: E-Commerce Agent Setup

For a large e-commerce application with checkout, cart, product catalog, etc:

```
.claude/agents/
├── checkout-flow.md          # Payment, order validation, Stripe
├── cart-manager.md           # Cart state, item ops, persistence
├── product-catalog.md        # Product listing, search, categories
├── filter-specialist.md      # Faceted search, price ranges, sorting
├── grid-specialist.md        # Data tables, pagination, export
├── auth-guardian.md           # Auth flows, session, permissions
└── code-review-specialist.md # Cross-cutting quality reviews
```

### Sample: checkout-flow.md

```markdown
---
name: checkout-flow
description: >
  Implements checkout workflows, payment processing, and order validation.
  Use proactively when building or modifying checkout, payment, or order flows.
tools: Read, Edit, Write, Bash, Grep, Glob
model: opus
memory: project
---

You are a checkout flow specialist. You implement payment processing,
order validation, and transaction management.

## Domain Knowledge
- Payment provider: Stripe (react-stripe-js)
- State management: Zustand (checkoutStore)
- API layer: apiFetch<T>() from @/lib/api/client.ts
- Routes: src/routes/_authenticated/checkout/

## When Invoked
1. Review current checkout flow in src/pages/checkout/
2. Check Stripe integration patterns
3. Implement with proper error handling and loading states
4. Verify auth guards are in place on route beforeLoad

## Conventions
- All monetary values in cents (integer)
- Use Zod for payment form validation
- Never log card details or PII
- Always show order summary before payment confirmation
```

### Sample: cart-manager.md

```markdown
---
name: cart-manager
description: >
  Manages shopping cart state, item operations, and cart persistence.
  Use proactively when implementing add-to-cart, quantity updates, or cart UI.
tools: Read, Edit, Write, Bash, Grep, Glob
model: sonnet
memory: project
---

You are a cart management specialist. You handle cart state,
item operations, price calculations, and cart persistence.

## Domain Knowledge
- State: Zustand cartStore with persist middleware
- Cart API: src/api/cart.ts
- Components: src/components/cart/

## Conventions
- Optimistic updates for add/remove, rollback on failure
- Cart badge count from selector hook, never full store subscription
- Price display always formatted with Intl.NumberFormat
```

---

## Persistent Memory

When `memory: project` is set, each agent gets a memory directory:

```
.claude/agent-memory/
├── filter-specialist/
│   ├── MEMORY.md              ← auto-injected (first 200 lines)
│   └── patterns.md            ← detailed notes
├── grid-specialist/
│   └── MEMORY.md
├── checkout-flow/
│   └── MEMORY.md
└── code-review-specialist/
    ├── MEMORY.md
    └── patterns.md
```

- `MEMORY.md` is loaded into the agent's system prompt each session.
- Agents record patterns, conventions, and edge cases they discover.
- With `memory: project`, these files are **checked into git** — team-shared.
- With `memory: local`, they stay on your machine only.

---

## Model Selection Guide

| Agent Type             | Recommended Model | Rationale                              |
| ---------------------- | ----------------- | -------------------------------------- |
| Code review            | `sonnet`          | Pattern matching, fast feedback        |
| UI components          | `sonnet`          | Well-defined patterns, speed matters   |
| Complex business logic | `opus`            | Deep reasoning for edge cases          |
| Exploration/research   | `haiku`           | Fast, cheap, read-only                 |
| Architecture decisions | `opus`            | Needs broad context understanding      |

---

## Limitations to Keep in Mind

1. **No nesting** — sub-agents cannot spawn other sub-agents
2. **No shared state** — agents communicate only through the main session
3. **Fresh context** — each invocation starts clean (use `resume` to continue)
4. **Description matching** — poorly written descriptions lead to wrong delegation
5. **Memory truncation** — only first 200 lines of MEMORY.md are injected

---

## Quick Start

To create a new sub-agent interactively:

```bash
/agents
```

Or manually create a file in `.claude/agents/your-agent-name.md` with the
frontmatter and instructions shown above, then restart your Claude Code session.
