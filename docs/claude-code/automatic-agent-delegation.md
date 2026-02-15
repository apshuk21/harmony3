# How Claude Code Automatically Delegates to Sub-Agents

The mechanism behind automatic delegation — how the model decides to use a
sub-agent without you explicitly typing `/agents`.

---

## The Short Answer

There is **no routing layer, no scoring engine, no classifier**. The model
itself reads agent descriptions and decides whether to delegate. The entire
mechanism is: agent descriptions are embedded inside the **Task tool definition**,
which the model sees on every API request.

---

## The Mechanism: Agents Live Inside the Task Tool

When you create a sub-agent file in `.claude/agents/`, its `description` field
gets injected into the **Task tool's description text**. The Task tool is one
of the tools in the `tools[]` array sent with every API request.

Here's what the model actually sees (simplified):

```json
{
  "tools": [
    { "name": "Read", "description": "Reads a file..." },
    { "name": "Edit", "description": "Performs string replacements..." },
    { "name": "Bash", "description": "Executes bash commands..." },
    {
      "name": "Task",
      "description": "Launch a specialized agent to handle complex tasks.

        Available agent types:
        - Bash: Command execution specialist...
        - Explore: Fast agent for exploring codebases...
        - Plan: Software architect agent for designing plans...
        - code-review-specialist: Use this agent when code has been
          written, modified, or refactored and needs quality review.
          It should be triggered proactively after any significant
          code change.

          Examples:
          - Example 1:
            user: 'Add a new API endpoint'
            assistant: writes code, then says 'Now let me use the
            code-review-specialist agent to review what I wrote.'
          ...
        - your-custom-agent: (your description here)
      ",
      "input_schema": {
        "properties": {
          "subagent_type": {
            "description": "The type of specialized agent to use",
            "type": "string"
          },
          "prompt": {
            "description": "The task for the agent to perform",
            "type": "string"
          }
        }
      }
    }
  ]
}
```

**This is the entire mechanism.** The model:

1. Reads the Task tool description (which lists all available agents)
2. Matches the current task against agent descriptions
3. Decides whether to call `Task(subagent_type="agent-name", prompt="...")`
   or handle it directly

---

## What Happens Step by Step

```
You: "Add a logout button to the header"

┌─ MODEL REASONING ────────────────────────────────────────────────┐
│                                                                  │
│  The model sees all tools in tools[]:                            │
│    Read, Write, Edit, Bash, Glob, Grep, Task, ...               │
│                                                                  │
│  It reads the Task tool description and sees:                    │
│    - Explore: "Fast agent for exploring codebases"               │
│    - Plan: "Software architect for designing plans"              │
│    - code-review-specialist: "Use when code has been written     │
│      or modified. Trigger proactively after code changes."       │
│    - filter-specialist: "Builds custom filter components"        │
│                                                                  │
│  Model thinks:                                                   │
│    "The user wants me to add a logout button. None of these      │
│     agents match. I'll do it myself using Read, Edit, Write."    │
│                                                                  │
│  Model responds:                                                 │
│    → tool_use: Read("src/components/Header.tsx")                 │
│    (handles it directly, no delegation)                          │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

...model writes the code...

┌─ MODEL REASONING (after writing code) ───────────────────────────┐
│                                                                  │
│  Model has just finished editing Header.tsx.                     │
│  It re-reads the Task tool description.                          │
│                                                                  │
│  It sees: code-review-specialist: "Use this agent when code      │
│  has been written, modified, or refactored... should be          │
│  triggered PROACTIVELY after any significant code change."       │
│                                                                  │
│  Model thinks:                                                   │
│    "I just wrote significant code. The code-review-specialist    │
│     says to trigger proactively after code changes. I should     │
│     use it."                                                     │
│                                                                  │
│  Model responds:                                                 │
│    → tool_use: Task(                                             │
│        subagent_type: "code-review-specialist",                  │
│        prompt: "Review src/components/Header.tsx..."             │
│      )                                                           │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## The Description Field Is Everything

Since the model decides based on natural language matching, the `description`
field is the single most important part of your agent configuration.

### What goes into the Task tool description

From your `.claude/agents/my-agent.md`:

```yaml
---
name: my-agent
description: "This exact text gets embedded into the Task tool description"
---
```

The `description` field value is injected verbatim into the Task tool's
description text. This is what the model reads on every turn to decide whether
to delegate.

### Good descriptions (high auto-delegation accuracy)

```yaml
# Specific trigger conditions + "proactively" hint
description: >
  Builds custom filter components and filter logic for AG Grid SSRM.
  Use proactively when implementing floating filters, column filter
  models, or multi-condition filter inputs. Also use when modifying
  existing filter components.
```

```yaml
# Concrete examples in the description itself
description: >
  Use this agent when code has been written, modified, or refactored
  and needs quality review. It should be triggered proactively after
  any significant code change.

  Examples:
  - user: "Add a new API endpoint"
    assistant writes code, then delegates review to this agent.
  - user: "Refactor the auth store"
    assistant modifies code, then delegates review to this agent.
```

### Bad descriptions (model won't know when to delegate)

```yaml
# Too vague — when should the model use this?
description: "Helps with filters"
```

```yaml
# Too broad — overlaps with everything
description: "General purpose coding agent for all tasks"
```

```yaml
# No trigger hint — model won't use it proactively
description: "Reviews code quality and security"
# vs
description: "Reviews code quality. Use PROACTIVELY after code changes."
```

---

## The "Proactively" Keyword

The word "proactively" (or similar phrasing) is a **natural language hint**,
not a technical flag. There is no special parsing of this word.

It works because the model reads it as an instruction:

| Description says                               | Model interprets as                        |
| ---------------------------------------------- | ------------------------------------------ |
| "Use proactively after code changes"           | "I should use this without being asked"    |
| "Use when the user asks for a review"          | "I should wait for an explicit request"    |
| "Use this agent when implementing filters"     | "I should use this for filter tasks"       |

The model treats the description as **instructions to itself** about when
to call the Task tool with that agent.

### Related patterns that work

```yaml
description: "...It should be triggered proactively..."    # ← directive
description: "...Use immediately after writing code..."    # ← urgency
description: "...Always use this for grid work..."         # ← always
description: "...Use this before committing changes..."    # ← timing
```

These all work because the model reads them as behavioral instructions.

---

## Built-in vs Custom Agents

Both built-in agents and your custom agents appear in the same Task tool
description. The model sees one flat list:

```
Available agent types:
- Bash                        ← built-in
- Explore                     ← built-in
- Plan                        ← built-in
- general-purpose             ← built-in
- code-review-specialist      ← custom (from .claude/agents/)
- filter-specialist           ← custom (from .claude/agents/)
- checkout-flow               ← custom (from .claude/agents/)
```

There is no priority between built-in and custom agents. The model chooses
based purely on description matching.

However, built-in agents have one advantage: the Task tool's own description
includes **usage guidelines** like "Use Explore when you need to quickly find
files" that effectively coach the model on when to use them.

---

## What Happens When Descriptions Overlap

If two agents have similar descriptions, the model makes a judgment call.
There is **no documented priority system** for overlapping agents.

```yaml
# Agent A
name: filter-specialist
description: "Builds AG Grid filter components"

# Agent B
name: grid-specialist
description: "Implements AG Grid features including filters, sorting, export"
```

For the task "add a floating filter", either agent could be chosen. The model
picks based on which description it considers a better match.

### How to avoid overlap

1. **Make descriptions specific**: "Builds custom floating filter UI components"
   vs "Configures AG Grid column definitions, sorting, and SSRM datasources"

2. **Define boundaries explicitly**: "Handles filter UI ONLY, not grid
   configuration or column definitions"

3. **Use the description to exclude**: "Use for checkout payment flows.
   Do NOT use for cart management or product catalog."

---

## When the Model Chooses NOT to Delegate

The model handles tasks directly (no sub-agent) when:

| Condition                              | Model's reasoning                           |
| -------------------------------------- | ------------------------------------------- |
| No agent description matches the task  | "None of these agents fit"                  |
| Task is simple (one file edit)         | "Not worth the overhead of a sub-agent"     |
| Task needs iterative back-and-forth    | "Sub-agents can't ask me questions mid-task" |
| Task depends on current context        | "Sub-agent won't have my conversation history" |
| Multiple phases share context          | "Passing context between agents is lossy"   |

The model also considers the **practical trade-offs** described in the Task
tool's usage notes:

```
When NOT to use the Task tool:
- If you want to read a specific file path, use Read instead
- If you are searching for a specific class, use Glob instead
- If you are searching within 2-3 files, use Read instead
```

These instructions (part of the Task tool description) actively discourage
the model from delegating simple tasks.

---

## The Examples Field: Few-Shot Prompting

The `description` field can include examples — and these function as
**few-shot prompting** for the model. This is the same technique used in
prompt engineering: show the model concrete scenarios so it learns the pattern.

```yaml
description: >
  Use this agent when code has been written or modified.

  Examples:

  - Example 1:
    user: "Add a new API endpoint for fetching user preferences"
    assistant: writes code
    assistant: "Now let me use the code-review-specialist to review."
    <commentary>
    Since significant code was written, delegate to this agent.
    </commentary>

  - Example 2:
    user: "Refactor the auth store"
    assistant: modifies code
    assistant: "Let me run the code-review-specialist to review."
    <commentary>
    Since the store was modified, delegate to this agent.
    </commentary>
```

This works because:
1. The model sees the examples in the Task tool description
2. When a similar situation occurs, the model pattern-matches
3. Having 2-3 examples is much more effective than a description alone

### The commentary pattern

The `<commentary>` blocks in examples explain the **reasoning** behind
delegation. This teaches the model not just WHAT to do, but WHY. The model
then applies this reasoning to new situations it hasn't seen in the examples.

---

## Visual Summary: The Full Delegation Flow

```
Session Start
──────────────
Claude Code loads all agents from:
  .claude/agents/*.md
  ~/.claude/agents/*.md

Their descriptions are injected into the Task tool definition.


Every API Request
─────────────────

tools: [
  Read, Write, Edit, Bash, Glob, Grep,
  Task ← contains all agent descriptions
]

                        ┌──────────────────────┐
User message ──────────→│  CLAUDE MODEL         │
                        │                       │
                        │  Reads tools[]:       │
                        │  - Can I use Read?    │
                        │  - Can I use Edit?    │
                        │  - Can I use Task?    │──── reads agent descriptions
                        │    - Explore?         │    inside Task tool definition
                        │    - Plan?            │
                        │    - code-reviewer?   │
                        │    - filter-spec?     │
                        │                       │
                        │  Decision:            │
                        │  ┌─────────────────┐  │
                        │  │ Match found?    │  │
                        │  │ YES → Task()    │  │
                        │  │ NO  → direct    │  │
                        │  └─────────────────┘  │
                        │                       │
                        └───────┬───────────────┘
                                │
                   ┌────────────┴────────────┐
                   ↓                         ↓
          tool_use: Task(            tool_use: Read/Edit/etc
            subagent_type:             (handles directly)
              "code-reviewer",
            prompt: "Review..."
          )
                   │
                   ↓
          Claude Code creates
          isolated sub-agent context
          and runs the agent loop
```

---

## Practical Implications

### 1. Description quality directly affects delegation accuracy

Since the model uses natural language matching, invest time in writing clear,
specific descriptions with examples. A well-described agent gets used
appropriately. A vaguely described agent gets used randomly or not at all.

### 2. Every agent description costs context tokens

All agent descriptions are in the Task tool definition, which is sent with
every request. Ten agents with verbose descriptions eat into your context
window even when they're not being used. Keep descriptions concise but
specific.

### 3. "Proactively" is powerful but imprecise

The model interprets "proactively" as "use without being asked." This is
great for code review but could be annoying if every agent says "use me
proactively." Reserve this keyword for agents that genuinely should auto-fire
(like code review after changes).

### 4. Examples are the most reliable delegation trigger

A description like "use for filters" is ambiguous. But 2-3 concrete examples
showing "user asked X → delegate to this agent" teach the model exactly when
to fire. This is few-shot prompting applied to agent delegation.

### 5. You can always override

If the model delegates wrong (or doesn't delegate when it should), you can
always override manually:

```
# Force delegation
Use the filter-specialist agent to build the date range filter.

# Prevent delegation
Do NOT use any sub-agents. Handle this directly.
```
