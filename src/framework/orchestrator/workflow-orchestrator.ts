import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import {
  FeatureRequest,
  AgentContext,
  WorkflowState,
} from '../types/agent-types';
import { ArtifactStore } from '../storage/artifact-store';
import { BaseAgent } from '../agents/base-agent';

// Import all agents
import { AnalyzerAgent } from '../agents/01-analyzer.agent';
import { PlannerAgent } from '../agents/02-planner.agent';
import { TaskCreatorAgent } from '../agents/03-task-creator.agent';
import { ExecutorAgent } from '../agents/04-executor.agent';
import { E2ETesterAgent } from '../agents/05-e2e-tester.agent';
import { ReviewerAgent } from '../agents/06-reviewer.agent';
import { RefinerAgent } from '../agents/07-refiner.agent';
import { DelivererAgent } from '../agents/08-deliverer.agent';

interface AgentCompletedEvent {
  featureId: string;
  agentId: string;
  nextAgent: string;
  result: any;
}

interface AgentFailedEvent {
  featureId: string;
  agentId: string;
  error: string;
  result: any;
}

@Injectable()
export class WorkflowOrchestrator implements OnModuleInit {
  private readonly logger = new Logger(WorkflowOrchestrator.name);
  private workflows = new Map<string, WorkflowState>();
  private agentRegistry = new Map<string, BaseAgent<any, any>>();

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly artifactStore: ArtifactStore,
    // Inject all agents
    private readonly analyzerAgent: AnalyzerAgent,
    private readonly plannerAgent: PlannerAgent,
    private readonly taskCreatorAgent: TaskCreatorAgent,
    private readonly executorAgent: ExecutorAgent,
    private readonly e2eTesterAgent: E2ETesterAgent,
    private readonly reviewerAgent: ReviewerAgent,
    private readonly refinerAgent: RefinerAgent,
    private readonly delivererAgent: DelivererAgent,
  ) {}

  onModuleInit() {
    // Register all agents
    this.registerAgent('AnalyzerAgent', this.analyzerAgent);
    this.registerAgent('PlannerAgent', this.plannerAgent);
    this.registerAgent('TaskCreatorAgent', this.taskCreatorAgent);
    this.registerAgent('ExecutorAgent', this.executorAgent);
    this.registerAgent('E2ETesterAgent', this.e2eTesterAgent);
    this.registerAgent('ReviewerAgent', this.reviewerAgent);
    this.registerAgent('RefinerAgent', this.refinerAgent);
    this.registerAgent('DelivererAgent', this.delivererAgent);

    this.logger.log('WorkflowOrchestrator initialized with 8 agents');
  }

  private registerAgent(name: string, agent: BaseAgent<any, any>) {
    this.agentRegistry.set(name, agent);
    this.logger.debug(`Registered agent: ${name}`);
  }

  /**
   * Inicia um novo workflow de feature
   */
  async startWorkflow(request: FeatureRequest): Promise<string> {
    const featureId = this.generateFeatureId();
    const workflowId = `WF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    this.logger.log(`[${featureId}] Iniciando workflow para: ${request.title}`);

    // Criar estado do workflow
    const state: WorkflowState = {
      id: workflowId,
      featureId,
      currentAgent: 'AnalyzerAgent',
      status: 'running',
      iteration: 1,
      maxIterations: parseInt(process.env.MAX_ITERATIONS || '5', 10),
      history: [],
      startedAt: new Date(),
      artifacts: {},
    };

    this.workflows.set(featureId, state);

    // Criar contexto inicial
    const context: AgentContext = {
      featureId,
      iteration: 1,
      previousArtifacts: {},
      metadata: {
        startedAt: new Date(),
        requestedBy: request.requestedBy,
        priority: request.priority,
      },
    };

    // Executar primeiro agente (Analyzer) de forma assíncrona
    this.executeAgent('AnalyzerAgent', request, context).catch((error) => {
      this.logger.error(`[${featureId}] Erro ao executar AnalyzerAgent:`, error);
      this.handleWorkflowFailure(featureId, error.message);
    });

    return featureId;
  }

  /**
   * Executa um agente específico
   */
  private async executeAgent(
    agentName: string,
    input: any,
    context: AgentContext,
  ): Promise<void> {
    const state = this.workflows.get(context.featureId);
    if (!state) {
      throw new Error(`Workflow ${context.featureId} não encontrado`);
    }

    // Verificar limite de iterações
    if (state.iteration > state.maxIterations) {
      throw new Error(
        `Max iterations (${state.maxIterations}) exceeded for ${context.featureId}`,
      );
    }

    const agent = this.agentRegistry.get(agentName);
    if (!agent) {
      throw new Error(`Agent ${agentName} não encontrado no registry`);
    }

    this.logger.log(
      `[${context.featureId}] Executando ${agentName} (iteração ${state.iteration})`,
    );

    // Atualizar estado
    state.currentAgent = agentName;

    // Executar agente
    const result = await agent.execute(input, context);

    // Registrar no histórico
    state.history.push({
      agentId: agentName,
      iteration: state.iteration,
      success: result.success,
      duration: result.metadata.duration,
      timestamp: result.metadata.timestamp,
    });

    // Salvar caminho do artefato
    if (result.artifactPath) {
      state.artifacts[agentName] = result.artifactPath;
    }

    // O evento 'agent.completed' ou 'agent.failed' será emitido pelo agente
    // e tratado pelos handlers abaixo
  }

  /**
   * Handler quando um agente completa com sucesso
   */
  @OnEvent('agent.completed')
  async handleAgentCompleted(event: AgentCompletedEvent) {
    const { featureId, agentId, nextAgent, result } = event;
    const state = this.workflows.get(featureId);

    if (!state) {
      this.logger.error(`[${featureId}] Workflow não encontrado`);
      return;
    }

    this.logger.log(
      `[${featureId}] ${agentId} completou. Próximo: ${nextAgent || 'FIM'}`,
    );

    if (!nextAgent) {
      // Workflow completou!
      await this.handleWorkflowCompletion(featureId);
      return;
    }

    // Preparar input para próximo agente
    const nextInput = await this.prepareNextAgentInput(
      featureId,
      agentId,
      nextAgent,
      result.output,
    );

    // Criar contexto atualizado
    const context: AgentContext = {
      featureId,
      iteration: state.iteration,
      previousArtifacts: { ...state.artifacts },
      metadata: {
        startedAt: state.startedAt,
        requestedBy: state.history[0]?.agentId || 'system',
        priority: 'high', // TODO: pegar da request original
      },
    };

    // Executar próximo agente
    await this.executeAgent(nextAgent, nextInput, context).catch((error) => {
      this.logger.error(`[${featureId}] Erro ao executar ${nextAgent}:`, error);
      this.handleWorkflowFailure(featureId, error.message);
    });
  }

  /**
   * Handler quando um agente falha
   */
  @OnEvent('agent.failed')
  async handleAgentFailed(event: AgentFailedEvent) {
    const { featureId, agentId, error } = event;
    this.logger.error(`[${featureId}] ${agentId} falhou: ${error}`);
    await this.handleWorkflowFailure(featureId, error);
  }

  /**
   * Prepara input para o próximo agente baseado no output do agente anterior
   */
  private async prepareNextAgentInput(
    featureId: string,
    currentAgent: string,
    nextAgent: string,
    currentOutput: any,
  ): Promise<any> {
    // A maioria dos agentes usa o output do anterior como input
    // Casos especiais são tratados aqui

    if (nextAgent === 'RefinerAgent') {
      // Refiner precisa saber se veio do Tester ou Reviewer
      const state = this.workflows.get(featureId);
      const lastAgent = state?.history[state.history.length - 1]?.agentId;

      return {
        ...currentOutput,
        triggerSource: {
          type: lastAgent === 'E2ETesterAgent' ? 'test-failure' : 'review-rejection',
          sourceId: currentOutput.testResultsId || currentOutput.reviewId,
        },
      };
    }

    // Para outros agentes, passar o output atual
    return currentOutput;
  }

  /**
   * Handler quando workflow completa com sucesso
   */
  private async handleWorkflowCompletion(featureId: string) {
    const state = this.workflows.get(featureId);
    if (!state) return;

    state.status = 'completed';
    state.completedAt = new Date();
    state.currentAgent = null;

    const duration = state.completedAt.getTime() - state.startedAt.getTime();
    const durationHours = (duration / (1000 * 60 * 60)).toFixed(2);

    this.logger.log(
      `[${featureId}] ✅ Workflow COMPLETADO com sucesso! Duração: ${durationHours}h`,
    );
    this.logger.log(`[${featureId}] Iterações: ${state.iteration}`);
    this.logger.log(`[${featureId}] Agentes executados: ${state.history.length}`);

    // Emitir evento de conclusão
    this.eventEmitter.emit('workflow.completed', {
      featureId,
      status: 'success',
      duration: durationHours,
      iterations: state.iteration,
      history: state.history,
    });
  }

  /**
   * Handler quando workflow falha
   */
  private async handleWorkflowFailure(featureId: string, error: string) {
    const state = this.workflows.get(featureId);
    if (!state) return;

    state.status = 'failed';
    state.completedAt = new Date();
    state.error = error;
    state.currentAgent = null;

    this.logger.error(`[${featureId}] ❌ Workflow FALHOU: ${error}`);

    // Emitir evento de falha
    this.eventEmitter.emit('workflow.failed', {
      featureId,
      error,
      history: state.history,
    });
  }

  /**
   * Obtém status de um workflow
   */
  getWorkflowStatus(featureId: string): WorkflowState | undefined {
    return this.workflows.get(featureId);
  }

  /**
   * Lista todos os workflows ativos
   */
  listActiveWorkflows(): WorkflowState[] {
    return Array.from(this.workflows.values()).filter((w) => w.status === 'running');
  }

  /**
   * Gera ID único para feature
   */
  private generateFeatureId(): string {
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-6);
    return `FEAT-${year}-${timestamp}`;
  }
}
