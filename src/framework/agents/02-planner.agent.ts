import { Injectable } from '@nestjs/common';
import { BaseAgent } from './base-agent';
import {
  AgentContext,
  FeatureAnalysis,
  ExecutionPlan,
} from '../types/agent-types';
import { ArtifactStore } from '../storage/artifact-store';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class PlannerAgent extends BaseAgent<FeatureAnalysis, ExecutionPlan> {
  constructor(artifactStore: ArtifactStore, eventEmitter: EventEmitter2) {
    super(artifactStore, eventEmitter);
  }

  protected async validateInput(input: FeatureAnalysis): Promise<void> {
    if (!input.featureId) {
      throw new Error('featureId é obrigatório');
    }

    if (!input.requirements || input.requirements.functional.length === 0) {
      throw new Error('Requisitos funcionais são obrigatórios para planejamento');
    }
  }

  protected async validateOutput(output: ExecutionPlan): Promise<void> {
    if (!output.planId) {
      throw new Error('planId não foi gerado');
    }

    if (!output.phases || output.phases.length === 0) {
      throw new Error('Nenhuma fase foi planejada');
    }

    if (!output.architecture || !output.architecture.components) {
      throw new Error('Arquitetura não foi definida');
    }
  }

  protected getNextAgent(output: ExecutionPlan, context: AgentContext): string {
    return 'TaskCreatorAgent';
  }

  protected getArtifactPath(context: AgentContext): string {
    return `${context.featureId}/02-planning/execution-plan.json`;
  }

  protected getArtifactFilename(): string {
    return 'execution-plan.json';
  }

  protected async process(
    input: FeatureAnalysis,
    context: AgentContext,
  ): Promise<ExecutionPlan> {
    this.logger.log(`Planejando execução para: ${input.feature.title}`);

    // Construir prompt para Claude
    const prompt = this.buildPlanningPrompt(input);

    // Chamar Claude
    const claudeResponse = await this.callClaude(prompt);

    // Parsear resposta
    const planData = this.parseClaudeJSON<any>(claudeResponse);

    // Construir ExecutionPlan estruturado
    const plan: ExecutionPlan = {
      planId: this.generatePlanId(context),
      featureId: input.featureId,
      timestamp: new Date().toISOString(),
      planner: {
        agentVersion: this.agentVersion,
        planningDate: new Date().toISOString().split('T')[0],
      },
      architecture: {
        approach: planData.approach || 'modular',
        patterns: planData.patterns || [],
        components: planData.components || [],
      },
      phases: planData.phases || [],
      acceptanceCriteria: planData.acceptanceCriteria || [],
      estimatedTotalHours: this.calculateTotalHours(planData.phases || []),
      nextAgent: 'TaskCreatorAgent',
    };

    return plan;
  }

  private buildPlanningPrompt(input: FeatureAnalysis): string {
    return `
Com base nesta análise de feature, crie um plano de execução técnico detalhado:

**Feature**: ${input.feature.title}
**Complexidade**: ${input.impact.estimatedComplexity}

**Requisitos Funcionais**:
${input.requirements.functional.map((r) => `- ${r.id}: ${r.description}`).join('\n')}

**Requisitos Não-Funcionais**:
${input.requirements.nonFunctional.map((r) => `- ${r.id} (${r.type}): ${r.description}`).join('\n')}

**Módulos Afetados**: ${input.impact.modules.join(', ')}
**Databases**: ${input.impact.databases.join(', ')}
**Serviços Externos**: ${input.impact.externalServices.join(', ')}

Retorne um JSON com a seguinte estrutura:

{
  "approach": "event-driven | layered | microservices | modular-monolith",
  "patterns": ["lista de design patterns a usar: Repository, Service, Factory, Observer, etc"],
  "components": [
    {
      "name": "Nome do componente (ex: NotificationService)",
      "type": "backend-service | frontend-component | database-table | api-endpoint | worker",
      "action": "create | modify | delete",
      "technology": "NestJS | React | PostgreSQL | etc"
    }
  ],
  "phases": [
    {
      "phaseId": "P1",
      "name": "Nome da fase (ex: Database & Entities)",
      "order": 1,
      "estimatedHours": 4,
      "components": ["lista de componentes desta fase"],
      "dependencies": ["lista de phaseIds que devem ser completados antes, se houver"]
    }
  ],
  "acceptanceCriteria": [
    {
      "id": "AC-001",
      "description": "Critério de aceitação testável",
      "type": "functional | performance | security | usability",
      "testable": true
    }
  ]
}

**IMPORTANTE**:
- Defina fases lógicas de implementação (Database, Backend, Frontend, Tests, etc)
- Liste TODOS os componentes necessários (services, controllers, entities, DTOs, components, etc)
- Estime horas realistas para cada fase
- Critérios de aceitação devem ser objetivos e testáveis
- Considere a complexidade: ${input.impact.estimatedComplexity}

Retorne APENAS o JSON, sem explicações.
`;
  }

  private calculateTotalHours(phases: any[]): number {
    return phases.reduce((total, phase) => total + (phase.estimatedHours || 0), 0);
  }

  private generatePlanId(context: AgentContext): string {
    const timestamp = Date.now().toString().slice(-6);
    return `PLAN-${context.featureId.split('-')[2]}-${timestamp}`;
  }

  protected getSystemPrompt(): string {
    return `Você é o Planner Agent, especializado em planejamento técnico de software.

Seu papel é:
1. Definir arquitetura e padrões apropriados para a feature
2. Listar todos os componentes necessários (backend, frontend, database)
3. Organizar implementação em fases lógicas e sequenciais
4. Estimar esforço de forma realista
5. Definir critérios de aceitação testáveis

Contexto técnico:
- Stack: NestJS (backend), React (frontend), PostgreSQL (database), TypeScript
- Arquitetura: Modular monolith com separação de responsabilidades
- Padrões comuns: Repository, Service, DTO, Guards, Decorators, Hooks
- Testes: Jest (unit), Supertest (integration), Playwright (E2E)

Pense como um arquiteto de software experiente que planeja implementações práticas e viáveis.`;
  }
}
