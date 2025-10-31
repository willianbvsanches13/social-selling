import { Injectable } from '@nestjs/common';
import { BaseAgent } from './base-agent';
import { AgentContext } from '../types/agent-types';
import { ArtifactStore } from '../storage/artifact-store';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

interface ExecutionReport {
  executionId: string;
  featureId: string;
  taskSetId: string;
  summary: {
    totalTasks: number;
    completed: number;
    failed: number;
  };
  results: any[];
}

interface TestResults {
  testResultsId: string;
  featureId: string;
  executionId: string;
  timestamp: string;
  tester: {
    agentVersion: string;
    testDate: string;
  };
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
  };
  e2eTests: {
    passed: number;
    failed: number;
    skipped: number;
    testFiles: string[];
  };
  failures: TestFailure[];
  coverage: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
  recommendation: 'approve' | 'refine';
  nextAgent: string;
}

interface TestFailure {
  testFile: string;
  testName: string;
  error: string;
  stackTrace?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

@Injectable()
export class E2ETesterAgent extends BaseAgent<ExecutionReport, TestResults> {
  private readonly projectRoot: string;

  constructor(artifactStore: ArtifactStore, eventEmitter: EventEmitter2) {
    super(artifactStore, eventEmitter);
    this.projectRoot = process.cwd();
  }

  protected async validateInput(input: ExecutionReport): Promise<void> {
    if (!input.executionId) {
      throw new Error('executionId é obrigatório');
    }

    if (input.summary.failed > input.summary.totalTasks / 2) {
      this.logger.warn(
        'Mais de 50% das tarefas falharam na execução. Testes podem não ser confiáveis.',
      );
    }
  }

  protected async validateOutput(output: TestResults): Promise<void> {
    if (!output.testResultsId) {
      throw new Error('testResultsId não foi gerado');
    }

    if (output.summary.totalTests === 0) {
      throw new Error('Nenhum teste foi executado');
    }
  }

  protected getNextAgent(output: TestResults): string {
    // Se testes passaram, vai para review
    // Se testes falharam, vai para refiner
    return output.recommendation === 'approve' ? 'ReviewerAgent' : 'RefinerAgent';
  }

  protected getArtifactPath(context: AgentContext): string {
    return `${context.featureId}/05-testing/test-results.json`;
  }

  protected getArtifactFilename(): string {
    return 'test-results.json';
  }

  protected async process(
    input: ExecutionReport,
    context: AgentContext,
  ): Promise<TestResults> {
    this.logger.log(`Executando testes E2E para: ${input.executionId}`);

    const startTime = Date.now();

    // Executar testes E2E
    const e2eResults = await this.runE2ETests();

    // Analisar falhas com Claude
    const failures = await this.analyzeFailures(e2eResults);

    // Obter cobertura de código
    const coverage = await this.getCoverage();

    const duration = Date.now() - startTime;

    // Determinar recomendação
    const hasкритicalFailures = failures.some(
      (f) => f.severity === 'critical' || f.severity === 'high',
    );
    const recommendation = e2eResults.failed === 0 && !hasритicalFailures ? 'approve' : 'refine';

    const testResults: TestResults = {
      testResultsId: this.generateTestResultsId(context),
      featureId: input.featureId,
      executionId: input.executionId,
      timestamp: new Date().toISOString(),
      tester: {
        agentVersion: this.agentVersion,
        testDate: new Date().toISOString().split('T')[0],
      },
      summary: {
        totalTests: e2eResults.passed + e2eResults.failed + e2eResults.skipped,
        passed: e2eResults.passed,
        failed: e2eResults.failed,
        skipped: e2eResults.skipped,
        duration,
      },
      e2eTests: {
        passed: e2eResults.passed,
        failed: e2eResults.failed,
        skipped: e2eResults.skipped,
        testFiles: e2eResults.testFiles,
      },
      failures,
      coverage,
      recommendation,
      nextAgent: recommendation === 'approve' ? 'ReviewerAgent' : 'RefinerAgent',
    };

    return testResults;
  }

  private async runE2ETests(): Promise<any> {
    try {
      this.logger.log('Executando testes E2E...');

      const { stdout, stderr } = await execAsync('npm run test:e2e', {
        cwd: this.projectRoot,
        timeout: 300000, // 5 minutos
      });

      // Parsear output do Jest/Playwright
      const output = stdout + stderr;
      const passedMatch = output.match(/(\d+) passed/);
      const failedMatch = output.match(/(\d+) failed/);
      const skippedMatch = output.match(/(\d+) skipped/);

      // Encontrar arquivos de teste executados
      const testFiles = this.extractTestFiles(output);

      return {
        passed: passedMatch ? parseInt(passedMatch[1]) : 0,
        failed: failedMatch ? parseInt(failedMatch[1]) : 0,
        skipped: skippedMatch ? parseInt(skippedMatch[1]) : 0,
        testFiles,
        output,
      };
    } catch (error) {
      this.logger.error(`Testes E2E falharam: ${error.message}`);

      // Mesmo com erro, tentar extrair informações
      const output = error.stdout + error.stderr;
      const failedMatch = output.match(/(\d+) failed/);
      const passedMatch = output.match(/(\d+) passed/);

      return {
        passed: passedMatch ? parseInt(passedMatch[1]) : 0,
        failed: failedMatch ? parseInt(failedMatch[1]) : 1,
        skipped: 0,
        testFiles: this.extractTestFiles(output),
        output,
        error: error.message,
      };
    }
  }

  private extractTestFiles(output: string): string[] {
    const testFileRegex = /test\/e2e\/([a-zA-Z0-9-_/.]+\.e2e-spec\.ts)/g;
    const matches = Array.from(output.matchAll(testFileRegex));
    return matches.map((m) => m[0]);
  }

  private async analyzeFailures(e2eResults: any): Promise<TestFailure[]> {
    if (e2eResults.failed === 0) {
      return [];
    }

    try {
      const prompt = this.buildFailureAnalysisPrompt(e2eResults);
      const claudeResponse = await this.callClaude(prompt);
      const analysis = this.parseClaudeJSON<any>(claudeResponse);

      return analysis.failures || [];
    } catch (error) {
      this.logger.error(`Erro ao analisar falhas: ${error.message}`);
      return [
        {
          testFile: 'unknown',
          testName: 'E2E Test Failure',
          error: e2eResults.error || 'Test execution failed',
          severity: 'high',
        },
      ];
    }
  }

  private buildFailureAnalysisPrompt(e2eResults: any): string {
    return `
Analise as falhas dos testes E2E e extraia informações estruturadas:

**Output dos Testes**:
\`\`\`
${e2eResults.output.substring(0, 5000)}
\`\`\`

Retorne um JSON com a seguinte estrutura:

{
  "failures": [
    {
      "testFile": "caminho/do/arquivo.e2e-spec.ts",
      "testName": "nome do teste que falhou",
      "error": "mensagem de erro clara",
      "stackTrace": "stack trace se disponível",
      "severity": "critical | high | medium | low"
    }
  ],
  "rootCauses": [
    "Possível causa raiz 1",
    "Possível causa raiz 2"
  ],
  "suggestedFixes": [
    "Sugestão de correção 1",
    "Sugestão de correção 2"
  ]
}

**REGRAS**:
- Identifique cada teste que falhou individualmente
- Classifique severity baseado no impacto (critical = impede funcionalidade principal)
- Identifique causas raiz reais (não apenas sintomas)
- Sugira correções específicas e acionáveis

Retorne APENAS o JSON, sem explicações.
`;
  }

  private async getCoverage(): Promise<any> {
    try {
      // Executar testes com cobertura
      await execAsync('npm run test:cov', {
        cwd: this.projectRoot,
        timeout: 120000,
      });

      // Ler arquivo de cobertura (se existir)
      const coveragePath = path.join(this.projectRoot, 'coverage', 'coverage-summary.json');
      const fs = require('fs').promises;
      const coverageData = await fs.readFile(coveragePath, 'utf-8');
      const coverage = JSON.parse(coverageData);

      const total = coverage.total;
      return {
        statements: total.statements.pct || 0,
        branches: total.branches.pct || 0,
        functions: total.functions.pct || 0,
        lines: total.lines.pct || 0,
      };
    } catch (error) {
      this.logger.warn(`Não foi possível obter cobertura: ${error.message}`);
      return {
        statements: 0,
        branches: 0,
        functions: 0,
        lines: 0,
      };
    }
  }

  private generateTestResultsId(context: AgentContext): string {
    const timestamp = Date.now().toString().slice(-6);
    return `TEST-${context.featureId.split('-')[2]}-${timestamp}`;
  }

  protected getSystemPrompt(): string {
    return `Você é o E2E Tester Agent, especializado em análise de testes e qualidade.

Seu papel é:
1. Analisar resultados de testes E2E e identificar falhas reais
2. Classificar severidade de falhas baseado no impacto no sistema
3. Identificar causas raiz de problemas (não apenas sintomas)
4. Sugerir correções específicas e acionáveis
5. Distinguir entre falhas críticas e problemas menores

Contexto técnico:
- Testes E2E: Jest + Supertest (APIs) ou Playwright (UI)
- Padrões: describe/it/expect, beforeAll/afterAll
- Ambiente: Node.js, NestJS, TypeScript

Critérios de severidade:
- Critical: Impede funcionalidade principal ou causa crash
- High: Funcionalidade importante não funciona como esperado
- Medium: Problema que afeta experiência mas não impede uso
- Low: Problema cosmético ou de edge case

Seja objetivo, técnico e focado em análise de causa raiz.`;
  }
}
