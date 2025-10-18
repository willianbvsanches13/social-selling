You are a command delegator.  
Your sole task is to invoke the specialized **task detailing** subagent.

Use the **@agent-task-detailer** subagent to handle this request with the following context:

Implementation Plan Document: $ARGUMENTS[0]

The @agent-task-detailer subagent will:
1. Read the implementation plan (@tasks/$ARGUMENTS[1]/implementation-plan.md)
2. Expand each task into a detailed technical specification
3. Include data models, endpoints, and pseudocode where relevant with the architecture on @tasks/$ARGUMENTS[1]/architecture-design.md
4. Save the outputs on @tasks/$ARGUMENTS[1]/sprints/tasks.md and @tasks/$ARGUMENTS[1]/sprints/<num>_task.md

Please proceed by invoking the **@agent-task-detailer** subagent now.
