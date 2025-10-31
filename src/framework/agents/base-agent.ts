import { Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { AgentContext, AgentResult } from '../types/agent-types';
import { ArtifactStore } from '../storage/artifact-store';
import { EventEmitter2 } from '@nestjs/event-emitter';

export abstract class BaseAgent<TInput, TOutput> {
  protected readonly logger: Logger;
  protected readonly anthropic: Anthropic;
  protected readonly agentId: string;
  protected readonly agentVersion = '1.0.0';

  constructor(
    protected readonly artifactStore: ArtifactStore,
    protected readonly eventEmitter: EventEmitter2,
  ) {
    this.agentId = this.constructor.name;
    this.logger = new Logger(this.agentId);

    // Inicializar Claude API
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Executa o agente completo: valida, processa, salva e notifica
   */
  async execute(input: TInput, context: AgentContext): Promise<AgentResult<TOutput>> {
    const startTime = Date.now();

    try {
      this.logger.log(`[${context.featureId}] Iniciando execução (iteração ${context.iteration})...`);

      // 1. Validar input
      await this.validateInput(input);

      // 2. Processar (lógica específica do agente)
      const output = await this.process(input, context);

      // 3. Validar output
      await this.validateOutput(output);

      // 4. Salvar artefato
      const artifactPath = await this.saveArtifact(output, context);

      // 5. Determinar próximo agente
      const nextAgent = this.getNextAgent(output, context);

      const duration = Date.now() - startTime;
      this.logger.log(`[${context.featureId}] Concluído em ${duration}ms. Próximo: ${nextAgent || 'FIM'}`);

      const result: AgentResult<TOutput> = {
        success: true,
        agentId: this.agentId,
        output,
        nextAgent,
        artifactPath,
        metadata: {
          duration,
          timestamp: new Date().toISOString(),
          iteration: context.iteration,
        },
      };

      // 6. Emitir evento para orquestrador
      if (nextAgent) {
        this.eventEmitter.emit('agent.completed', {
          featureId: context.featureId,
          agentId: this.agentId,
          nextAgent,
          result,
        });
      } else {
        this.eventEmitter.emit('workflow.completed', {
          featureId: context.featureId,
          agentId: this.agentId,
          result,
        });
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`[${context.featureId}] Erro: ${error.message}`, error.stack);

      const result: AgentResult<TOutput> = {
        success: false,
        agentId: this.agentId,
        error: error.message,
        nextAgent: null,
        artifactPath: '',
        metadata: {
          duration,
          timestamp: new Date().toISOString(),
          iteration: context.iteration,
        },
      };

      this.eventEmitter.emit('agent.failed', {
        featureId: context.featureId,
        agentId: this.agentId,
        error: error.message,
        result,
      });

      return result;
    }
  }

  /**
   * Lógica principal do agente - DEVE ser implementada por cada agente
   */
  protected abstract process(input: TInput, context: AgentContext): Promise<TOutput>;

  /**
   * Valida o input antes de processar
   */
  protected abstract validateInput(input: TInput): Promise<void>;

  /**
   * Valida o output após processar
   */
  protected abstract validateOutput(output: TOutput): Promise<void>;

  /**
   * Determina o próximo agente no fluxo
   */
  protected abstract getNextAgent(output: TOutput, context: AgentContext): string | null;

  /**
   * Gera o caminho do artefato para este agente
   */
  protected abstract getArtifactPath(context: AgentContext): string;

  /**
   * Nome do arquivo do artefato
   */
  protected abstract getArtifactFilename(): string;

  /**
   * Salva o artefato no storage
   */
  private async saveArtifact(output: TOutput, context: AgentContext): Promise<string> {
    const artifactPath = this.getArtifactPath(context);
    await this.artifactStore.save(artifactPath, output);
    this.logger.debug(`[${context.featureId}] Artefato salvo: ${artifactPath}`);
    return artifactPath;
  }

  /**
   * Helper para chamar Claude API com prompt estruturado
   */
  protected async callClaude(prompt: string, systemPrompt?: string): Promise<string> {
    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 8192,
        system: systemPrompt || this.getSystemPrompt(),
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const content = message.content[0];
      if (content.type === 'text') {
        return content.text;
      }

      throw new Error('Claude retornou resposta não-texto');
    } catch (error) {
      this.logger.error(`Erro ao chamar Claude: ${error.message}`);
      throw new Error(`Falha na comunicação com Claude: ${error.message}`);
    }
  }

  /**
   * System prompt padrão do agente - pode ser sobrescrito
   */
  protected getSystemPrompt(): string {
    return `Você é o ${this.agentId}, um agente especializado do framework de entrega de features.
Seu trabalho é executar sua tarefa específica com precisão e gerar output estruturado em JSON.
Seja objetivo, técnico e preciso em suas análises.`;
  }

  /**
   * Helper para parsear resposta JSON do Claude
   */
  protected parseClaudeJSON<T>(response: string): T {
    try {
      // Remover markdown code blocks se existirem
      const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleaned);
    } catch (error) {
      this.logger.error(`Erro ao parsear JSON do Claude: ${error.message}`);
      this.logger.debug(`Resposta original: ${response.substring(0, 500)}...`);
      throw new Error(`Resposta do Claude não é JSON válido: ${error.message}`);
    }
  }

  /**
   * Helper para carregar artefato anterior
   */
  protected async loadPreviousArtifact<T>(artifactName: string, context: AgentContext): Promise<T | null> {
    try {
      const path = context.previousArtifacts[artifactName];
      if (!path) {
        return null;
      }
      return await this.artifactStore.load<T>(path);
    } catch (error) {
      this.logger.warn(`Não foi possível carregar artefato ${artifactName}: ${error.message}`);
      return null;
    }
  }
}
