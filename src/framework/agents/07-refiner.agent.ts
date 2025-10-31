import { Injectable } from '@nestjs/common';
import { BaseAgent } from './base-agent';
import { AgentContext } from '../types/agent-types';
import { ArtifactStore } from '../storage/artifact-store';
import { EventEmitter2 } from '@nestjs/event-emitter';

interface RefinerInput {
  featureId: string;
  triggerSource: {
    type: 'test-failure' | 'review-rejection';
    sourceId: string;
  };
  testResultsId?: string;
  reviewId?: string;
}

interface RefinementPlan {
  refinementId: string;
  featureId: string;
  timestamp: string;
  refiner: {
    agentVersion: string;
    refinementDate: string;
  };
  source: {
    type: 'test-failure' | 'review-rejection';
    triggerId: string;
  };
  analysis: {
    rootCauses: string[];
    impactedAreas: string[];
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  };
  actions: RefinementAction[];
  estimatedEffort: {
    hours: number;
    complexity: 'low' | 'medium' | 'high';
  };
  priority: 'critical' | 'high' | 'medium' | 'low';
  nextAgent: string;
}

interface RefinementAction {
  actionId: string;
  type: 'fix-bug' | 'refactor' | 'add-test' | 'improve-security' | 'update-doc';
  priority: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  targetFiles: string[];
  specificChanges: string[];
  acceptanceCriteria: string[];
  estimatedMinutes: number;
}

@Injectable()
export class RefinerAgent extends BaseAgent<RefinerInput, RefinementPlan> {
  constructor(artifactStore: ArtifactStore, eventEmitter: EventEmitter2) {
    super(artifactStore, eventEmitter);
  }

  protected async validateInput(input: RefinerInput): Promise<void> {
    if (!input.featureId) {
      throw new Error('featureId é obrigatório');
    }

    if (!input.triggerSource || !input.triggerSource.type) {
      throw new Error('triggerSource é obrigatório');
    }

    if (
      input.triggerSource.type !== 'test-failure' &&
      input.triggerSource.type !== 'review-rejection'
    ) {
      throw new Error('triggerSource.type deve ser test-failure ou review-rejection');
    }
  }

  protected async validateOutput(output: RefinementPlan): Promise<void> {
    if (!output.refinementId) {
      throw new Error('refinementId não foi gerado');
    }

    if (!output.actions || output.actions.length === 0) {
      throw new Error('Nenhuma ação de refinamento foi criada');
    }

    // Verificar se todas as ações têm critérios de aceitação
    for (const action of output.actions) {
      if (!action.acceptanceCriteria || action.acceptanceCriteria.length === 0) {
        throw new Error(
          `Ação ${action.actionId} não possui critérios de aceitação`,
        );
      }
    }
  }

  protected getNextAgent(output: RefinementPlan, context: AgentContext): string {
    // Sempre volta para o Executor para re-executar com refinamentos
    return 'ExecutorAgent';
  }

  protected getArtifactPath(context: AgentContext): string {
    return `${context.featureId}/07-refinement/refinement-plan.json`;
  }

  protected getArtifactFilename(): string {
    return 'refinement-plan.json';
  }

  protected async process(
    input: RefinerInput,
    context: AgentContext,
  ): Promise<RefinementPlan> {
    this.logger.log(
      `Analisando falhas e criando plano de refinamento para: ${input.featureId}`,
    );

    // Carregar dados da fonte do problema
    const problemData = await this.loadProblemData(input, context);

    // Analisar causa raiz com Claude
    const analysis = await this.analyzeProblem(problemData, input.triggerSource.type);

    // Criar ações de refinamento
    const actions = await this.createRefinementActions(
      analysis,
      problemData,
      input.triggerSource.type,
    );

    // Estimar esforço total
    const totalMinutes = actions.reduce((sum, a) => sum + a.estimatedMinutes, 0);
    const estimatedHours = Math.ceil(totalMinutes / 60);

    // Determinar complexidade
    const complexity = this.determineComplexity(actions, analysis);

    // Determinar prioridade geral
    const priority = this.determinePriority(actions, analysis);

    const refinementPlan: RefinementPlan = {
      refinementId: this.generateRefinementId(context),
      featureId: input.featureId,
      timestamp: new Date().toISOString(),
      refiner: {
        agentVersion: this.agentVersion,
        refinementDate: new Date().toISOString().split('T')[0],
      },
      source: {
        type: input.triggerSource.type,
        triggerId: input.triggerSource.sourceId,
      },
      analysis: {
        rootCauses: analysis.rootCauses,
        impactedAreas: analysis.impactedAreas,
        riskLevel: analysis.riskLevel,
      },
      actions,
      estimatedEffort: {
        hours: estimatedHours,
        complexity,
      },
      priority,
      nextAgent: 'ExecutorAgent',
    };

    return refinementPlan;
  }

  private async loadProblemData(
    input: RefinerInput,
    context: AgentContext,
  ): Promise<any> {
    if (input.triggerSource.type === 'test-failure') {
      // Carregar test results
      const testResults = await this.loadPreviousArtifact<any>(
        'E2ETesterAgent',
        context,
      );
      return {
        type: 'test-failure',
        data: testResults,
      };
    } else {
      // Carregar review report
      const reviewReport = await this.loadPreviousArtifact<any>(
        'ReviewerAgent',
        context,
      );
      return {
        type: 'review-rejection',
        data: reviewReport,
      };
    }
  }

  private async analyzeProblem(problemData: any, sourceType: string): Promise<any> {
    const prompt = this.buildAnalysisPrompt(problemData, sourceType);
    const claudeResponse = await this.callClaude(prompt);
    const analysis = this.parseClaudeJSON<any>(claudeResponse);

    return {
      rootCauses: analysis.rootCauses || [],
      impactedAreas: analysis.impactedAreas || [],
      riskLevel: analysis.riskLevel || 'medium',
    };
  }

  private buildAnalysisPrompt(problemData: any, sourceType: string): string {
    if (sourceType === 'test-failure') {
      return `
Analise as falhas de teste e identifique causas raiz:

**Testes Falhados**:
${JSON.stringify(problemData.data?.failures || [], null, 2)}

**Resumo**:
- Total de testes: ${problemData.data?.summary?.totalTests || 0}
- Falharam: ${problemData.data?.summary?.failed || 0}

Retorne um JSON:

{
  "rootCauses": [
    "Causa raiz 1: descrição específica",
    "Causa raiz 2: descrição específica"
  ],
  "impactedAreas": [
    "Área impactada 1",
    "Área impactada 2"
  ],
  "riskLevel": "low | medium | high | critical"
}

**IMPORTANTE**:
- Identifique causas raiz reais, não apenas sintomas
- Liste áreas do código que precisam ser modificadas
- Avalie risco baseado no impacto e complexidade da correção

Retorne APENAS o JSON.
`;
    } else {
      return `
Analise os problemas identificados no code review:

**Issues de Qualidade**:
${JSON.stringify(problemData.data?.codeQuality?.issues || [], null, 2)}

**Vulnerabilidades de Segurança**:
${JSON.stringify(problemData.data?.security?.vulnerabilities || [], null, 2)}

**Violações de Padrões**:
${JSON.stringify(problemData.data?.patterns?.violations || [], null, 2)}

**Score Geral**: ${problemData.data?.summary?.overallScore || 0}/100

Retorne um JSON:

{
  "rootCauses": [
    "Causa raiz 1",
    "Causa raiz 2"
  ],
  "impactedAreas": [
    "Área 1",
    "Área 2"
  ],
  "riskLevel": "low | medium | high | critical"
}

**IMPORTANTE**:
- Agrupe problemas relacionados
- Identifique padrões nas violações
- Priorize correções de segurança

Retorne APENAS o JSON.
`;
    }
  }

  private async createRefinementActions(
    analysis: any,
    problemData: any,
    sourceType: string,
  ): Promise<RefinementAction[]> {
    const prompt = this.buildActionsPrompt(analysis, problemData, sourceType);
    const claudeResponse = await this.callClaude(prompt);
    const actionsData = this.parseClaudeJSON<any>(claudeResponse);

    return (actionsData.actions || []).map((action: any, index: number) => ({
      actionId: `ACT-${String(index + 1).padStart(3, '0')}`,
      type: action.type,
      priority: action.priority,
      description: action.description,
      targetFiles: action.targetFiles || [],
      specificChanges: action.specificChanges || [],
      acceptanceCriteria: action.acceptanceCriteria || [],
      estimatedMinutes: action.estimatedMinutes || 30,
    }));
  }

  private buildActionsPrompt(
    analysis: any,
    problemData: any,
    sourceType: string,
  ): string {
    return `
Com base nesta análise, crie ações de refinamento específicas e executáveis:

**Causas Raiz**:
${analysis.rootCauses.map((c: string) => `- ${c}`).join('\n')}

**Áreas Impactadas**:
${analysis.impactedAreas.map((a: string) => `- ${a}`).join('\n')}

**Nível de Risco**: ${analysis.riskLevel}

**Dados do Problema**:
${JSON.stringify(problemData.data, null, 2).substring(0, 3000)}

Retorne um JSON:

{
  "actions": [
    {
      "type": "fix-bug | refactor | add-test | improve-security | update-doc",
      "priority": "critical | high | medium | low",
      "description": "Descrição clara e específica do que precisa ser feito",
      "targetFiles": [
        "src/path/file1.ts",
        "src/path/file2.ts"
      ],
      "specificChanges": [
        "Mudança específica 1",
        "Mudança específica 2"
      ],
      "acceptanceCriteria": [
        "Critério verificável 1",
        "Critério verificável 2"
      ],
      "estimatedMinutes": 30
    }
  ]
}

**REGRAS**:
1. Cada ação deve ser atômica e executável (15-60 minutos)
2. Priorize correções de segurança e bugs críticos
3. specificChanges deve ser detalhado (não genérico)
4. acceptanceCriteria deve ser objetivo e verificável
5. targetFiles deve listar caminhos reais dos arquivos
6. Agrupe mudanças relacionadas em uma única ação

**TIPOS DE AÇÕES**:
- fix-bug: Corrigir bugs ou falhas de teste
- refactor: Melhorar estrutura/qualidade sem mudar comportamento
- add-test: Adicionar ou melhorar testes
- improve-security: Corrigir vulnerabilidades
- update-doc: Adicionar/melhorar documentação

Retorne APENAS o JSON.
`;
  }

  private determineComplexity(
    actions: RefinementAction[],
    analysis: any,
  ): 'low' | 'medium' | 'high' {
    const criticalActions = actions.filter((a) => a.priority === 'critical').length;
    const totalEstimate = actions.reduce((sum, a) => sum + a.estimatedMinutes, 0);

    if (
      criticalActions > 2 ||
      totalEstimate > 180 ||
      analysis.riskLevel === 'critical'
    ) {
      return 'high';
    } else if (criticalActions > 0 || totalEstimate > 60 || analysis.riskLevel === 'high') {
      return 'medium';
    } else {
      return 'low';
    }
  }

  private determinePriority(
    actions: RefinementAction[],
    analysis: any,
  ): 'critical' | 'high' | 'medium' | 'low' {
    const hasCritical = actions.some((a) => a.priority === 'critical');
    const hasHighPriority = actions.some((a) => a.priority === 'high');

    if (hasCritical || analysis.riskLevel === 'critical') {
      return 'critical';
    } else if (hasHighPriority || analysis.riskLevel === 'high') {
      return 'high';
    } else if (analysis.riskLevel === 'medium') {
      return 'medium';
    } else {
      return 'low';
    }
  }

  private generateRefinementId(context: AgentContext): string {
    const timestamp = Date.now().toString().slice(-6);
    return `REF-${context.featureId.split('-')[2]}-${timestamp}`;
  }

  protected getSystemPrompt(): string {
    return `Você é o Refiner Agent, especializado em análise de problemas e planejamento de correções.

Seu papel é:
1. Analisar falhas de testes ou rejeições de review em profundidade
2. Identificar causas raiz reais (não apenas sintomas)
3. Criar ações de refinamento específicas e executáveis
4. Priorizar correções baseado em impacto e risco
5. Definir critérios de aceitação claros e verificáveis

Contexto técnico:
- Stack: NestJS, TypeScript, TypeORM, PostgreSQL
- Foco: Qualidade, Segurança, Performance, Manutenibilidade

Princípios de análise:
- Sempre busque a causa raiz, não o sintoma
- Agrupe problemas relacionados
- Priorize segurança e bugs críticos
- Seja específico nas mudanças (evite genericidade)
- Estime esforço de forma realista

Critérios de priorização:
- Critical: Segurança, bugs que impedem uso
- High: Funcionalidade principal quebrada
- Medium: Problemas que afetam qualidade
- Low: Melhorias cosméticas

Pense como um desenvolvedor sênior que planeja correções eficientes e precisas.`;
  }
}
