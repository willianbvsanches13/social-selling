import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { WorkflowOrchestrator } from './orchestrator/workflow-orchestrator';
import { FeatureRequest } from './types/agent-types';

class StartWorkflowDto {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  requestedBy: string;
}

@Controller('framework')
export class FrameworkController {
  constructor(private readonly orchestrator: WorkflowOrchestrator) {}

  /**
   * Inicia um novo workflow de feature
   */
  @Post('workflow/start')
  @HttpCode(HttpStatus.ACCEPTED)
  async startWorkflow(@Body() dto: StartWorkflowDto) {
    // Validar input
    if (!dto.title || dto.title.trim().length === 0) {
      throw new BadRequestException('title é obrigatório');
    }

    if (!dto.description || dto.description.trim().length < 10) {
      throw new BadRequestException(
        'description deve ter pelo menos 10 caracteres',
      );
    }

    if (!['low', 'medium', 'high', 'critical'].includes(dto.priority)) {
      throw new BadRequestException(
        'priority deve ser: low, medium, high ou critical',
      );
    }

    // Criar feature request
    const request: FeatureRequest = {
      title: dto.title,
      description: dto.description,
      priority: dto.priority,
      requestedBy: dto.requestedBy || 'api-user',
    };

    // Iniciar workflow
    const featureId = await this.orchestrator.startWorkflow(request);

    return {
      success: true,
      featureId,
      message: 'Workflow iniciado com sucesso',
      status: 'running',
    };
  }

  /**
   * Obtém status de um workflow específico
   */
  @Get('workflow/:featureId/status')
  async getWorkflowStatus(@Param('featureId') featureId: string) {
    const state = this.orchestrator.getWorkflowStatus(featureId);

    if (!state) {
      throw new NotFoundException(`Workflow ${featureId} não encontrado`);
    }

    return {
      success: true,
      featureId,
      status: state.status,
      currentAgent: state.currentAgent,
      iteration: state.iteration,
      maxIterations: state.maxIterations,
      startedAt: state.startedAt,
      completedAt: state.completedAt,
      duration: state.completedAt
        ? Math.round(
            (state.completedAt.getTime() - state.startedAt.getTime()) / 1000,
          )
        : null,
      history: state.history.map((h) => ({
        agentId: h.agentId,
        iteration: h.iteration,
        success: h.success,
        duration: h.duration,
        timestamp: h.timestamp,
      })),
      artifacts: state.artifacts,
      error: state.error,
    };
  }

  /**
   * Lista todos os workflows ativos
   */
  @Get('workflows/active')
  async listActiveWorkflows() {
    const workflows = this.orchestrator.listActiveWorkflows();

    return {
      success: true,
      count: workflows.length,
      workflows: workflows.map((w) => ({
        featureId: w.featureId,
        currentAgent: w.currentAgent,
        status: w.status,
        iteration: w.iteration,
        startedAt: w.startedAt,
      })),
    };
  }

  /**
   * Healthcheck do framework
   */
  @Get('health')
  async healthCheck() {
    const activeWorkflows = this.orchestrator.listActiveWorkflows();

    return {
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      activeWorkflows: activeWorkflows.length,
      agents: [
        'AnalyzerAgent',
        'PlannerAgent',
        'TaskCreatorAgent',
        'ExecutorAgent',
        'E2ETesterAgent',
        'ReviewerAgent',
        'RefinerAgent',
        'DelivererAgent',
      ],
    };
  }
}
