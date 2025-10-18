# [TASK-ID]: [Task Name]

**Priority:** P0/P1/P2
**Effort:** [X] hours
**Day:** [Day number]
**Dependencies:** [TASK-IDs]
**Domain:** [Domain Name]

---

## Overview

[2-3 sentence description of what this task accomplishes and why it's important]

---

## Data Models

### [Entity/Model Name]

```typescript
// File: /path/to/entity/file.ts

export interface EntityName {
  id: string;
  // ... other fields
  createdAt: Date;
  updatedAt: Date;
}
```

### [DTO/Type Name]

```typescript
// File: /path/to/dto/file.ts

export class DtoName {
  @ApiProperty({ example: 'value', description: 'Field description' })
  @IsString()
  fieldName: string;
}
```

---

## API Endpoints

### [METHOD] /path/to/endpoint

**Description:** [What this endpoint does]

**Request:**
```typescript
{
  "field": "value"
}
```

**Response ([Status Code]):**
```typescript
{
  "data": "value"
}
```

**Errors:**
- [Status]: [Error description]

---

## Implementation Approach

### Phase 1: [Phase Name] ([Time estimate])

```typescript
// Code example or pseudocode
```

**Steps:**
1. [Step description]
2. [Step description]

### Phase 2: [Phase Name] ([Time estimate])

```typescript
// Code example or pseudocode
```

**Steps:**
1. [Step description]
2. [Step description]

### Phase 3: [Phase Name] ([Time estimate])

[Continue with additional phases as needed]

---

## Files to Create

```
/path/to/
├── module/
│   ├── file1.ts
│   ├── file2.ts
│   └── subfolder/
│       └── file3.ts
```

### /path/to/file1.ts
```typescript
// File content example (if helpful)
```

---

## Dependencies

**Prerequisites:**
- [TASK-ID] ([Task name])
- [Service/Infrastructure requirement]

**Blocks:**
- [TASK-ID] ([Task name])
- [TASK-ID] ([Task name])

---

## Acceptance Criteria

- [ ] [Specific, measurable criterion]
- [ ] [Specific, measurable criterion]
- [ ] [Specific, measurable criterion]
- [ ] [Can perform specific action]
- [ ] [System behaves correctly under condition]
- [ ] [Error handling works for scenario]
- [ ] [Performance meets target]
- [ ] [Security requirement met]
- [ ] [All tests passing]
- [ ] [Documentation complete]

---

## Testing Procedure

```bash
# 1. Test description
[command or action]

# Expected: [expected outcome]

# 2. Test description
[command or action]

# Expected: [expected outcome]

# Continue with additional tests...
```

---

## Rollback Plan

[If applicable - steps to rollback if deployment fails]

```bash
# Steps to rollback
```

---

## Security/Performance Considerations

[If applicable - important security or performance notes]

1. **[Consideration Category]:** [Details]
2. **[Consideration Category]:** [Details]

---

## Cost Estimate

- **[Resource Type]:** [Cost]
- **Time Investment:** [X] hours
- **Total Additional Cost:** $[Amount]

---

## Related Documents

- Architecture Design: `/tasks/social-selling/architecture-design.md`
- Implementation Plan: `/tasks/social-selling/implementation-plan.md`
- Previous Tasks: [TASK-IDs]
- Next Tasks: [TASK-IDs]

---

**Task Status:** Ready for Implementation
**Last Updated:** 2025-10-18
**Prepared By:** Agent Task Detailer

---

## Template Usage Notes

### When creating a new detailed task:

1. **Copy this template** and rename to `[TASK-ID]_task.md`
2. **Fill in all sections** with task-specific details
3. **Include concrete examples** in code blocks (not just placeholders)
4. **Provide actual file paths** from the architecture design
5. **Write specific acceptance criteria** that can be verified
6. **Include realistic testing procedures** with actual commands
7. **Reference architecture decisions** from architecture-design.md
8. **Cross-reference dependencies** accurately

### Section Guidelines:

#### Overview
- Should be understandable by any developer
- Include "why" not just "what"
- Reference architectural context

#### Data Models
- Include complete TypeScript interfaces
- Show validation decorators
- Document relationships between entities
- Include database schema if applicable

#### API Endpoints
- Full request/response examples
- All possible error codes
- Authentication requirements
- Rate limiting if applicable

#### Implementation Approach
- Break into logical phases (usually 3-5)
- Each phase should be 30min - 2hour chunks
- Include time estimates
- Provide pseudocode or actual code patterns
- Reference similar implementations from architecture

#### Files to Create
- Complete file tree structure
- Include sample code for critical files
- Show imports and dependencies
- Follow project structure from architecture

#### Acceptance Criteria
- Every criterion must be testable
- Include positive and negative tests
- Cover functional and non-functional requirements
- Should map to testing procedure

#### Testing Procedure
- Actual commands that can be run
- Include expected output
- Cover happy path and error cases
- Test all acceptance criteria

### Quality Checklist:

- [ ] All code examples use correct syntax
- [ ] File paths match architecture structure
- [ ] Dependencies accurately listed
- [ ] Acceptance criteria specific and measurable
- [ ] Testing procedure comprehensive
- [ ] Security considerations included (if relevant)
- [ ] Performance targets defined (if relevant)
- [ ] Cost estimate realistic
- [ ] Related documents linked

### Integration with Architecture:

Every task should reference:
- Relevant section from architecture-design.md
- Technology choices explained in architecture
- Design patterns specified in architecture
- Infrastructure components from architecture diagrams
- Data flow from sequence diagrams
