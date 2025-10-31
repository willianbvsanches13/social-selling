import { Injectable } from '@nestjs/common';
import { BaseAgent } from './base-agent';
import { AgentContext } from '../types/agent-types';
import { ArtifactStore } from '../storage/artifact-store';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { exec } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';

const execAsync = promisify(exec);

interface TestResults {
  testResultsId: string;
  featureId: string;
  executionId: string;
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
  };
  recommendation: 'approve' | 'refine';
}

interface ReviewReport {
  reviewId: string;
  featureId: string;
  testResultsId: string;
  timestamp: string;
  reviewer: {
    agentVersion: string;
    reviewDate: string;
  };
  summary: {
    overallScore: number; // 0-100
    verdict: 'approved' | 'rejected' | 'needs-changes';
  };
  codeQuality: {
    score: number;
    issues: ReviewIssue[];
  };
  security: {
    score: number;
    vulnerabilities: SecurityVulnerability[];
  };
  patterns: {
    score: number;
    violations: PatternViolation[];
  };
  documentation: {
    score: number;
    missing: string[];
  };
  recommendations: string[];
  nextAgent: string;
}

interface ReviewIssue {
  file: string;
  line?: number;
  type: 'error' | 'warning' | 'info';
  category: 'complexity' | 'duplication' | 'naming' | 'structure' | 'performance';
  description: string;
  suggestion?: string;
}

interface SecurityVulnerability {
  file: string;
  line?: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: 'sql-injection' | 'xss' | 'auth' | 'crypto' | 'deps' | 'other';
  description: string;
  remediation: string;
}

interface PatternViolation {
  file: string;
  pattern: string;
  description: string;
  expectedPattern: string;
}

@Injectable()
export class ReviewerAgent extends BaseAgent<TestResults, ReviewReport> {
  private readonly projectRoot: string;

  constructor(artifactStore: ArtifactStore, eventEmitter: EventEmitter2) {
    super(artifactStore, eventEmitter);
    this.projectRoot = process.cwd();
  }

  protected async validateInput(input: TestResults): Promise<void> {
    if (!input.testResultsId) {
      throw new Error('testResultsId é obrigatório');
    }

    if (input.summary.failed > 0) {
      this.logger.warn('Testes falharam, mas iniciando review do código existente');
    }
  }

  protected async validateOutput(output: ReviewReport): Promise<void> {
    if (!output.reviewId) {
      throw new Error('reviewId não foi gerado');
    }

    if (output.summary.overallScore < 0 || output.summary.overallScore > 100) {
      throw new Error('overallScore deve estar entre 0 e 100');
    }
  }

  protected getNextAgent(output: ReviewReport): string {
    // Se aprovado, vai para deliverer
    // Se rejeitado ou precisa mudanças, vai para refiner
    return output.summary.verdict === 'approved' ? 'DelivererAgent' : 'RefinerAgent';
  }

  protected getArtifactPath(context: AgentContext): string {
    return `${context.featureId}/06-review/review-report.json`;
  }

  protected getArtifactFilename(): string {
    return 'review-report.json';
  }

  protected async process(
    input: TestResults,
    context: AgentContext,
  ): Promise<ReviewReport> {
    this.logger.log(`Revisando código para: ${input.testResultsId}`);

    // Obter arquivos modificados da execução
    const modifiedFiles = await this.getModifiedFiles(context);

    // Executar linter
    const lintResults = await this.runLinter();

    // Análise de código com Claude
    const codeAnalysis = await this.analyzeCode(modifiedFiles, lintResults);

    // Análise de segurança
    const securityAnalysis = await this.analyzeSecurityConcerns(modifiedFiles);

    // Verificar padrões do projeto
    const patternAnalysis = await this.checkPatterns(modifiedFiles);

    // Verificar documentação
    const docAnalysis = await this.checkDocumentation(modifiedFiles);

    // Calcular scores
    const codeQualityScore = this.calculateCodeQualityScore(codeAnalysis, lintResults);
    const securityScore = this.calculateSecurityScore(securityAnalysis);
    const patternsScore = this.calculatePatternsScore(patternAnalysis);
    const docScore = this.calculateDocScore(docAnalysis);

    // Score geral (média ponderada)
    const overallScore = Math.round(
      codeQualityScore * 0.4 +
      securityScore * 0.3 +
      patternsScore * 0.2 +
      docScore * 0.1,
    );

    // Determinar veredito
    const hasCriticalSecurity = securityAnalysis.some(
      (v) => v.severity === 'critical' || v.severity === 'high',
    );
    const hasErrorIssues = codeAnalysis.issues.some((i) => i.type === 'error');

    let verdict: 'approved' | 'rejected' | 'needs-changes';
    if (hasCriticalSecurity || hasErrorIssues || overallScore < 60) {
      verdict = 'rejected';
    } else if (overallScore < 80) {
      verdict = 'needs-changes';
    } else {
      verdict = 'approved';
    }

    const reviewReport: ReviewReport = {
      reviewId: this.generateReviewId(context),
      featureId: input.featureId,
      testResultsId: input.testResultsId,
      timestamp: new Date().toISOString(),
      reviewer: {
        agentVersion: this.agentVersion,
        reviewDate: new Date().toISOString().split('T')[0],
      },
      summary: {
        overallScore,
        verdict,
      },
      codeQuality: {
        score: codeQualityScore,
        issues: codeAnalysis.issues,
      },
      security: {
        score: securityScore,
        vulnerabilities: securityAnalysis,
      },
      patterns: {
        score: patternsScore,
        violations: patternAnalysis,
      },
      documentation: {
        score: docScore,
        missing: docAnalysis.missing,
      },
      recommendations: this.generateRecommendations(codeAnalysis, securityAnalysis, patternAnalysis),
      nextAgent: verdict === 'approved' ? 'DelivererAgent' : 'RefinerAgent',
    };

    return reviewReport;
  }

  private async getModifiedFiles(context: AgentContext): Promise<string[]> {
    try {
      // Carregar execution report para ver arquivos modificados
      const executionReport = await this.loadPreviousArtifact<any>(
        'ExecutorAgent',
        context,
      );

      if (!executionReport) {
        return [];
      }

      const files = new Set<string>();
      for (const result of executionReport.results || []) {
        for (const file of result.filesModified || []) {
          files.add(file);
        }
      }

      return Array.from(files);
    } catch (error) {
      this.logger.warn(`Erro ao obter arquivos modificados: ${error.message}`);
      return [];
    }
  }

  private async runLinter(): Promise<any> {
    try {
      this.logger.log('Executando ESLint...');

      const { stdout } = await execAsync('npm run lint -- --format json', {
        cwd: this.projectRoot,
        timeout: 60000,
      });

      return JSON.parse(stdout);
    } catch (error) {
      // ESLint retorna exit code != 0 se encontrar problemas
      if (error.stdout) {
        try {
          return JSON.parse(error.stdout);
        } catch {
          return [];
        }
      }
      this.logger.warn(`Erro ao executar lint: ${error.message}`);
      return [];
    }
  }

  private async analyzeCode(modifiedFiles: string[], lintResults: any): Promise<any> {
    try {
      // Ler conteúdo dos arquivos modificados
      const filesContent = await this.readFiles(modifiedFiles);

      const prompt = this.buildCodeReviewPrompt(filesContent, lintResults);
      const claudeResponse = await this.callClaude(prompt);
      const analysis = this.parseClaudeJSON<any>(claudeResponse);

      return {
        issues: analysis.issues || [],
        strengths: analysis.strengths || [],
      };
    } catch (error) {
      this.logger.error(`Erro ao analisar código: ${error.message}`);
      return { issues: [], strengths: [] };
    }
  }

  private buildCodeReviewPrompt(filesContent: any[], lintResults: any): string {
    return `
Faça uma revisão de código profissional e detalhada:

**Arquivos Modificados**:
${filesContent.map((f) => `
File: ${f.path}
\`\`\`typescript
${f.content.substring(0, 2000)}
\`\`\`
`).join('\n')}

**Resultados do ESLint**:
${JSON.stringify(lintResults.slice(0, 10), null, 2)}

Retorne um JSON com a seguinte estrutura:

{
  "issues": [
    {
      "file": "caminho/do/arquivo.ts",
      "line": 42,
      "type": "error | warning | info",
      "category": "complexity | duplication | naming | structure | performance",
      "description": "Descrição clara do problema",
      "suggestion": "Como corrigir"
    }
  ],
  "strengths": [
    "Pontos positivos do código"
  ]
}

**CRITÉRIOS DE REVISÃO**:

1. **Qualidade de Código**:
   - Complexidade ciclomática alta (funções > 20 linhas)
   - Duplicação de código
   - Nomenclatura inadequada
   - Falta de tipagem TypeScript

2. **Arquitetura**:
   - Violação de SOLID
   - Acoplamento excessivo
   - Falta de separação de responsabilidades

3. **Performance**:
   - Queries N+1
   - Loops ineficientes
   - Falta de paginação

4. **Boas Práticas NestJS**:
   - Uso correto de decorators
   - Dependency injection adequada
   - DTOs bem definidos
   - Tratamento de erros

Seja específico, objetivo e construtivo. Foque em problemas reais.

Retorne APENAS o JSON, sem explicações.
`;
  }

  private async analyzeSecurityConcerns(modifiedFiles: string[]): Promise<SecurityVulnerability[]> {
    try {
      const filesContent = await this.readFiles(modifiedFiles);

      const prompt = this.buildSecurityReviewPrompt(filesContent);
      const claudeResponse = await this.callClaude(prompt);
      const analysis = this.parseClaudeJSON<any>(claudeResponse);

      return analysis.vulnerabilities || [];
    } catch (error) {
      this.logger.error(`Erro ao analisar segurança: ${error.message}`);
      return [];
    }
  }

  private buildSecurityReviewPrompt(filesContent: any[]): string {
    return `
Analise o código em busca de vulnerabilidades de segurança:

**Arquivos**:
${filesContent.map((f) => `
File: ${f.path}
\`\`\`typescript
${f.content.substring(0, 2000)}
\`\`\`
`).join('\n')}

Retorne um JSON:

{
  "vulnerabilities": [
    {
      "file": "arquivo.ts",
      "line": 42,
      "severity": "critical | high | medium | low",
      "type": "sql-injection | xss | auth | crypto | deps | other",
      "description": "Descrição da vulnerabilidade",
      "remediation": "Como corrigir"
    }
  ]
}

**VERIFICAR**:
- SQL Injection (raw queries, string concatenation)
- XSS (output não sanitizado)
- Autenticação/Autorização inadequada
- Criptografia fraca ou hardcoded secrets
- Dependências vulneráveis
- CORS mal configurado
- Validação de input insuficiente

Retorne APENAS o JSON.
`;
  }

  private async checkPatterns(modifiedFiles: string[]): Promise<PatternViolation[]> {
    // Verificações simples de padrões
    const violations: PatternViolation[] = [];

    for (const file of modifiedFiles) {
      // Verificar naming conventions
      if (file.endsWith('.service.ts') && !file.includes('/services/')) {
        violations.push({
          file,
          pattern: 'File Structure',
          description: 'Services devem estar em diretório /services/',
          expectedPattern: 'src/module/services/*.service.ts',
        });
      }

      if (file.endsWith('.controller.ts') && !file.includes('/controllers/')) {
        violations.push({
          file,
          pattern: 'File Structure',
          description: 'Controllers devem estar em diretório /controllers/',
          expectedPattern: 'src/module/controllers/*.controller.ts',
        });
      }
    }

    return violations;
  }

  private async checkDocumentation(modifiedFiles: string[]): Promise<any> {
    const missing: string[] = [];

    // Verificar se novos arquivos têm JSDoc
    for (const file of modifiedFiles) {
      if (file.endsWith('.service.ts') || file.endsWith('.controller.ts')) {
        try {
          const content = await fs.readFile(file, 'utf-8');
          if (!content.includes('/**') && !content.includes('* @')) {
            missing.push(`${file}: Falta documentação JSDoc`);
          }
        } catch {
          // Ignorar erros de leitura
        }
      }
    }

    return { missing };
  }

  private async readFiles(filePaths: string[]): Promise<any[]> {
    const files = [];
    for (const filePath of filePaths.slice(0, 10)) {
      // Limitar a 10 arquivos
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        files.push({ path: filePath, content });
      } catch (error) {
        this.logger.warn(`Erro ao ler arquivo ${filePath}: ${error.message}`);
      }
    }
    return files;
  }

  private calculateCodeQualityScore(analysis: any, lintResults: any): number {
    const errorCount = analysis.issues.filter((i: any) => i.type === 'error').length;
    const warningCount = analysis.issues.filter((i: any) => i.type === 'warning').length;
    const lintErrors = lintResults.filter((r: any) => r.errorCount > 0).length;

    const deductions = errorCount * 10 + warningCount * 5 + lintErrors * 3;
    return Math.max(0, 100 - deductions);
  }

  private calculateSecurityScore(vulnerabilities: SecurityVulnerability[]): number {
    const critical = vulnerabilities.filter((v) => v.severity === 'critical').length;
    const high = vulnerabilities.filter((v) => v.severity === 'high').length;
    const medium = vulnerabilities.filter((v) => v.severity === 'medium').length;

    const deductions = critical * 40 + high * 20 + medium * 10;
    return Math.max(0, 100 - deductions);
  }

  private calculatePatternsScore(violations: PatternViolation[]): number {
    return Math.max(0, 100 - violations.length * 10);
  }

  private calculateDocScore(docAnalysis: any): number {
    return Math.max(0, 100 - docAnalysis.missing.length * 10);
  }

  private generateRecommendations(
    codeAnalysis: any,
    securityAnalysis: SecurityVulnerability[],
    patternAnalysis: PatternViolation[],
  ): string[] {
    const recommendations: string[] = [];

    if (securityAnalysis.length > 0) {
      recommendations.push('Corrigir vulnerabilidades de segurança identificadas');
    }

    if (codeAnalysis.issues.some((i: any) => i.category === 'complexity')) {
      recommendations.push('Refatorar funções complexas para melhorar manutenibilidade');
    }

    if (patternAnalysis.length > 0) {
      recommendations.push('Seguir estrutura de diretórios do projeto');
    }

    return recommendations;
  }

  private generateReviewId(context: AgentContext): string {
    const timestamp = Date.now().toString().slice(-6);
    return `REV-${context.featureId.split('-')[2]}-${timestamp}`;
  }

  protected getSystemPrompt(): string {
    return `Você é o Reviewer Agent, especializado em code review e qualidade de software.

Seu papel é:
1. Revisar código com olhar crítico mas construtivo
2. Identificar problemas de qualidade, segurança e arquitetura
3. Verificar aderência a padrões e boas práticas
4. Sugerir melhorias específicas e acionáveis
5. Reconhecer pontos positivos do código

Contexto técnico:
- Stack: NestJS, TypeScript, TypeORM, PostgreSQL
- Padrões: SOLID, Clean Code, Repository Pattern
- Segurança: OWASP Top 10
- Testes: Jest, cobertura mínima 80%

Critérios de avaliação:
- Qualidade: complexidade, duplicação, nomenclatura
- Segurança: injeções, XSS, autenticação, criptografia
- Arquitetura: SOLID, separação de responsabilidades
- Performance: queries eficientes, paginação
- Documentação: JSDoc, README, comentários

Seja profissional, específico e focado em melhorias reais.`;
  }
}
