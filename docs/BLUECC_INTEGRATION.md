# Blue.cc Integration for Writers Voice

## Overview

Writers Voice uses [Blue.cc](https://blue.cc) as its cloud backend for storing and syncing all user-created content. Blue.cc is a project management platform that provides a GraphQL API, which we leverage to store:

- **Voice Journey** - User's writing progression through phases (Stone → Transfer → Application → Autonomous)
- **Books** - User's book projects with metadata
- **Chapters** - Chapter content and organization
- **Community/Cohort** - Future community features

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Writers Voice App                      │
│                                                         │
│  ┌─────────────────┐    ┌────────────────────────────┐  │
│  │   Zustand Store │◄───│  Blue.cc Service Layer     │  │
│  │  (useBlueStore) │    │                            │  │
│  └─────────────────┘    │  ┌──────────────────────┐  │  │
│                         │  │ core.ts (GraphQL)    │  │  │
│                         │  │ books.ts             │  │  │
│                         │  │ chapters.ts          │  │  │
│                         │  │ voiceJourney.ts      │  │  │
│                         │  │ metadata.ts          │  │  │
│                         │  └──────────────────────┘  │  │
│                         └─────────────┬──────────────┘  │
└───────────────────────────────────────┼─────────────────┘
                                        │ GraphQL
                                        ▼
                             ┌─────────────────────┐
                             │    Blue.cc API      │
                             │ api.blue.cc/graphql │
                             └─────────────────────┘
```

## Blue.cc Data Model

Blue.cc uses a hierarchical structure:

```
Company (Organization)
  └── Project (Workspace)
        └── TodoList (Container)
              └── Todo (Item)
                    ├── title
                    ├── text (description)
                    ├── done (completion status)
                    ├── tags
                    └── customFields
```

### How Writers Voice Maps to Blue.cc

| Writers Voice | Blue.cc Entity | List Name |
|---------------|----------------|-----------|
| Voice Journey | Todo | `WritersVoice_Journeys` |
| Books | Todo | `WritersVoice_Books` |
| Chapters | Todo (child) | `WritersVoice_Books` |
| Community | Todo | `WritersVoice_Community` |

## PMT Pattern: Metadata Storage

Since Blue.cc's native fields are limited, we use the **PMT (Project Management Tool) Pattern** to store extended metadata. This embeds Base64-encoded JSON in the todo's `text` field:

```
Human-readable description here

---WV-META---
eyJ1aWQiOiJ1c2VyMTIzIiwiY3AiOiJzdG9uZSIsInBzZCI6IjIwMjYtMDItMDQifQ==
```

The metadata section contains compressed JSON:
```json
{
  "uid": "user123",      // User ID
  "cp": "stone",         // Current phase
  "psd": "2026-02-04",   // Phase start date
  "wip": 1,              // Words in phase
  "sd": {...},           // Session data
  "uf": [...],           // Unlocked features
  "rs": [...]            // Resonance scores
}
```

## GraphQL API Integration

### Authentication

Blue.cc uses token-based authentication:

```typescript
headers: {
  'X-Bloo-Token-ID': 'your_token_id',
  'X-Bloo-Token-Secret': 'your_secret_id',
  'Content-Type': 'application/json'
}
```

### Key API Discoveries

Through GraphQL introspection, we discovered the actual Blue.cc schema:

#### Query Pattern (Critical)

**Wrong** - This query doesn't exist:
```graphql
query GetTodos($listId: String!) {
  todos(todoListId: $listId) { ... }  # ❌ Invalid
}
```

**Correct** - Use `todoList(id)` to access todos:
```graphql
query GetTodos($todoListId: String!) {
  todoList(id: $todoListId) {
    todos {
      id
      title
      text
      html
      done
      position
      tags { id title color }
      customFields { id name value }
      createdAt
      updatedAt
    }
  }
}
```

#### Field Name Differences

| Context | Field Name | Notes |
|---------|------------|-------|
| CreateTodoInput | `description` | For creating new todos |
| EditTodoInput | `text` | For updating existing todos |
| Todo (output) | `text` | Reading todo description |
| Todo (output) | `done` | NOT `completed` |

#### Mutations

**Create Todo:**
```graphql
mutation CreateTodo($input: CreateTodoInput!) {
  createTodo(input: $input) {
    id title text done position createdAt updatedAt
  }
}
# Input uses 'description' field, NOT 'text'
```

**Edit Todo:**
```graphql
mutation EditTodo($input: EditTodoInput!) {
  editTodo(input: $input) {
    id title text done position updatedAt
  }
}
# Input uses 'text' field, requires 'todoId'
```

**Delete Todo:**
```graphql
mutation DeleteTodo($input: DeleteTodoInput!) {
  deleteTodo(input: $input) {
    success
  }
}
# Input: { todoId: "..." }
```

**Toggle Done Status:**
```graphql
mutation ToggleDone($todoId: String!) {
  updateTodoDoneStatus(todoId: $todoId) {
    id done
  }
}
# Note: This TOGGLES the status, doesn't set it
```

## Service Layer

### core.ts

The central GraphQL client that handles:
- Authentication and headers
- Workspace discovery (Company → Project → TodoLists)
- CRUD operations for todos
- Field mapping (`done` ↔ `completed`)

Key methods:
- `initialize(config)` - Set up GraphQL client
- `ensureWorkspace()` - Discover/create required lists
- `getTodos(listId)` - Fetch all todos from a list
- `createTodo(listId, title, text)` - Create new todo
- `updateTodo(todoId, updates)` - Update todo fields
- `deleteTodo(todoId)` - Remove a todo

### voiceJourney.ts

Manages the user's writing journey:
- Tracks current phase (stone/transfer/application/autonomous)
- Records session data and word counts
- Manages feature unlocks based on progress
- Stores resonance scores

### books.ts & chapters.ts

Handle book project storage:
- Book metadata (title, genre, target audience)
- Chapter organization and content
- Word count tracking

### metadata.ts

Utilities for PMT pattern:
- `encodeMetadata(data)` - Compress and Base64 encode
- `decodeMetadata(text)` - Extract and parse metadata
- Uses `---WV-META---` marker to separate description from metadata

## Configuration

### Environment Variables

```env
# Required
VITE_BLUE_TOKEN_ID=your_token_id
VITE_BLUE_SECRET_ID=your_secret_id

# Optional (recommended for production)
VITE_BLUE_JOURNEY_LIST_ID=list_id_for_journeys
VITE_BLUE_BOOKS_LIST_ID=list_id_for_books
VITE_BLUE_COHORT_LIST_ID=list_id_for_community
```

### Auto-Discovery Mode

If list IDs aren't configured, the service will:
1. Query existing todo lists in the project
2. Find or create lists with `WritersVoice_*` prefix
3. Cache the IDs for subsequent requests

⚠️ **Production Note**: Always configure list IDs explicitly for consistency across deployments.

## Error Handling

The service returns `ApiResponse<T>` objects:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

All GraphQL errors are caught and logged with `[Blue.cc]` prefix for easy debugging.

## Sync Flow

1. **Connect**: Initialize client with credentials
2. **Discover**: Find company/project from `recentProjects` query
3. **Setup**: Ensure required todo lists exist
4. **Load**: Fetch journey, books, chapters in parallel
5. **Store**: Update Zustand store with loaded data
6. **Sync**: On changes, update Blue.cc via mutations

## Files

```
src/services/bluecc/
├── core.ts          # GraphQL client, CRUD operations
├── types.ts         # TypeScript interfaces
├── books.ts         # Book management
├── chapters.ts      # Chapter management
├── voiceJourney.ts  # Journey/phase tracking
└── metadata.ts      # PMT pattern utilities
```

## Troubleshooting

### Common Issues

1. **GRAPHQL_VALIDATION_FAILED**: Check field names match the schema
2. **400 Bad Request**: Verify query structure (use `todoList(id)` pattern)
3. **Todo not found**: Ensure list IDs are correct
4. **Metadata corruption**: Check Base64 encoding/decoding

### Debug Logging

All Blue.cc operations log with `[Blue.cc]` prefix:
```
[Blue.cc] Client initialized
[Blue.cc] Workspace found: { company, project }
[Blue.cc] Lists ready: { journeyListId, booksListId, cohortListId }
[Blue.cc] Query error: ...
```

## References

- [Blue.cc Platform](https://blue.cc)
- [GraphQL Documentation](https://graphql.org/learn/)
- [BLUECC_BACKEND_GUIDE.md](./BLUECC_BACKEND_GUIDE%20copy.md) - Full API reference

---

*Last Updated: 2026-02-04*
*Integration Version: 1.0*
