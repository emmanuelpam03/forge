# Logging Policy and Conventions

This document describes the logging conventions used in Forge and how to use the
`lib/logger` helpers to produce structured, consistent logs.

## Goals
- Produce structured JSON logs that are easy to parse and query.
- Standardize event names and metadata to simplify searching and alerting.
- Avoid leaking raw identifiers by hashing sensitive ids.

## Event naming
- Use `snake_case` event names for consistency, e.g. `chat_started`,
  `regenerate_stream_failed`, `metric_recorded`.
- Events should be concise and action-oriented.

## Required metadata
- `event` and `timestamp` are automatically included.
- `service` is auto-injected from `process.env.SERVICE_NAME` or `npm_package_name`.

Optional common fields (recommend including when available):
- `route` or `path`: the API route or page (e.g. `/api/chat/regenerate`).
- `chatId`, `runId`, `messageId`: identifiers (these will be hashed automatically).
- `userId`: hashed identifier for user correlation.
- `level`: log level (`info`, `warn`, `error`, `debug`).

## Usage
Import the helpers from `lib/logger`.

Example:

```ts
import { event } from '@/lib/logger';

event('info', 'chat_started', { chatId: 'abc123', route: '/api/chat' });
```

Or for quick logs:

```ts
import { info } from '@/lib/logger';

info('background_job_started', { job: 'cleanup' });
```

## Implementation notes
- Identifiers (keys containing `id`) that are strings are hashed using
  `lib/logging.hashIdentifierForLogging` to reduce privacy risk while retaining
  correlation ability.
- Prefer `event()` for explicit semantic events and `info/warn/error/debug` for
  general-purpose messages.

## Contributing
- When adding new event names, follow `snake_case` and include enough context
  to be actionable in logs (e.g. `chat_id`, `run_id`).
