import { Injectable } from '@nestjs/common';
import { BaseAgent } from './base-agent';
import {
  AgentContext,
  ExecutionPlan,
  TaskSet,
} from '../types/agent-types';
import { ArtifactStore } from '../storage/artifact-store';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class TaskCreatorAgent extends BaseAgent<ExecutionPlan, TaskSet> {
  constructor(artifactStore: ArtifactStore, eventEmitter: EventEmitter2) {
    super(artifactStore, eventEmitter);
  }

  protected async validateInput(input: ExecutionPlan): Promise<void> {
    if (!input.planId) {
      throw new Error('planId é obrigatório');
    }

    if (!input.phases || input.phases.length === 0) {
      throw new Error('Fases são obrigatórias para criar tarefas');
    }
  }

  protected async validateOutput(output: TaskSet): Promise<void> {
    if (!output.taskSetId) {
      throw new Error('taskSetId não foi gerado');
    }

    if (!output.tasks || output.tasks.length === 0) {
      throw new Error('Nenhuma tarefa foi criada');
    }

    if (!output.executionOrder || output.executionOrder.length === 0) {
      throw new Error('Ordem de execução não foi definida');
    }
  }

  protected getNextAgent(output: TaskSet, context: AgentContext): string {
    return 'ExecutorAgent';
  }

  protected getArtifactPath(context: AgentContext): string {
    return `${context.featureId}/03-tasks/tasks.json`;
  }

  protected getArtifactFilename(): string {
    return 'tasks.json';
  }

  protected async process(
    input: ExecutionPlan,
    context: AgentContext,
  ): Promise<TaskSet> {
    this.logger.log(`Criando tarefas para plano: ${input.planId}`);

    // Construir prompt para Claude
    const prompt = this.buildTaskCreationPrompt(input);

    // Chamar Claude
    const claudeResponse = await this.callClaude(prompt);

    // Parsear resposta
    const taskData = this.parseClaudeJSON<any>(claudeResponse);

    // Construir TaskSet estruturado
    const taskSet: TaskSet = {
      taskSetId: this.generateTaskSetId(context),
      featureId: input.featureId,
      planId: input.planId,
      timestamp: new Date().toISOString(),
      creator: {
        agentVersion: this.agentVersion,
        creationDate: new Date().toISOString().split('T')[0],
      },
      summary: {
        totalTasks: taskData.tasks?.length || 0,
        byCategory: this.countByField(taskData.tasks, 'category'),
        byPriority: this.countByField(taskData.tasks, 'priority'),
      },
      tasks: taskData.tasks || [],
      executionOrder: taskData.executionOrder || this.generateExecutionOrder(taskData.tasks),
      nextAgent: 'ExecutorAgent',
    };

    return taskSet;
  }

  private buildTaskCreationPrompt(input: ExecutionPlan): string {
    return `
Com base neste plano de execução, decomponha em tarefas atômicas e executáveis:

**Plano**: ${input.planId}

**Fases**:
${input.phases.map((p) => `${p.phaseId}. ${p.name} (${p.estimatedHours}h) - Componentes: ${p.components.join(', ')}`).join('\n')}

**Componentes**:
${input.architecture.components.map((c) => `- ${c.name} (${c.action} ${c.type})`).join('\n')}

**Critérios de Aceitação**:
${input.acceptanceCriteria.map((ac) => `- ${ac.id}: ${ac.description}`).join('\n')}

Retorne um JSON com a seguinte estrutura:

{
  "tasks": [
    {
      "taskId": "TASK-001",
      "phaseId": "P1",
      "title": "Título claro e específico da tarefa",
      "description": "O que precisa ser feito em detalhes",
      "category": "backend | frontend | database | testing | documentation | infrastructure",
      "priority": "critical | high | medium | low",
      "estimatedHours": 2,
      "dependencies": ["TASK-XXX", "TASK-YYY"],
      "files": [
        "src/path/to/file.ts"
      ],
      "dod": [
        "Critério 1 de conclusão",
        "Critério 2 de conclusão"
      ],
      "technicalDetails": {
        "packages": ["lista de pacotes npm se necessário"],
        "envVars": ["lista de variáveis de ambiente se necessário"],
        "migrations": "nome da migration se aplicável"
      }
    }
  ],
  "executionOrder": ["TASK-001", "TASK-002", "TASK-003", ...]
}

**REGRAS**:
- Cada tarefa deve ser atômica (15min - 2h)
- Tarefas devem seguir ordem lógica das fases
- Dependencies devem estar na executionOrder antes da tarefa dependente
- DoD (Definition of Done) deve ser claro e verificável
- Files deve listar caminhos reais dos arquivos a criar/modificar
- Database tasks (migrations) devem vir primeiro
- Backend antes de Frontend
- Tests devem vir após implementação

**IMPORTANTE**: Decomponha cada componente do plano em 2-4 tarefas específicas.

Retorne APENAS o JSON, sem explicações.
`;
  }

  private countByField(tasks: any[], field: string): Record<string, number> {
    if (!tasks) return {};

    return tasks.reduce((acc, task) => {
      const value = task[field];
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});
  }

  private generateExecutionOrder(tasks: any[]): string[] {
    if (!tasks) return [];

    // Ordenação simples: por phaseId e então por taskId
    return tasks
      .sort((a, b) => {
        if (a.phaseId !== b.phaseId) {
          return a.phaseId.localeCompare(b.phaseId);
        }
        return a.taskId.localeCompare(b.taskId);
      })
      .map((t) => t.taskId);
  }

  private generateTaskSetId(context: AgentContext): string {
    const timestamp = Date.now().toString().slice(-6);
    return `TASKS-${context.featureId.split('-')[2]}-${timestamp}`;
  }

  protected getSystemPrompt(): string {
    return `Você é o Task Creator Agent, especializado em decomposição de trabalho técnico.

Seu papel é:
1. Decompor planos em tarefas atômicas e executáveis (15min - 2h cada)
2. Definir dependências claras entre tarefas
3. Ordenar tarefas considerando dependências e lógica de implementação
4. Especificar arquivos exatos a criar/modificar para cada tarefa
5. Definir DoD (Definition of Done) objetivo e verificável

Ordem típica de implementação:
1. Database (migrations, schemas)
2. Backend (entities, DTOs, services, controllers)
3. Frontend (components, hooks, contexts)
4. Testing (unit, integration, E2E)
5. Documentation (README, API docs, Swagger)

Contexto técnico:
- Estrutura de diretórios: src/[module]/[entities|dto|services|controllers|guards]/
- Testes: src/[module]/*.spec.ts e test/e2e/*.e2e-spec.ts
- Migrations: src/database/migrations/

Pense como um desenvolvedor sênior que planeja trabalho de forma granular e executável.`;
  }
}
