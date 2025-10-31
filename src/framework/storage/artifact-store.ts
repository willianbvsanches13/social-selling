import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';

@Injectable()
export class ArtifactStore {
  private readonly logger = new Logger(ArtifactStore.name);
  private readonly baseDir: string;

  constructor() {
    this.baseDir = process.env.ARTIFACTS_DIR || './artifacts';
  }

  /**
   * Salva um artefato em formato JSON
   */
  async save<T>(artifactPath: string, data: T): Promise<void> {
    try {
      const fullPath = path.join(this.baseDir, artifactPath);
      const dir = path.dirname(fullPath);

      // Criar diretório se não existir
      await fs.mkdir(dir, { recursive: true });

      // Salvar JSON formatado
      const json = JSON.stringify(data, null, 2);
      await fs.writeFile(fullPath, json, 'utf-8');

      this.logger.debug(`Artefato salvo: ${artifactPath}`);
    } catch (error) {
      this.logger.error(`Erro ao salvar artefato ${artifactPath}: ${error.message}`);
      throw new Error(`Falha ao salvar artefato: ${error.message}`);
    }
  }

  /**
   * Carrega um artefato do storage
   */
  async load<T>(artifactPath: string): Promise<T> {
    try {
      const fullPath = path.join(this.baseDir, artifactPath);
      const content = await fs.readFile(fullPath, 'utf-8');
      return JSON.parse(content) as T;
    } catch (error) {
      this.logger.error(`Erro ao carregar artefato ${artifactPath}: ${error.message}`);
      throw new Error(`Falha ao carregar artefato: ${error.message}`);
    }
  }

  /**
   * Verifica se um artefato existe
   */
  async exists(artifactPath: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.baseDir, artifactPath);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Lista todos os artefatos de uma feature
   */
  async listFeatureArtifacts(featureId: string): Promise<string[]> {
    try {
      const featurePath = path.join(this.baseDir, featureId);
      const files: string[] = [];

      async function scanDir(dir: string): Promise<void> {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            await scanDir(fullPath);
          } else if (entry.name.endsWith('.json')) {
            files.push(fullPath);
          }
        }
      }

      await scanDir(featurePath);
      return files;
    } catch (error) {
      this.logger.warn(`Erro ao listar artefatos de ${featureId}: ${error.message}`);
      return [];
    }
  }

  /**
   * Remove todos os artefatos de uma feature
   */
  async deleteFeatureArtifacts(featureId: string): Promise<void> {
    try {
      const featurePath = path.join(this.baseDir, featureId);
      await fs.rm(featurePath, { recursive: true, force: true });
      this.logger.log(`Artefatos de ${featureId} removidos`);
    } catch (error) {
      this.logger.error(`Erro ao remover artefatos de ${featureId}: ${error.message}`);
      throw new Error(`Falha ao remover artefatos: ${error.message}`);
    }
  }
}
