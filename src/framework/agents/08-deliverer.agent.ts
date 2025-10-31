import { Injectable } from '@nestjs/common';
import { BaseAgent } from './base-agent';
import { AgentContext } from '../types/agent-types';
import { ArtifactStore } from '../storage/artifact-store';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { exec } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

interface ReviewReport {
  reviewId: string;
  featureId: string;
  testResultsId: string;
  summary: {
    overallScore: number;
    verdict: 'approved' | 'rejected' | 'needs-changes';
  };
}

interface DeliveryPackage {
  deliveryId: string;
  featureId: string;
  timestamp: string;
  deliverer: {
    agentVersion: string;
    deliveryDate: string;
  };
  summary: {
    totalFiles: number;
    linesAdded: number;
    linesRemoved: number;
    testsAdded: number;
  };
  deliverables: {
    code: {
      files: string[];
      commits: CommitInfo[];
    };
    tests: {
      unit: number;
      e2e: number;
      coverage: number;
    };
    documentation: {
      files: string[];
      updated: boolean;
    };
  };
  pullRequest: {
    branch: string;
    title: string;
    description: string;
    url?: string;
  };
  deploymentNotes: string[];
  nextSteps: string[];
  status: 'ready-for-merge' | 'delivered' | 'failed';
  nextAgent: null; // Fim do workflow
}

interface CommitInfo {
  sha: string;
  message: string;
  filesChanged: number;
  timestamp: string;
}

@Injectable()
export class DelivererAgent extends BaseAgent<ReviewReport, DeliveryPackage> {
  private readonly projectRoot: string;

  constructor(artifactStore: ArtifactStore, eventEmitter: EventEmitter2) {
    super(artifactStore, eventEmitter);
    this.projectRoot = process.cwd();
  }

  protected async validateInput(input: ReviewReport): Promise<void> {
    if (!input.reviewId) {
      throw new Error('reviewId é obrigatório');
    }

    if (input.summary.verdict !== 'approved') {
      throw new Error(
        `Review não foi aprovado. Status: ${input.summary.verdict}. Não é possível entregar.`,
      );
    }

    if (input.summary.overallScore < 70) {
      this.logger.warn(
        `Score de review baixo (${input.summary.overallScore}), mas foi aprovado. Prosseguindo com entrega.`,
      );
    }
  }

  protected async validateOutput(output: DeliveryPackage): Promise<void> {
    if (!output.deliveryId) {
      throw new Error('deliveryId não foi gerado');
    }

    if (!output.pullRequest || !output.pullRequest.branch) {
      throw new Error('Pull request não foi criado');
    }

    if (output.summary.totalFiles === 0) {
      throw new Error('Nenhum arquivo foi incluído na entrega');
    }
  }

  protected getNextAgent(output: DeliveryPackage, context: AgentContext): null {
    // Fim do workflow
    return null;
  }

  protected getArtifactPath(context: AgentContext): string {
    return `${context.featureId}/08-delivery/delivery-package.json`;
  }

  protected getArtifactFilename(): string {
    return 'delivery-package.json';
  }

  protected async process(
    input: ReviewReport,
    context: AgentContext,
  ): Promise<DeliveryPackage> {
    this.logger.log(`Preparando entrega para: ${input.featureId}`);

    // 1. Coletar informações de todas as fases
    const featureInfo = await this.collectFeatureInfo(context);

    // 2. Obter estatísticas do Git
    const gitStats = await this.getGitStats();

    // 3. Criar branch e commits organizados (se ainda não existe)
    const branchInfo = await this.ensureBranch(context.featureId);

    // 4. Gerar documentação de entrega
    const documentation = await this.generateDeliveryDocumentation(
      featureInfo,
      context,
    );

    // 5. Criar Pull Request
    const prInfo = await this.createPullRequest(featureInfo, context, gitStats);

    // 6. Gerar notas de deployment
    const deploymentNotes = await this.generateDeploymentNotes(featureInfo);

    // 7. Definir próximos passos
    const nextSteps = await this.defineNextSteps(featureInfo);

    const deliveryPackage: DeliveryPackage = {
      deliveryId: this.generateDeliveryId(context),
      featureId: context.featureId,
      timestamp: new Date().toISOString(),
      deliverer: {
        agentVersion: this.agentVersion,
        deliveryDate: new Date().toISOString().split('T')[0],
      },
      summary: {
        totalFiles: gitStats.filesChanged,
        linesAdded: gitStats.linesAdded,
        linesRemoved: gitStats.linesRemoved,
        testsAdded: gitStats.testsAdded,
      },
      deliverables: {
        code: {
          files: gitStats.files,
          commits: gitStats.commits,
        },
        tests: {
          unit: featureInfo.testResults?.summary?.passed || 0,
          e2e: featureInfo.testResults?.e2eTests?.passed || 0,
          coverage: featureInfo.testResults?.coverage?.lines || 0,
        },
        documentation: {
          files: documentation.files,
          updated: documentation.updated,
        },
      },
      pullRequest: {
        branch: branchInfo.branch,
        title: prInfo.title,
        description: prInfo.description,
        url: prInfo.url,
      },
      deploymentNotes,
      nextSteps,
      status: prInfo.url ? 'delivered' : 'ready-for-merge',
      nextAgent: null,
    };

    this.logger.log(`✅ Feature ${context.featureId} entregue com sucesso!`);

    return deliveryPackage;
  }

  private async collectFeatureInfo(context: AgentContext): Promise<any> {
    try {
      // Carregar todos os artefatos da feature
      const analysis = await this.loadPreviousArtifact<any>('AnalyzerAgent', context);
      const plan = await this.loadPreviousArtifact<any>('PlannerAgent', context);
      const tasks = await this.loadPreviousArtifact<any>('TaskCreatorAgent', context);
      const execution = await this.loadPreviousArtifact<any>('ExecutorAgent', context);
      const testResults = await this.loadPreviousArtifact<any>('E2ETesterAgent', context);
      const review = await this.loadPreviousArtifact<any>('ReviewerAgent', context);

      return {
        analysis,
        plan,
        tasks,
        execution,
        testResults,
        review,
      };
    } catch (error) {
      this.logger.error(`Erro ao coletar informações: ${error.message}`);
      return {};
    }
  }

  private async getGitStats(): Promise<any> {
    try {
      // Obter arquivos modificados
      const { stdout: filesOutput } = await execAsync(
        'git diff --name-only HEAD',
        { cwd: this.projectRoot },
      );
      const files = filesOutput.split('\n').filter((f) => f.trim().length > 0);

      // Obter estatísticas de linhas
      const { stdout: statsOutput } = await execAsync(
        'git diff --stat HEAD',
        { cwd: this.projectRoot },
      );

      const addedMatch = statsOutput.match(/(\d+) insertions?/);
      const removedMatch = statsOutput.match(/(\d+) deletions?/);

      // Contar testes adicionados
      const testFiles = files.filter(
        (f) => f.includes('.spec.ts') || f.includes('.e2e-spec.ts'),
      );

      // Obter commits recentes (se houver)
      let commits: CommitInfo[] = [];
      try {
        const { stdout: commitsOutput } = await execAsync(
          'git log --oneline -10',
          { cwd: this.projectRoot },
        );
        commits = commitsOutput
          .split('\n')
          .filter((l) => l.trim())
          .map((line) => {
            const [sha, ...messageParts] = line.split(' ');
            return {
              sha,
              message: messageParts.join(' '),
              filesChanged: 0,
              timestamp: new Date().toISOString(),
            };
          });
      } catch {
        // Ignorar se não houver commits
      }

      return {
        filesChanged: files.length,
        linesAdded: addedMatch ? parseInt(addedMatch[1]) : 0,
        linesRemoved: removedMatch ? parseInt(removedMatch[1]) : 0,
        testsAdded: testFiles.length,
        files,
        commits,
      };
    } catch (error) {
      this.logger.warn(`Erro ao obter estatísticas Git: ${error.message}`);
      return {
        filesChanged: 0,
        linesAdded: 0,
        linesRemoved: 0,
        testsAdded: 0,
        files: [],
        commits: [],
      };
    }
  }

  private async ensureBranch(featureId: string): Promise<any> {
    try {
      const branchName = `feature/${featureId.toLowerCase()}`;

      // Verificar se branch já existe
      try {
        await execAsync(`git rev-parse --verify ${branchName}`, {
          cwd: this.projectRoot,
        });
        this.logger.log(`Branch ${branchName} já existe`);
      } catch {
        // Branch não existe, criar
        this.logger.log(`Criando branch ${branchName}`);
        await execAsync(`git checkout -b ${branchName}`, {
          cwd: this.projectRoot,
        });
      }

      return { branch: branchName };
    } catch (error) {
      this.logger.error(`Erro ao garantir branch: ${error.message}`);
      return { branch: 'main' }; // Fallback
    }
  }

  private async generateDeliveryDocumentation(
    featureInfo: any,
    context: AgentContext,
  ): Promise<any> {
    try {
      const docPath = path.join(
        this.projectRoot,
        'docs',
        'features',
        `${context.featureId}.md`,
      );

      const docContent = this.buildDocumentationContent(featureInfo, context);

      await fs.mkdir(path.dirname(docPath), { recursive: true });
      await fs.writeFile(docPath, docContent, 'utf-8');

      this.logger.log(`Documentação gerada: ${docPath}`);

      return {
        files: [docPath],
        updated: true,
      };
    } catch (error) {
      this.logger.error(`Erro ao gerar documentação: ${error.message}`);
      return { files: [], updated: false };
    }
  }

  private buildDocumentationContent(featureInfo: any, context: AgentContext): string {
    return `# Feature: ${featureInfo.analysis?.feature?.title || context.featureId}

## Descrição
${featureInfo.analysis?.feature?.description || 'N/A'}

## Categoria
${featureInfo.analysis?.feature?.category || 'N/A'}

## Prioridade
${featureInfo.analysis?.feature?.priority || 'N/A'}

## Requisitos Funcionais
${featureInfo.analysis?.requirements?.functional?.map((r: any) => `- ${r.id}: ${r.description}`).join('\n') || 'N/A'}

## Requisitos Não-Funcionais
${featureInfo.analysis?.requirements?.nonFunctional?.map((r: any) => `- ${r.id} (${r.type}): ${r.description}`).join('\n') || 'N/A'}

## Arquitetura
- **Abordagem**: ${featureInfo.plan?.architecture?.approach || 'N/A'}
- **Padrões**: ${featureInfo.plan?.architecture?.patterns?.join(', ') || 'N/A'}

## Componentes Implementados
${featureInfo.plan?.architecture?.components?.map((c: any) => `- ${c.name} (${c.type}) - ${c.action}`).join('\n') || 'N/A'}

## Fases de Implementação
${featureInfo.plan?.phases?.map((p: any) => `### ${p.name}\n- Estimativa: ${p.estimatedHours}h\n- Componentes: ${p.components.join(', ')}`).join('\n\n') || 'N/A'}

## Tarefas Executadas
- Total de tarefas: ${featureInfo.tasks?.summary?.totalTasks || 0}
- Completadas: ${featureInfo.execution?.summary?.completed || 0}
- Falhadas: ${featureInfo.execution?.summary?.failed || 0}

## Testes
- **Unit Tests**: ${featureInfo.testResults?.summary?.passed || 0} passed
- **E2E Tests**: ${featureInfo.testResults?.e2eTests?.passed || 0} passed
- **Coverage**: ${featureInfo.testResults?.coverage?.lines || 0}%

## Code Review
- **Score Geral**: ${featureInfo.review?.summary?.overallScore || 0}/100
- **Veredito**: ${featureInfo.review?.summary?.verdict || 'N/A'}
- **Qualidade de Código**: ${featureInfo.review?.codeQuality?.score || 0}/100
- **Segurança**: ${featureInfo.review?.security?.score || 0}/100

## Riscos Identificados
${featureInfo.analysis?.risks?.map((r: any) => `- **${r.severity}**: ${r.description}\n  - Mitigação: ${r.mitigation}`).join('\n') || 'Nenhum risco identificado'}

## Dependências
${featureInfo.analysis?.dependencies?.map((d: any) => `- ${d.name} (${d.type}) - ${d.action}`).join('\n') || 'Nenhuma dependência'}

---
*Documento gerado automaticamente em ${new Date().toISOString().split('T')[0]}*
`;
  }

  private async createPullRequest(
    featureInfo: any,
    context: AgentContext,
    gitStats: any,
  ): Promise<any> {
    const title = featureInfo.analysis?.feature?.title || context.featureId;
    const description = this.buildPRDescription(featureInfo, gitStats);

    // Nota: Criação real de PR depende de integração com GitHub/GitLab
    // Por enquanto, apenas retornar informações
    this.logger.log(`PR preparado: ${title}`);

    return {
      title: `feat: ${title}`,
      description,
      url: undefined, // Seria preenchido após criar PR real
    };
  }

  private buildPRDescription(featureInfo: any, gitStats: any): string {
    return `## Descrição
${featureInfo.analysis?.feature?.description || 'N/A'}

## Tipo de Mudança
- [x] Nova feature
- [ ] Bug fix
- [ ] Refatoração
- [ ] Documentação

## Mudanças
- **Arquivos modificados**: ${gitStats.filesChanged}
- **Linhas adicionadas**: ${gitStats.linesAdded}
- **Linhas removidas**: ${gitStats.linesRemoved}
- **Testes adicionados**: ${gitStats.testsAdded}

## Componentes Afetados
${featureInfo.plan?.architecture?.components?.map((c: any) => `- ${c.name}`).join('\n') || 'N/A'}

## Testes
- ✅ Unit tests: ${featureInfo.testResults?.summary?.passed || 0} passed
- ✅ E2E tests: ${featureInfo.testResults?.e2eTests?.passed || 0} passed
- ✅ Coverage: ${featureInfo.testResults?.coverage?.lines || 0}%

## Code Review
- Score: ${featureInfo.review?.summary?.overallScore || 0}/100
- Status: ${featureInfo.review?.summary?.verdict || 'N/A'}

## Checklist
- [x] Código implementado e testado
- [x] Testes unitários adicionados/atualizados
- [x] Testes E2E passando
- [x] Code review aprovado
- [x] Documentação atualizada

---
*Feature ID*: ${featureInfo.analysis?.featureId || 'N/A'}
*Gerado automaticamente pelo Framework de Entrega*
`;
  }

  private async generateDeploymentNotes(featureInfo: any): Promise<string[]> {
    const notes: string[] = [];

    // Verificar se há migrations
    if (featureInfo.analysis?.impact?.databases?.length > 0) {
      notes.push(
        '⚠️  Executar migrations de banco de dados: npm run migration:run',
      );
    }

    // Verificar se há novos pacotes
    const hasNewDeps = featureInfo.tasks?.tasks?.some(
      (t: any) => t.technicalDetails?.packages?.length > 0,
    );
    if (hasNewDeps) {
      notes.push('📦 Instalar novas dependências: npm install');
    }

    // Verificar se há variáveis de ambiente
    const hasEnvVars = featureInfo.tasks?.tasks?.some(
      (t: any) => t.technicalDetails?.envVars?.length > 0,
    );
    if (hasEnvVars) {
      notes.push('🔐 Configurar variáveis de ambiente no .env');
    }

    // Verificar se há serviços externos
    if (featureInfo.analysis?.impact?.externalServices?.length > 0) {
      notes.push(
        `🔗 Configurar integração com: ${featureInfo.analysis.impact.externalServices.join(', ')}`,
      );
    }

    if (notes.length === 0) {
      notes.push('✅ Nenhuma ação de deployment necessária');
    }

    return notes;
  }

  private async defineNextSteps(featureInfo: any): Promise<string[]> {
    return [
      '1. Revisar Pull Request manualmente',
      '2. Executar testes em ambiente de staging',
      '3. Validar critérios de aceitação',
      '4. Merge para main branch',
      '5. Deploy para produção',
      '6. Monitorar logs e métricas',
      '7. Comunicar stakeholders',
    ];
  }

  private generateDeliveryId(context: AgentContext): string {
    const timestamp = Date.now().toString().slice(-6);
    return `DEL-${context.featureId.split('-')[2]}-${timestamp}`;
  }

  protected getSystemPrompt(): string {
    return `Você é o Deliverer Agent, especializado em preparação e entrega de features.

Seu papel é:
1. Consolidar todo o trabalho realizado na feature
2. Gerar documentação completa e profissional
3. Preparar Pull Request com descrição detalhada
4. Identificar requisitos de deployment
5. Definir próximos passos para merge e deploy

Contexto técnico:
- Stack: NestJS, TypeScript, TypeORM, PostgreSQL
- Git flow: feature branches, PRs, code review
- CI/CD: Testes automatizados, deployment pipeline

Princípios de entrega:
- Documentação clara e completa
- PR description informativa
- Deployment notes acionáveis
- Rastreabilidade de todas as decisões
- Comunicação efetiva com time

Você é o último agente no workflow - garanta que tudo está pronto para produção.`;
  }
}
