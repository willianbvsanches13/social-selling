import { Injectable } from '@nestjs/common';
import { BaseAgent } from './base-agent';
import {
  AgentContext,
  TaskSet,
} from '../types/agent-types';
import { ArtifactStore } from '../storage/artifact-store';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { promises as fs } from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface ExecutionReport {
  executionId: string;
  featureId: string;
  taskSetId: string;
  timestamp: string;
  executor: {
    agentVersion: string;
    executionDate: string;
  };
  summary: {
    totalTasks: number;
    completed: number;
    failed: number;
    skipped: number;
  };
  results: TaskExecutionResult[];
  testResults: {
    unitTests: {
      passed: number;
      failed: number;
      skipped: number;
    };
  };
  nextAgent: string;
}

interface TaskExecutionResult {
  taskId: string;
  status: 'completed' | 'failed' | 'skipped';
  duration: number;
  filesModified: string[];
  testsRun: number;
  testsPassed: number;
  error?: string;
  changes: {
    linesAdded: number;
    linesRemoved: number;
  };
}

@Injectable()
export class ExecutorAgent extends BaseAgent<TaskSet, ExecutionReport> {
  private readonly projectRoot: string;

  constructor(artifactStore: ArtifactStore, eventEmitter: EventEmitter2) {
    super(artifactStore, eventEmitter);
    this.projectRoot = process.cwd();
  }

  protected async validateInput(input: TaskSet): Promise<void> {
    if (!input.taskSetId) {
      throw new Error('taskSetId é obrigatório');
    }

    if (!input.tasks || input.tasks.length === 0) {
      throw new Error('Nenhuma tarefa para executar');
    }

    if (!input.executionOrder || input.executionOrder.length === 0) {
      throw new Error('Ordem de execução não definida');
    }
  }

  protected async validateOutput(output: ExecutionReport): Promise<void> {
    if (!output.executionId) {
      throw new Error('executionId não foi gerado');
    }

    if (output.summary.failed > 0) {
      this.logger.warn(`${output.summary.failed} tarefas falharam na execução`);
    }

    if (output.summary.completed === 0) {
      throw new Error('Nenhuma tarefa foi completada com sucesso');
    }
  }

  protected getNextAgent(output: ExecutionReport, context: AgentContext): string {
    return 'E2ETesterAgent';
  }

  protected getArtifactPath(context: AgentContext): string {
    return `${context.featureId}/04-execution/execution-report.json`;
  }

  protected getArtifactFilename(): string {
    return 'execution-report.json';
  }

  protected async process(
    input: TaskSet,
    context: AgentContext,
  ): Promise<ExecutionReport> {
    this.logger.log(`Executando ${input.tasks.length} tarefas para: ${input.taskSetId}`);

    const results: TaskExecutionResult[] = [];
    let completed = 0;
    let failed = 0;
    let skipped = 0;

    // Executar tarefas na ordem definida
    for (const taskId of input.executionOrder) {
      const task = input.tasks.find((t) => t.taskId === taskId);
      if (!task) {
        this.logger.warn(`Tarefa ${taskId} não encontrada no taskSet`);
        skipped++;
        continue;
      }

      this.logger.log(`Executando tarefa: ${task.taskId} - ${task.title}`);

      try {
        const result = await this.executeTask(task, context);
        results.push(result);

        if (result.status === 'completed') {
          completed++;
        } else if (result.status === 'failed') {
          failed++;
        } else {
          skipped++;
        }
      } catch (error) {
        this.logger.error(`Erro ao executar tarefa ${task.taskId}: ${error.message}`);
        failed++;
        results.push({
          taskId: task.taskId,
          status: 'failed',
          duration: 0,
          filesModified: [],
          testsRun: 0,
          testsPassed: 0,
          error: error.message,
          changes: { linesAdded: 0, linesRemoved: 0 },
        });
      }
    }

    // Executar testes unitários
    const testResults = await this.runUnitTests();

    const report: ExecutionReport = {
      executionId: this.generateExecutionId(context),
      featureId: input.featureId,
      taskSetId: input.taskSetId,
      timestamp: new Date().toISOString(),
      executor: {
        agentVersion: this.agentVersion,
        executionDate: new Date().toISOString().split('T')[0],
      },
      summary: {
        totalTasks: input.tasks.length,
        completed,
        failed,
        skipped,
      },
      results,
      testResults,
      nextAgent: 'E2ETesterAgent',
    };

    return report;
  }

  private async executeTask(
    task: any,
    context: AgentContext,
  ): Promise<TaskExecutionResult> {
    const startTime = Date.now();
    const filesModified: string[] = [];

    try {
      // Construir prompt para Claude gerar código
      const prompt = this.buildTaskExecutionPrompt(task);

      // Chamar Claude para gerar código
      const claudeResponse = await this.callClaude(prompt);

      // Parsear resposta (esperamos JSON com arquivos e conteúdo)
      const codeChanges = this.parseClaudeJSON<any>(claudeResponse);

      // Aplicar mudanças nos arquivos
      for (const fileChange of codeChanges.files || []) {
        const filePath = path.join(this.projectRoot, fileChange.path);
        await this.applyFileChange(filePath, fileChange);
        filesModified.push(fileChange.path);
      }

      // Executar comandos se houver (npm install, migrations, etc)
      if (codeChanges.commands && codeChanges.commands.length > 0) {
        for (const command of codeChanges.commands) {
          this.logger.debug(`Executando comando: ${command}`);
          await execAsync(command, { cwd: this.projectRoot });
        }
      }

      const duration = Date.now() - startTime;

      return {
        taskId: task.taskId,
        status: 'completed',
        duration,
        filesModified,
        testsRun: 0,
        testsPassed: 0,
        changes: {
          linesAdded: codeChanges.stats?.linesAdded || 0,
          linesRemoved: codeChanges.stats?.linesRemoved || 0,
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        taskId: task.taskId,
        status: 'failed',
        duration,
        filesModified,
        testsRun: 0,
        testsPassed: 0,
        error: error.message,
        changes: { linesAdded: 0, linesRemoved: 0 },
      };
    }
  }

  private buildTaskExecutionPrompt(task: any): string {
    return `
Execute esta tarefa de desenvolvimento:

**Task ID**: ${task.taskId}
**Título**: ${task.title}
**Descrição**: ${task.description}
**Categoria**: ${task.category}
**Arquivos**: ${task.files?.join(', ') || 'Não especificado'}

**Definition of Done**:
${task.dod?.map((d: string) => `- ${d}`).join('\n') || '- Implementação completa'}

**Detalhes Técnicos**:
${JSON.stringify(task.technicalDetails || {}, null, 2)}

Retorne um JSON com a seguinte estrutura:

{
  "files": [
    {
      "path": "caminho/relativo/do/arquivo.ts",
      "action": "create | modify | delete",
      "content": "conteúdo completo do arquivo aqui..."
    }
  ],
  "commands": [
    "npm install pacote (se necessário)",
    "npx typeorm migration:run (se necessário)"
  ],
  "stats": {
    "linesAdded": 50,
    "linesRemoved": 10
  },
  "summary": "Breve resumo do que foi implementado"
}

**REGRAS IMPORTANTES**:
1. Para arquivos TypeScript, use sintaxe correta e imports necessários
2. Para NestJS, siga padrões: @Injectable(), decorators, DI
3. Para testes, use Jest com describe/it/expect
4. Siga padrões do projeto: Repository, Service, Controller, DTO
5. Adicione tratamento de erros adequado
6. Use tipos TypeScript explícitos
7. Para banco de dados, crie migrations TypeORM corretas

Retorne APENAS o JSON, sem explicações.
`;
  }

  private async applyFileChange(filePath: string, change: any): Promise<void> {
    const dir = path.dirname(filePath);

    // Criar diretório se não existir
    await fs.mkdir(dir, { recursive: true });

    if (change.action === 'create' || change.action === 'modify') {
      await fs.writeFile(filePath, change.content, 'utf-8');
      this.logger.debug(`Arquivo ${change.action === 'create' ? 'criado' : 'modificado'}: ${filePath}`);
    } else if (change.action === 'delete') {
      try {
        await fs.unlink(filePath);
        this.logger.debug(`Arquivo deletado: ${filePath}`);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }
    }
  }

  private async runUnitTests(): Promise<any> {
    try {
      this.logger.log('Executando testes unitários...');

      const { stdout } = await execAsync('npm run test:cov -- --passWithNoTests', {
        cwd: this.projectRoot,
        timeout: 120000, // 2 minutos
      });

      // Parsear output do Jest (simplificado)
      const passedMatch = stdout.match(/(\d+) passed/);
      const failedMatch = stdout.match(/(\d+) failed/);
      const skippedMatch = stdout.match(/(\d+) skipped/);

      return {
        unitTests: {
          passed: passedMatch ? parseInt(passedMatch[1]) : 0,
          failed: failedMatch ? parseInt(failedMatch[1]) : 0,
          skipped: skippedMatch ? parseInt(skippedMatch[1]) : 0,
        },
      };
    } catch (error) {
      this.logger.warn(`Testes unitários falharam: ${error.message}`);
      return {
        unitTests: {
          passed: 0,
          failed: 1,
          skipped: 0,
        },
      };
    }
  }

  private generateExecutionId(context: AgentContext): string {
    const timestamp = Date.now().toString().slice(-6);
    return `EXEC-${context.featureId.split('-')[2]}-${timestamp}`;
  }

  protected getSystemPrompt(): string {
    return `Você é o Executor Agent, especializado em implementação de código.

Seu papel é:
1. Transformar tarefas técnicas em código funcional e de qualidade
2. Seguir padrões de código do projeto (NestJS, TypeScript, TypeORM)
3. Criar código limpo, testável e bem estruturado
4. Adicionar imports corretos e dependências necessárias
5. Seguir princípios SOLID e boas práticas

Contexto técnico:
- Stack: NestJS (backend), TypeScript, TypeORM, PostgreSQL
- Testes: Jest com @nestjs/testing
- Padrões: Repository, Service, Controller, DTO, Guards, Decorators
- Estrutura: src/[module]/[entities|dto|services|controllers]/

Guidelines:
- Use dependency injection do NestJS
- Sempre adicione tratamento de erros
- Valide DTOs com class-validator
- Use tipos TypeScript explícitos (nunca any)
- Siga convenções de nomenclatura: PascalCase para classes, camelCase para métodos
- Para APIs REST, use decorators corretos (@Get, @Post, @Body, @Param)

Gere código production-ready que passe em code review.`;
  }
}
