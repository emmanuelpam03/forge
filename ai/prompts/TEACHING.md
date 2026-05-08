# Forge Teaching System - Documentation

## Overview

Forge implements an **adaptive teaching system** that automatically adjusts explanation depth, language complexity, and structure based on user context and inferred skill level. The system operates entirely in the backend (no UI controls) and leverages keyword detection, audience inference, and anonymized telemetry for continuous improvement.

## Design Principles

1. **Progressive Disclosure**: Start simple; add complexity only when user signals readiness
2. **Adaptive Depth**: Automatically select beginner, intermediate, or advanced explanation depth
3. **Readability First**: Short paragraphs, meaningful headings, controlled bullet usage
4. **Teaching Intelligence**: Explain "why" and "tradeoffs"; connect to practical relevance
5. **No Textbook Dumping**: Avoid unnecessary jargon and academic wording

## Architecture

### Core Components

```
teaching.prompt.ts
├── TEACHING_PRINCIPLES (readability, depth modes, markers)
├── READABILITY_RULES (formatting discipline)
├── getTeachingInstructionsForDepth() → maps minimal|standard|deep to instructions
└── getReadabilityFormatting() → readability rules for formatter

system.prompt.ts
├── Imports TEACHING_PRINCIPLES
└── Includes as "TEACHING EXCELLENCE" section

mode.prompt.ts
├── Imports getTeachingInstructionsForDepth()
├── Maps controls.teachingDepth to depth-specific instructions
└── Dynamically includes depth-appropriate teaching guidance

formatter.prompt.ts
├── Imports getReadabilityFormatting()
├── Maps response_mode: "teach" to progressive disclosure formatting
└── Enforces "Further detail →", "ADVANCED:", "WHY THIS MATTERS:" markers

router.ts
├── resolveTeachingDepth() → keyword-based + audience-based auto-detection
├── logTeachingDepthTelemetry() → anonymized logging for ML feedback
└── buildPromptSegments() → calls telemetry before response generation

classification.ts
├── normalizeAudienceLevel() → validates beginner|intermediate|expert
└── classifyIntent() → recognizes "teaching" and "explanation" intents
```

### Data Flow

```
User Message
  ↓
[Classification] → Extract: intent, audience_level, response_mode
  ↓
[Router] → Resolve:
  - Response mode (auto-detection from taskCategory)
  - Audience level (keyword cues + classification)
  - Teaching depth (keyword cues + audience level mapping)
  ↓
[Telemetry] → Log (anonymized): (topic_hash, chosen_depth, inferred_audience)
  ↓
[Prompt Composition]
  - System: Include TEACHING_PRINCIPLES
  - Mode: Include depth-specific instructions from teaching.prompt
  - Formatter: Include readability rules + progressive disclosure markers
  ↓
[LLM Generation] → Response with adaptive depth, markers, structure
  ↓
[Sanitizer] → Remove artifacts, preserve structure
  ↓
User sees: Clear, progressive, well-structured explanation
```

## Depth Modes

### MINIMAL (Beginner Audience)

**When triggered:**

- User says: "beginner", "new to", "eli5", "explain like i'm five"
- Or inferred audience = "beginner"

**Characteristics:**

- Simple, everyday language (no jargon)
- One concrete analogy per concept
- Structure: what it is → simple example → why it matters
- ~100 words per concept
- Step-by-step, foundational tone

**Example:** See `ai/prompts/teaching-examples.ts` → `CLOSURE_BEGINNER`

### STANDARD (Intermediate Audience)

**When triggered:**

- No explicit depth keyword (default)
- User context suggests intermediate level
- Or inferred audience = "intermediate"

**Characteristics:**

- Balance clarity with technical accuracy
- 2-3 practical examples
- Structure: what → how → why → tradeoffs → when to use
- Mention benefits and limitations
- Link to related concepts
- Use "Further detail →" for optional content

**Example:** See `ai/prompts/teaching-examples.ts` → `CLOSURE_INTERMEDIATE`

### DEEP (Advanced Audience)

**When triggered:**

- User says: "expert", "advanced", "senior", "principal", "staff"
- Or user says: "explain", "why", "how", "walk me through", "teach me", "break down", "reasoning"
- Or inferred audience = "expert"

**Characteristics:**

- Edge cases, optimization, design philosophy
- Advanced examples with performance implications
- Structure: definition → mechanism → tradeoffs → edge cases → best practices
- Use "ADVANCED:" marker for expert-only sections
- Discuss complexity, memory, constraints
- Explore "why" at design/research level

**Example:** See `ai/prompts/teaching-examples.ts` → `CLOSURE_ADVANCED`

## Auto-Detection Policy

The system infers teaching depth from user message keywords and audience level:

## Progressive Disclosure Markers

Use these text markers to signal optional or advanced content:

### "Further detail →"

For transitioning to optional deeper content in STANDARD and DEEP modes.

```markdown
Closures are a function's memory of its creation environment.

Further detail → When a function is created, it captures a reference
to its lexical environment. Even after the parent function returns,
the inner function can access those variables because they're still
in memory.
```

### "ADVANCED:"

For expert-level content in DEEP mode.

```markdown
## Closure Memory Management (Advanced)

ADVANCED: The V8 engine uses closure-aware garbage collection.
Variables that aren't actually referenced by the closure can still
be collected, even if they're in the enclosing scope. However, this
is engine-implementation-specific.
```

### "WHY THIS MATTERS:"

For explaining practical or strategic importance.

```markdown
WHY THIS MATTERS: Closure memory leaks are rare in small apps but
critical in long-running servers processing thousands of requests.
A single 1MB leak × 10,000 connections = 10GB overhead.
```

## Readability Rules

All teaching responses must follow:

1. **Paragraph length**: 3-4 sentences max (~100 words)
2. **Heading hierarchy**: H2 for sections, H3 for subsections (no deep nesting)
3. **Bullet lists**: Max 5 items; use prose for 6+
4. **Code blocks**: Always use language tags (bash, tsx, js, etc.)
5. **Whitespace**: Blank lines between sections to improve scanning
6. **Active voice**: "Closures let functions remember" not "Functions can be remembered by closures"
7. **Strong verbs**: "Memoization trades memory for speed" not "is a trade between memory and speed"
8. **No filler**: Remove "basically", "actually", "literally", "as you can see"

## Context-Aware Adaptation

Teaching depth adapts to topic category:

### Technical Topics (Programming, Algorithms, Architecture)

- **Beginner**: Focus on syntax, mental models, concrete examples
- **Intermediate**: Design patterns, performance, tradeoffs
- **Advanced**: Complexity analysis, optimization, edge cases

### Scientific Topics (Biology, Physics, Medicine)

- **Beginner**: Analogy-first, simplified mechanism, real-world relevance
- **Intermediate**: Accurate mechanisms, supporting evidence, limitations
- **Advanced**: Research foundations, open questions, measurement techniques

### Business Topics (Finance, Strategy, Operations)

- **Beginner**: High-level frameworks, key definitions, simple examples
- **Intermediate**: Assumptions, sensitivity to variables, risk factors
- **Advanced**: Advanced metrics, constraint analysis, strategic nuance

## Telemetry & ML Feedback

The system logs anonymized teaching choices for ML feedback training:

## Implementation Examples

See `ai/prompts/teaching-examples.ts` for full examples across domains:

1. **JavaScript Closures** (Technical)
   - MINIMAL: Analogy, simple example
   - INTERMEDIATE: Mechanism, memoization, tradeoffs
   - ADVANCED: V8 implementation, memory leaks, design patterns

2. **CRISPR Gene Editing** (Scientific)
   - MINIMAL: Find-and-replace analogy, real-world impact
   - INTERMEDIATE: Mechanism, current applications, off-target effects
   - ADVANCED: Mechanistic constraints, delivery challenges, emerging alternatives

3. **ROI Modeling** (Business)
   - MINIMAL: Simple formula, example, rule of thumb
   - INTERMEDIATE: Calculation, interpretation, practical pitfalls
   - ADVANCED: Probabilistic modeling, NPV/IRR, portfolio optimization

## Testing

Regression tests verify the teaching system:

```bash
pnpm test tests/prompts.regression.test.ts
```

Key assertions:

- ✅ `teaching.prompt.ts` exports TEACHING_PRINCIPLES and READABILITY_RULES
- ✅ `system.prompt.ts` includes TEACHING EXCELLENCE section
- ✅ `formatter.prompt.ts` includes progressive disclosure markers
- ✅ `router.ts` includes auto-detection and telemetry logic
- ✅ All 21 regression tests pass

## Maintenance & Iteration

### Guidelines

1. **Update `teaching.prompt.ts`** when changing:
   - Readability standards
   - Progressive disclosure markers
   - Depth mode definitions

2. **Update `router.ts`** when changing:
   - Keyword thresholds for depth auto-detection
   - Audience level inference logic

3. **Update tests** whenever changing any prompt or routing logic

4. **Monitor telemetry** monthly to detect:
   - Patterns in chosen depth vs. inferred audience
   - Underserved topic categories
   - Effectiveness of auto-detection

### Future Work

- [ ] UI depth selector (behind feature flag) for explicit user override
- [ ] Telemetry API endpoint for ML feedback pipeline
- [ ] Dashboard for telemetry analysis and auto-detection tuning
- [ ] Per-project teaching style preferences (e.g., "this team prefers academic rigor")
- [ ] Multi-language teaching context (e.g., "explain as if teaching 10-year-olds")

## Questions & Troubleshooting

**Q: Why does my response use ADVANCED content when I'm beginner?**
A: The system may have misclassified your audience level. Use explicit keywords: "I'm new to this" or "eli5" for guaranteed beginner mode.

**Q: Why is no telemetry being logged?**
A: Set `NODE_ENV=production` and ensure telemetry endpoint is configured. In dev, check console.debug output.

**Q: Can I override the auto-detected depth?**
A: Not via UI (by design). Explicitly signal depth via keywords: "advanced explanation", "simple walkthrough", etc.

**Q: How do I contribute better teaching examples?**
A: Add to `teaching-examples.ts` with MINIMAL, INTERMEDIATE, DEEP versions. Include domain context and follow the structure demonstrated.
