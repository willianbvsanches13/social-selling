import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Storage
import { ArtifactStore } from './storage/artifact-store';

// Agents
import { AnalyzerAgent } from './agents/01-analyzer.agent';
import { PlannerAgent } from './agents/02-planner.agent';
import { TaskCreatorAgent } from './agents/03-task-creator.agent';
import { ExecutorAgent } from './agents/04-executor.agent';
import { E2ETesterAgent } from './agents/05-e2e-tester.agent';
import { ReviewerAgent } from './agents/06-reviewer.agent';
import { RefinerAgent } from './agents/07-refiner.agent';
import { DelivererAgent } from './agents/08-deliverer.agent';

// Orchestrator
import { WorkflowOrchestrator } from './orchestrator/workflow-orchestrator';

// Controller
import { FrameworkController } from './framework.controller';

@Module({
  imports: [
    EventEmitterModule.forRoot({
      // Configuração do event emitter
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: true,
      ignoreErrors: false,
    }),
  ],
  controllers: [FrameworkController],
  providers: [
    // Storage
    ArtifactStore,

    // All 8 agents
    AnalyzerAgent,
    PlannerAgent,
    TaskCreatorAgent,
    ExecutorAgent,
    E2ETesterAgent,
    ReviewerAgent,
    RefinerAgent,
    DelivererAgent,

    // Orchestrator
    WorkflowOrchestrator,
  ],
  exports: [
    // Exportar para uso em outros módulos
    WorkflowOrchestrator,
    ArtifactStore,
  ],
})
export class FrameworkModule {}
