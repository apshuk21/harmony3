# Claude Code: Context, Information Flow, and Architecture

How data flows from your keyboard to the model and back — covering CLAUDE.md,
skills, tools, sub-agents, and context management.

---

## The Big Picture

Every time you press Enter in Claude Code (CLI or VSCode), an API request is
built and sent to the Claude model. The model is **stateless** — it has no memory
of previous turns. Claude Code reconstructs the full picture on every single
request.

```
┌─────────────────────────────────────────────────────────┐
│                    API Request                          │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │  system prompt                                  │    │
│  │  ├── Claude Code base instructions              │    │
│  │  ├── CLAUDE.md (all levels, merged)             │    │
│  │  ├── Auto memory (first 200 lines)              │    │
│  │  ├── Skill descriptions (names + when to use)   │    │
│  │  └── Environment info (OS, git, date, model)    │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │  messages[]  (full conversation history)        │    │
│  │  ├── user message #1                            │    │
│  │  ├── assistant response #1                      │    │
│  │  ├── tool_use (Read file X)                     │    │
│  │  ├── tool_result (contents of file X)           │    │
│  │  ├── assistant response #2                      │    │
│  │  ├── user message #2                            │    │
│  │  ├── ...every turn replayed...                  │    │
│  │  └── user message #N  ← your latest input      │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │  tools[]  (available tool definitions)          │    │
│  │  ├── Built-in: Read, Write, Edit, Bash, Glob,  │    │
│  │  │   Grep, WebFetch, WebSearch, Task, ...       │    │
│  │  ├── MCP server tools (via tool search)         │    │
│  │  └── Skill tool (for invoking /slash commands)  │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Key insight**: This entire payload is sent on **every single turn**. Turn 1,
turn 5, turn 50 — the model always receives the full reconstructed context.

---

## CLAUDE.md: How It Actually Works

### Your understanding (corrected)

> "Whenever we make any conversation, the entire CLAUDE.md is part of the input
> tokens. Even in multi-round conversations, the entire context including
> CLAUDE.md is sent as input tokens."

**This is correct.** CLAUDE.md is injected into the **system prompt**, which is
sent with every API request. It is not a one-time thing — it rides along on
every turn.

The one nuance: CLAUDE.md lives in the **system prompt**, not in the
**messages array**. This distinction matters because:

- System prompt is never summarized or compressed during context compaction
- System prompt benefits from prompt caching (repeated prefix = cheaper tokens)
- System prompt takes priority over conflicting instructions in messages

### CLAUDE.md hierarchy

Multiple CLAUDE.md files can exist simultaneously. They are **additive** (merged
together), with more specific ones taking precedence:

```
Priority (highest → lowest):
───────────────────────────────────────────────────────────

1. Managed policy (organization-level, IT-managed)
   macOS:   /Library/Application Support/ClaudeCode/CLAUDE.md
   Linux:   /etc/claude-code/CLAUDE.md

2. Project CLAUDE.md (checked into git, team-shared)
   ./CLAUDE.md  OR  ./.claude/CLAUDE.md

3. Project rules (modular, also team-shared)
   ./.claude/rules/*.md
   All .md files here are auto-loaded with same priority as #2

4. User memory (personal, all projects)
   ~/.claude/CLAUDE.md

5. Project local (personal, this project, gitignored)
   ./CLAUDE.local.md

6. Auto memory (Claude-managed)
   ~/.claude/projects/<project-hash>/memory/MEMORY.md
   Only first 200 lines loaded
```

All of these are **merged and included** in the system prompt. They don't
override each other — they stack. When instructions conflict, more specific
(higher priority) wins.

### Child directory CLAUDE.md files

CLAUDE.md files in parent directories above your working directory load at
launch. But CLAUDE.md files in **child directories** load **on demand** — only
when Claude reads files in those directories. This keeps context lean.

```
project/
├── CLAUDE.md                    ← loaded at launch
├── src/
│   ├── CLAUDE.md                ← loaded when Claude reads src/ files
│   └── components/
│       └── CLAUDE.md            ← loaded when Claude reads components/ files
```

---

## Multi-Turn Conversation Context

### What happens on each turn

The Claude Messages API is **stateless**. Every request must include the
complete conversation. Here's what happens:

```
Turn 1: You ask "Fix the filter bug"
══════════════════════════════════════

→ API Request = {
    system: [CLAUDE.md + instructions + memory + skill descriptions],
    messages: [
      { role: "user", content: "Fix the filter bug" }
    ],
    tools: [Read, Write, Edit, Bash, ...]
  }

← API Response = {
    id: "msg_01XFDUDYJgAACzvnptvVoYEL",
    type: "message",
    role: "assistant",
    model: "claude-opus-4-6-20250929",
    content: [
      {                                          ← TOOL USE BLOCK
        type: "tool_use",
        id: "toolu_01A09q90qw90lq917835lq9",
        name: "Read",
        input: { file_path: "/src/components/ui/MultiValueFloatingFilter.tsx" }
      }
    ],
    stop_reason: "tool_use",                     ← model paused, waiting for tool result
    usage: {
      input_tokens: 4200,                        ← system + messages + tools
      output_tokens: 85,                         ← just the tool_use block
      cache_creation_input_tokens: 3800,         ← first time — caching system prompt
      cache_read_input_tokens: 0                 ← nothing cached yet
    }
  }

  Claude Code now executes the Read tool locally on your machine,
  gets the file contents, and appends both the tool_use and tool_result
  to the messages array for the next request.


Turn 2: Claude read the file, decides to call Edit
════════════════════════════════════════════════════

→ API Request = {
    system: [same system prompt],
    messages: [
      { role: "user",      content: "Fix the filter bug" },
      { role: "assistant", content: [
          { type: "tool_use", id: "toolu_01A0...", name: "Read", input: {...} }
      ]},
      { role: "user",      content: [
          { type: "tool_result", tool_use_id: "toolu_01A0...",
            content: "...92 lines of file contents..." }       ← tool output injected
      ]},
    ],
    tools: [same tools]
  }

← API Response = {
    id: "msg_01YGEUDZKgBBDawopuwXpQFM",
    role: "assistant",
    content: [
      {                                          ← TEXT BLOCK (shown to user)
        type: "text",
        text: "I see the issue — the model prop isn't being synced."
      },
      {                                          ← TOOL USE BLOCK
        type: "tool_use",
        id: "toolu_02B18r81rw81mr928946mr8",
        name: "Edit",
        input: { file_path: "...", old_string: "...", new_string: "..." }
      }
    ],
    stop_reason: "tool_use",                     ← still not done, another tool call
    usage: {
      input_tokens: 4600,                        ← grew — file contents now in messages
      output_tokens: 210,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 3800              ← system prompt cache HIT (cheaper)
    }
  }

  Claude Code executes Edit locally, appends result, sends next request.


Turn 3: Claude is done with tools, responds to user
═════════════════════════════════════════════════════

→ API Request = {
    system: [same system prompt],
    messages: [
      ...all messages from turns 1 and 2...,
      { role: "assistant", content: [
          { type: "text", text: "I see the issue..." },
          { type: "tool_use", id: "toolu_02B1...", name: "Edit", input: {...} }
      ]},
      { role: "user", content: [
          { type: "tool_result", tool_use_id: "toolu_02B1...",
            content: "File edited successfully." }
      ]},
    ],
    tools: [same tools]
  }

← API Response = {
    id: "msg_01ZHFVEALhCCEbxpqvwYrRGN",
    role: "assistant",
    content: [
      {                                          ← TEXT ONLY (no more tool calls)
        type: "text",
        text: "Fixed. Added useEffect to sync the model prop..."
      }
    ],
    stop_reason: "end_turn",                     ← model is done, back to user
    usage: {
      input_tokens: 5100,                        ← grew again — edit result added
      output_tokens: 150,
      cache_read_input_tokens: 4500              ← most of prior context cached
    }
  }

  Claude Code displays the text to the user. Waits for next input.


Turn 4: You ask a follow-up
════════════════════════════

→ API Request = {
    system: [same system prompt],
    messages: [
      ...ALL messages from turns 1, 2, and 3...,   ← full history replayed
      { role: "user", content: "Also fix the grid integration" }
    ],
    tools: [same tools]
  }

← API Response = { ...cycle continues... }
```

### Response structure explained

Every API response has the same shape:

```json
{
  "id":          "msg_...",               // unique message ID
  "type":        "message",
  "role":        "assistant",             // always "assistant"
  "model":       "claude-opus-4-6-...",   // model used
  "content":     [ ... ],                 // array of content blocks (see below)
  "stop_reason": "end_turn|tool_use",     // WHY the model stopped
  "usage": {                              // token accounting
    "input_tokens":  4200,                // total input tokens this request
    "output_tokens": 150,                 // tokens the model generated
    "cache_creation_input_tokens": 3800,  // tokens cached for the first time
    "cache_read_input_tokens": 0          // tokens read from cache (cheaper)
  }
}
```

The `content` array contains one or more blocks:

```
content: [
  { type: "text",     text: "..." },                        ← displayed to user
  { type: "tool_use", id: "...", name: "Read", input: {} }, ← tool to execute
  { type: "tool_use", id: "...", name: "Edit", input: {} }, ← parallel tool call
]
```

The **`stop_reason`** field is what drives the agentic loop:

| stop_reason    | What it means                    | What Claude Code does              |
| -------------- | -------------------------------- | ---------------------------------- |
| `"end_turn"`   | Model is done, no more actions   | Display text, wait for user input  |
| `"tool_use"`   | Model wants to call tool(s)      | Execute tools, send results back   |
| `"max_tokens"` | Hit output token limit mid-reply | May continue in next request       |

**Every prior message, tool call, and tool result is replayed.** This is why
context fills up — file contents from `Read`, command outputs from `Bash`, all
accumulate in the messages array.

### Context compression (compaction)

When context approaches ~95% of the window, Claude Code compacts automatically:

```
Compaction order (what gets dropped/summarized first):
──────────────────────────────────────────────────────

1. Older tool outputs      ← cleared first (file reads, bash output)
2. Verbose explanations    ← summarized
3. Conversation history    ← summarized into key points

What is ALWAYS preserved:
─────────────────────────
✓ System prompt (CLAUDE.md, instructions, memory)
✓ Your original requests
✓ Key code snippets
✓ Recent turns
```

This is why CLAUDE.md is the safest place for persistent rules — it survives
compression. Instructions buried in turn 3 of a 50-turn conversation will
likely get summarized away.

You can control compaction behavior:
- Add a "Compact Instructions" section to CLAUDE.md
- Run `/compact` with a focus area (e.g. `/compact focus on filter logic`)
- Set `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=50` to trigger earlier
- Run `/context` to see what's consuming space

---

## Sub-Agents: What Context Do They Get?

When the main session spawns a sub-agent via the Task tool, the sub-agent gets
a **fresh, isolated context** — not the parent's conversation.

### What a sub-agent receives

```
Sub-agent API Request = {
  system: [
    Sub-agent's own instructions (from .claude/agents/name.md body),
    CLAUDE.md (inherited from parent),              ← YES, included
    Git status (inherited from parent),
    Basic environment info (working directory, OS),
    Pre-loaded skills (if listed in skills: field)
  ],
  messages: [
    { role: "user", content: "...the prompt the parent passed..." }
  ],
  tools: [only tools listed in the agent's tools: field]
}
```

### What a sub-agent does NOT receive

```
✗ Parent's conversation history (none of it)
✗ Parent's auto memory
✗ Parent's loaded skills (unless explicitly listed in skills: field)
✗ Results from sibling sub-agents
✗ Tool results from the parent session
```

### Visual comparison

```
Main Session Context                Sub-agent Context
─────────────────────               ──────────────────
system:                             system:
  ├── Claude Code instructions        ├── Agent-specific instructions
  ├── CLAUDE.md ─────────────────────►├── CLAUDE.md (same)
  ├── Auto memory                     ├── Agent memory (if enabled)
  ├── Skill descriptions              ├── Pre-loaded skills (if any)
  └── Environment info ─────────────►└── Environment info (same)

messages:                           messages:
  ├── 50 turns of conversation        └── 1 message: the delegation prompt
  ├── 30 file reads
  ├── 10 bash outputs
  └── Your latest question

tools:                              tools:
  ├── All built-in tools              ├── Only specified tools
  ├── All MCP tools                   └── (restricted set)
  └── Task tool
```

The sub-agent's result is returned as a single message to the parent session.
The parent never sees the sub-agent's internal tool calls or exploration — only
the final summary.

---

## Skills: What Are They and How Do They Work?

### Definition

Skills are **markdown files** that extend Claude's capabilities with domain
knowledge, workflows, or reusable instructions. Think of them as "loadable
expertise" — they only consume context when actually needed.

### Where they live

```
.claude/skills/
├── grid-conventions/
│   └── SKILL.md           ← project skill (team-shared, version-controlled)
├── api-patterns/
│   └── SKILL.md
└── filter-patterns/
    └── SKILL.md

~/.claude/skills/
├── my-coding-style/
│   └── SKILL.md           ← personal skill (all projects)
└── debug-workflow/
    └── SKILL.md
```

Backward compatible: `.claude/commands/` also works.

### Skill file structure

```markdown
---
name: grid-conventions
description: AG Grid SSRM patterns, column definitions, and ServerSideGrid usage.
user-invocable: true         # Can user trigger with /grid-conventions?
disable-model-invocation: false  # Can Claude auto-trigger it?
---

## ServerSideGrid Usage

Always use ServerSideGrid<T> wrapper, never raw AgGridReact...
(full instructions here)
```

### Loading strategy: lazy, not eager

This is the key difference from CLAUDE.md:

```
Session Start
─────────────
CLAUDE.md         → Full content loaded into system prompt     (EAGER)
Skill descriptions → Short descriptions loaded into system prompt (EAGER)
Skill content     → NOT loaded yet                              (LAZY)

During Conversation
───────────────────
You: "Set up the grid columns"
Claude: (reads skill descriptions, decides grid-conventions is relevant)
        → grid-conventions SKILL.md full content loaded into context
        → Claude now has the full skill content available

You: "Now fix the auth bug"
Claude: (grid-conventions still in context from previous load)
        (auth-patterns skill description matches → loads auth-patterns)
```

### When does Claude decide to load a skill?

Two triggers:

1. **Automatic**: Claude matches your task against skill descriptions and loads
   relevant ones. This is why good descriptions matter — vague descriptions lead
   to wrong matches.

2. **Manual**: You type `/skill-name` to explicitly invoke it. For skills with
   `disable-model-invocation: true`, this is the only way.

### Skills vs CLAUDE.md

| Aspect               | CLAUDE.md                    | Skills                         |
| --------------------- | ---------------------------- | ------------------------------ |
| **When loaded**       | Every turn, always           | On demand, when relevant       |
| **Context cost**      | Always consuming tokens      | Zero until used                |
| **Best for**          | "Always follow these rules"  | "Here's how to do X when X comes up" |
| **Survives compression** | Yes (system prompt)       | Likely yes (while active)      |
| **User invocable**    | No                           | Yes (`/skill-name`)            |
| **Team shared**       | Yes (`.claude/CLAUDE.md`)    | Yes (`.claude/skills/`)        |

### Skills in sub-agents

When a sub-agent lists skills in its frontmatter:

```yaml
---
name: grid-specialist
skills:
  - grid-conventions
  - filter-patterns
---
```

Those skills are **fully pre-loaded** into the sub-agent's context at launch —
not lazy-loaded. The sub-agent starts with that expertise immediately.

---

## Tools: Where They Fit

### Tool definitions

Tool definitions (name, description, input schema) are sent in the `tools[]`
array of every API request. The model uses these to decide which tool to call.

```json
{
  "tools": [
    {
      "name": "Read",
      "description": "Reads a file from the local filesystem...",
      "input_schema": { "type": "object", "properties": { "file_path": {...} } }
    },
    {
      "name": "Bash",
      "description": "Executes a bash command...",
      "input_schema": { "type": "object", "properties": { "command": {...} } }
    }
  ]
}
```

**Built-in tools** (Read, Write, Edit, Bash, Glob, Grep, etc.) are always
included.

**MCP server tools** are managed by tool search — loads up to ~10% of context
initially, defers the rest until relevant.

### Tool results in context

When Claude calls a tool, the result becomes part of the messages array:

```
messages: [
  { role: "assistant", tool_use: { name: "Read", input: { file_path: "..." } } },
  { role: "user",      tool_result: "...500 lines of file content..." },
]
```

This means **every file you read, every command you run, every search result
accumulates in context**. Tool results are the #1 consumer of context tokens
and the first thing dropped during compaction.

### The agentic loop

Within a single turn, Claude can make multiple tool calls before responding:

```
You: "Fix the filter bug"
                                    ┌─── API call 1 ───┐
Claude thinks → calls Read tool     │ Read filter file  │
                                    └───────────────────┘
                                    ┌─── API call 2 ───┐
Claude thinks → calls Grep tool     │ Search for usage  │
                                    └───────────────────┘
                                    ┌─── API call 3 ───┐
Claude thinks → calls Edit tool     │ Apply the fix     │
                                    └───────────────────┘
Claude responds: "Fixed the bug by..."
```

Each tool call is a separate API round-trip. The conversation grows with each
step. After 5 tool calls in one turn, the messages array might look like:

```
messages: [
  user: "Fix the filter bug",
  assistant: tool_use(Read),
  user: tool_result("...file contents..."),     ← tokens consumed
  assistant: tool_use(Grep),
  user: tool_result("...search results..."),    ← tokens consumed
  assistant: tool_use(Edit),
  user: tool_result("...edit confirmation..."), ← tokens consumed
  assistant: "Fixed the bug by..."
]
```

---

## Hooks: Outside the Loop

Hooks are shell commands that run **outside** the API call — they execute on
your machine before or after tool calls:

```
             PreToolUse hook
                  ↓
You → Claude → [hook runs] → Tool executes → [hook runs] → Claude
                                                  ↑
                                           PostToolUse hook
```

Hooks have **zero context cost** by default. They can optionally inject feedback
back into context (e.g., a lint error message), but the hook execution itself
is invisible to the model.

---

## Complete Information Flow

```
┌──────────────────────────────────────────────────────────────────┐
│  YOU (CLI or VSCode)                                             │
│  Type a message, press Enter                                     │
└──────────────────┬───────────────────────────────────────────────┘
                   ↓
┌──────────────────────────────────────────────────────────────────┐
│  CLAUDE CODE (local process on your machine)                     │
│                                                                  │
│  1. Construct system prompt                                      │
│     ├── Load CLAUDE.md (all levels, merged)                      │
│     ├── Load auto memory (first 200 lines)                       │
│     ├── Load skill descriptions                                  │
│     ├── Load environment info                                    │
│     └── Load agent instructions (if sub-agent)                   │
│                                                                  │
│  2. Construct messages array                                     │
│     ├── Replay full conversation history                         │
│     ├── Append your new message                                  │
│     └── (Or compress if approaching limit)                       │
│                                                                  │
│  3. Construct tools array                                        │
│     ├── Built-in tools                                           │
│     ├── MCP server tools (via tool search)                       │
│     └── Skill tool                                               │
│                                                                  │
│  4. Send API request ──────────────────────────────────────┐     │
└─────────────────────────────────────────────────────────── │ ────┘
                                                             ↓
┌──────────────────────────────────────────────────────────────────┐
│  CLAUDE API (Anthropic servers)                                  │
│                                                                  │
│  Model receives: { system, messages, tools }                     │
│  Model generates response:                                       │
│                                                                  │
│  Response = {                                                    │
│    id: "msg_...",                                                │
│    role: "assistant",                                            │
│    content: [                                                    │
│      { type: "text", text: "..." },          ← human-readable   │
│      { type: "tool_use", name: "Read", ... } ← action request   │
│    ],                                                            │
│    stop_reason: "end_turn" | "tool_use",     ← controls flow    │
│    usage: { input_tokens, output_tokens,                         │
│             cache_creation_input_tokens,                         │
│             cache_read_input_tokens }        ← token accounting  │
│  }                                                               │
└──────────────────┬───────────────────────────────────────────────┘
                   ↓
┌──────────────────────────────────────────────────────────────────┐
│  CLAUDE CODE (back on your machine)                              │
│                                                                  │
│  Reads stop_reason to decide what to do next:                    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  stop_reason: "tool_use"                                   │  │
│  │                                                            │  │
│  │  For each tool_use block in content[]:                     │  │
│  │    ├── Run PreToolUse hooks                                │  │
│  │    ├── Check permissions (auto-allow or prompt user)       │  │
│  │    ├── Execute tool locally (read file, run bash, etc.)    │  │
│  │    ├── Run PostToolUse hooks                               │  │
│  │    ├── Build tool_result: { tool_use_id, content }         │  │
│  │    └── Append assistant message + tool_result to messages  │  │
│  │                                                            │  │
│  │  → Loop back to step 4 (another API request)               │  │
│  │    The response's content becomes the next assistant        │  │
│  │    message, tool_results become the next user message       │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  stop_reason: "end_turn"                                   │  │
│  │                                                            │  │
│  │  Extract text blocks from content[]                        │  │
│  │  Display to user in CLI/VSCode                             │  │
│  │  Append assistant message to conversation history          │  │
│  │  Wait for next user input                                  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  stop_reason: "tool_use" AND tool is Task (sub-agent)      │  │
│  │                                                            │  │
│  │  Create NEW isolated context:                              │  │
│  │    system: agent instructions + CLAUDE.md                  │  │
│  │    messages: [ { role: "user", content: delegation prompt }]│  │
│  │    tools: [restricted set from agent's tools: field]       │  │
│  │                                                            │  │
│  │  Run sub-agent loop (own API calls, own tool chain)        │  │
│  │  Sub-agent eventually returns stop_reason: "end_turn"      │  │
│  │  Its final text becomes tool_result for parent             │  │
│  │  Parent's messages gets: assistant(tool_use) + tool_result │  │
│  │  → Parent loops back to step 4                             │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### Visualizing one full agentic loop

```
You: "Fix the filter bug"

  ┌─ API call 1 ─────────────────────────────────────────────────┐
  │ → Request:  system + [user: "Fix the filter bug"] + tools    │
  │ ← Response: content: [tool_use: Read(filter.tsx)]            │
  │             stop_reason: "tool_use"                          │
  │             usage: { input: 4200, output: 85 }               │
  └──────────────────────────────────────────────────────────────┘
          ↓ Claude Code reads file locally
  ┌─ API call 2 ─────────────────────────────────────────────────┐
  │ → Request:  system + [user msg, asst tool_use, tool_result]  │
  │ ← Response: content: [text: "Found it", tool_use: Edit(...)] │
  │             stop_reason: "tool_use"                          │
  │             usage: { input: 5100, output: 210 }              │
  └──────────────────────────────────────────────────────────────┘
          ↓ Claude Code executes edit locally
  ┌─ API call 3 ─────────────────────────────────────────────────┐
  │ → Request:  system + [...all prior msgs, edit tool_result]   │
  │ ← Response: content: [text: "Fixed the bug by adding..."]    │
  │             stop_reason: "end_turn"          ← DONE          │
  │             usage: { input: 5500, output: 150 }              │
  └──────────────────────────────────────────────────────────────┘
          ↓ Claude Code displays text to you

You see: "Fixed the bug by adding..."
         (3 API calls happened, you only see the final text)
```

---

## Token Cost Mental Model

Understanding what consumes tokens helps you work efficiently:

```
                         Token Budget (context window)
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  ██████  System prompt (CLAUDE.md, memory, skill descriptions)   │
│  ██      Tool definitions (built-in + MCP)                       │
│  ████████████████████████████████  Conversation history           │
│  ░░░░░░░░░░░░░░░░░░░░░░░░  Available space for new turns        │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

The conversation history block grows with every turn:
- Each file Read adds the file's content
- Each Bash output adds command results
- Each assistant response adds its text
- Each tool call adds its input + result

When available space shrinks to ~5%:
  → Compaction triggers
  → Old tool results dropped first
  → Conversation summarized
  → System prompt preserved
```

### Prompt caching

Claude Code benefits from **prompt caching**. The system prompt (CLAUDE.md,
instructions) is a repeated prefix across turns. Anthropic caches this prefix,
so you're not paying full price for CLAUDE.md on every turn — cached tokens
cost significantly less.

```
Turn 1: system prompt (full price) + messages (full price)
Turn 2: system prompt (CACHED — cheaper) + messages (full price for new parts)
Turn 3: system prompt (CACHED) + messages (partially cached for unchanged parts)
```

---

## Summary Table

| Component            | Where it lives      | Loaded when           | Sent every turn | Survives compaction |
| -------------------- | ------------------- | --------------------- | --------------- | ------------------- |
| CLAUDE.md            | System prompt       | Session start         | Yes             | Yes (always)        |
| Auto memory          | System prompt       | Session start         | Yes             | Yes (always)        |
| Skill descriptions   | System prompt       | Session start         | Yes             | Yes (always)        |
| Skill full content   | Messages (on demand)| When triggered        | Yes (once loaded)| Likely yes          |
| Tool definitions     | Tools array         | Session start         | Yes             | Yes (always)        |
| Conversation history | Messages array      | Accumulated           | Yes             | Summarized          |
| Tool results         | Messages array      | After each tool call  | Yes             | Dropped first       |
| Sub-agent results    | Messages (parent)   | After sub-agent done  | Yes             | Summarized          |
| Hooks                | Outside API         | On tool events        | No (zero cost)  | N/A                 |
