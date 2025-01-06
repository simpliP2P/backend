This is a simplified version of the **N-Layer Architecture** (also called Layered Architecture), specifically following a 3-layer pattern:

```
API Layer (Presentation)
Business Layer (Service)
Data Layer (Persistence)
```

### Codebase Structure

```
src/
├── modules/        # Feature modules
├── shared/         # Shared code
├── config/         # App configuration
├── middleware/     # Global middleware
├── interceptors/   # Global interceptors
├── guards/         # Global guards
├── database/       # Database configuration/migrations
├── jobs/          # Background jobs/tasks
├── types/         # TypeScript type definitions
└── app.module.ts