You are an AI assistant responsible for managing a software development project. Your task is to identify the next available task, perform necessary setup, and prepare to begin work on that task. You will be provided with two key pieces of information:

<requirements>
- **YOU MUST** use Context7 mcp to get informations about libraries
</requirements>

<arguments>$ARGUMENTS</arguments>
<arguments_table>
| Argument  | Description     | Example           |
|-----------|-----------------|-------------------|
| --slug    | Slug identifier | --slug=authsystem |
| --task    | Task identifier | --task=BE-001     |
</arguments_table>
<task_info>
Task: @tasks/[$slug]/[$task]_task.md
</task_info>
<architecture_design>
Architecture Designer: @tasks/[$slug]/architecture-design.md
</architecture_design>
<implementation_plan>
Implementation plan: @tasks/[$slug]/implementation-plan.md
</implementation_plan>

<project_rules>@rules</project_rules>

<requirements>
- **YOU MUST** need to start the implementation right after the entire process above
</requirements>

1. Scan the task directories provided in @tasks/[$slug]/implementation-plan.md for task files.
2. Identify the next uncompleted task by finding the first unchecked checkbox in the task files.
3. Once you've identified the next task, perform the following pre-task setup:
   a. Read the task definition from <task_info>
   b. Review the Architecture Designer context from <architecture_design>
   c. Check the Implementation plan requirements from <implementation_plan>
   d. Read the specific task file to understand what needs to be done in the task
   e. Understand dependencies from previously completed tasks

4. After completing the pre-task setup, analyze the information you've gathered. Wrap your analysis in <task_analysis> tags, considering the following:
   - List out the task files you found and quote relevant sections from each file
   - The main objectives of the task
   - How the task fits into the broader project context
   - Any potential challenges, risks, or dependencies
   - How the task aligns with the project rules and standards
   - Brainstorm possible solutions or approaches to the task

5. Provide a summary of the task and its requirements in the following format:

<task_summary>
Task ID: [Provide the task ID or number]
Task Name: [Provide the name or brief description of the task]
PRD Context: [Summarize key points from the PRD]
Tech Spec Requirements: [List the main technical requirements]
Dependencies: [List any dependencies on previous tasks]
Main Objectives: [Outline the primary goals of the task]
Potential Risks/Challenges: [List any identified risks or challenges]
</task_summary>

6. Next, provide a plan for approaching the task:

<task_approach>
1. [First step in approaching the task]
2. [Second step in approaching the task]
3. [Continue with additional steps as needed]
</task_approach>

Important Notes:

- Always verify against the PRD, tech specs, and task file. Do not make assumptions.
- Implement proper solutions without using workarounds, especially in tests.
- Adhere to all established project standards as outlined in the <project_rules> provided.
- Do not consider the task complete until you've followed the @.claude/commands/task-review.md process.

After providing the task summary and approach, immediately begin implementing the task:

<task_implementation>
Now I will begin implementing this task following the approach outlined above.
</task_implementation>

Then proceed to actually implement the task by:
- Running necessary commands
- Making code changes
- Following the established project patterns
- Ensuring all requirements are met
- ask to user execute bash commands when needed and wait the output to continue

<requirements>
- **YOU MUST** need to start the implementation right after the entire process above
- **YOU MUST** use Context7 mcp to get informations about libraries
</requirements>

<finish_task>
- **YOU MUST** Once the implementation is complete, I will follow run type-check and testing procedures for all project even if the task changes are limited to a specific module or component. if any issues are found you will need to fix them before considering the task done.
- **YOU MUST** you will create a commit with a detailed message summarizing the changes made, referencing the task ID.
</finish_task>