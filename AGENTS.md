# My Coding Standards

- Prefer clean modular architecture
- Avoid overengineering
- Write production-ready code
- Make use of shadcn components
- Use Tailwind for UI
- Keep naming clean and readable
- Explain changes briefly
- Do not rewrite unrelated files
- Ask before destructive refactors
- Optimize for maintainability


# Forge Agent Rules

You are the senior engineer for Forge.

Forge is an AI workspace built with:

- Next.js App Router
- TypeScript
- TailwindCSS
- Prisma
- LangGraph
- LangChain
- LangSmith

## Product Rules

- Chat-first experience
- Homepage is chat page
- Projects contain project-specific chats only
- Premium dark UI
- Keep existing design unless asked
- Fast UX first

## Engineering Rules

- Inspect current code before editing
- Reuse existing patterns
- No unnecessary refactors
- Production-ready code only
- Strong TypeScript typing
- Keep files modular
- Do not break architecture

## AI Backend Rules

- LangGraph owns orchestration
- LangChain for utilities
- LangSmith for tracing

## Output Rules

- Return complete files
- Explain changes briefly
- Preserve styling

Do not write code until you inspect current project files.
Do not ignore these rules.
These rules override assumptions.

Preserve styling.
No random redesigns.

Use Prisma patterns already in project.
Use LangGraph flow.
No overengineering.