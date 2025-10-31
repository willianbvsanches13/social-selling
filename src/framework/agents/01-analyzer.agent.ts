import { Injectable } from '@nestjs/common';
import { BaseAgent } from './base-agent';
import {
  AgentContext,
  FeatureRequest,
  FeatureAnalysis,
} from '../types/agent-types';
import { ArtifactStore } from '../storage/artifact-store';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class AnalyzerAgent extends BaseAgent<FeatureRequest, FeatureAnalysis> {
  constructor(artifactStore: ArtifactStore, eventEmitter: EventEmitter2) {
    super(artifactStore, eventEmitter);
  }

  protected async validateInput(input: FeatureRequest): Promise<void> {
    if (!input.title || input.title.trim().length === 0) {
      throw new Error('Feature title é obrigatório');
    }

    if (!input.description || input.description.trim().length < 10) {
      throw new Error('Feature description deve ter pelo menos 10 caracteres');
    }

    if (!['low', 'medium', 'high', 'critical'].includes(input.priority)) {
      throw new Error('Priority deve ser: low, medium, high ou critical');
    }
  }

  protected async validateOutput(output: FeatureAnalysis): Promise<void> {
    if (!output.featureId) {
      throw new Error('featureId não foi gerado');
    }

    if (!output.requirements || output.requirements.functional.length === 0) {
      throw new Error('Nenhum requisito funcional foi extraído');
    }

    if (!output.impact || !output.impact.modules) {
      throw new Error('Análise de impacto incompleta');
    }
  }

  protected getNextAgent(output: FeatureAnalysis, context: AgentContext): string {
    return 'PlannerAgent';
  }

  protected getArtifactPath(context: AgentContext): string {
    return `${context.featureId}/01-analysis/feature-analysis.json`;
  }

  protected getArtifactFilename(): string {
    return 'feature-analysis.json';
  }

  protected async process(
    input: FeatureRequest,
    context: AgentContext,
  ): Promise<FeatureAnalysis> {
    this.logger.log(`Analisando feature: ${input.title}`);

    // Construir prompt para Claude
    const prompt = this.buildAnalysisPrompt(input);

    // Chamar Claude
    const claudeResponse = await this.callClaude(prompt);

    // Parsear resposta
    const analysisData = this.parseClaudeJSON<any>(claudeResponse);

    // Construir FeatureAnalysis estruturado
    const analysis: FeatureAnalysis = {
      featureId: context.featureId,
      timestamp: new Date().toISOString(),
      analyzer: {
        agentVersion: this.agentVersion,
        analysisDate: new Date().toISOString().split('T')[0],
      },
      feature: {
        title: input.title,
        description: input.description,
        category: analysisData.category || this.categorizeFeature(input),
        priority: input.priority,
        businessValue: analysisData.businessValue || 'To be defined',
      },
      requirements: {
        functional: analysisData.functionalRequirements || [],
        nonFunctional: analysisData.nonFunctionalRequirements || [],
      },
      impact: {
        modules: analysisData.modulesAffected || [],
        databases: analysisData.databasesAffected || [],
        externalServices: analysisData.externalServices || [],
        estimatedComplexity: analysisData.complexity || 'medium',
      },
      dependencies: analysisData.dependencies || [],
      risks: analysisData.risks || [],
      nextAgent: 'PlannerAgent',
    };

    return analysis;
  }

  private buildAnalysisPrompt(input: FeatureRequest): string {
    return `
Analise esta feature request e extraia informações estruturadas:

**Feature Title**: ${input.title}
**Description**: ${input.description}
**Priority**: ${input.priority}

Você deve extrair e retornar um JSON com a seguinte estrutura:

{
  "category": "tipo da feature (ex: enhancement, new-feature, bug-fix, refactoring)",
  "businessValue": "valor de negócio estimado",
  "functionalRequirements": [
    {
      "id": "FR-001",
      "description": "descrição clara do requisito",
      "priority": "must-have | should-have | could-have"
    }
  ],
  "nonFunctionalRequirements": [
    {
      "id": "NFR-001",
      "type": "performance | security | scalability | usability",
      "description": "descrição do requisito"
    }
  ],
  "modulesAffected": ["lista de módulos que serão impactados"],
  "databasesAffected": ["lista de databases/schemas afetados"],
  "externalServices": ["serviços externos necessários ou impactados"],
  "complexity": "low | medium | high | critical",
  "dependencies": [
    {
      "type": "feature | service | library | configuration",
      "name": "nome da dependência",
      "action": "required | optional | integrate | extend"
    }
  ],
  "risks": [
    {
      "description": "descrição do risco",
      "severity": "low | medium | high | critical",
      "mitigation": "estratégia de mitigação"
    }
  ]
}

**IMPORTANTE**:
- Seja específico nos requisitos funcionais (RF-001, RF-002, etc)
- Identifique requisitos não-funcionais importantes (performance, segurança)
- Liste TODOS os módulos que podem ser afetados
- Identifique riscos técnicos reais
- Estime complexidade baseado em: módulos afetados, integrações, mudanças de schema

Retorne APENAS o JSON, sem explicações adicionais.
`;
  }

  private categorizeFeature(input: FeatureRequest): string {
    const title = input.title.toLowerCase();
    const desc = input.description.toLowerCase();

    if (title.includes('fix') || desc.includes('fix') || desc.includes('bug')) {
      return 'bug-fix';
    }

    if (
      title.includes('refactor') ||
      desc.includes('refactor') ||
      desc.includes('improve')
    ) {
      return 'refactoring';
    }

    if (
      title.includes('add') ||
      title.includes('create') ||
      title.includes('new') ||
      desc.includes('add new')
    ) {
      return 'new-feature';
    }

    if (
      title.includes('update') ||
      title.includes('enhance') ||
      title.includes('extend')
    ) {
      return 'enhancement';
    }

    return 'enhancement';
  }

  protected getSystemPrompt(): string {
    return `Você é o Analyzer Agent, especializado em análise de requisitos de software.

Seu papel é:
1. Extrair requisitos funcionais e não-funcionais de forma clara e testável
2. Identificar módulos, databases e serviços afetados
3. Avaliar complexidade técnica de forma realista
4. Identificar riscos técnicos e dependências
5. Categorizar a feature corretamente

Contexto técnico:
- Stack: NestJS, TypeORM, PostgreSQL, React, TypeScript
- Arquitetura: Modular monolith com separação clara de responsabilidades
- Padrões: Repository, Service, DTO, Guards

Seja preciso, técnico e objetivo. Pense como um arquiteto de software experiente.`;
  }
}
