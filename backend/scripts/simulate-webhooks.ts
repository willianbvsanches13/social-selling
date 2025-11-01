#!/usr/bin/env ts-node
/**
 * Script para simular webhooks do Instagram
 *
 * Uso:
 *   npm run simulate-webhooks              # Envia todos os webhooks
 *   npm run simulate-webhooks -- --index 0 # Envia apenas o webhook no índice 0
 *   npm run simulate-webhooks -- --delay 2000 # Delay de 2s entre webhooks
 */

import axios from 'axios';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

interface WebhookPayload {
  description: string;
  payload: any;
}

interface WebhookData {
  webhooks: WebhookPayload[];
}

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';
const WEBHOOK_ENDPOINT = '/api/instagram/webhooks';
const DEFAULT_DELAY = 1000; // 1 segundo entre webhooks

// Use test secret for local development
// In production, Instagram uses the real APP_SECRET from your Facebook App
const APP_SECRET = process.env.INSTAGRAM_APP_SECRET || 'test-secret-for-local-development';

/**
 * Generate HMAC SHA256 signature for webhook payload
 * This matches Instagram's webhook signature format
 */
function generateSignature(payload: string): string {
  const hmac = crypto.createHmac('sha256', APP_SECRET);
  hmac.update(payload);
  return 'sha256=' + hmac.digest('hex');
}

async function sendWebhook(payload: any, description: string): Promise<void> {
  try {
    console.log(`\n📤 Enviando: ${description}`);
    console.log(`📍 URL: ${BACKEND_URL}${WEBHOOK_ENDPOINT}`);

    // Convert payload to JSON string (must match exactly what's sent in the body)
    const payloadString = JSON.stringify(payload);

    // Generate proper HMAC signature
    const signature = generateSignature(payloadString);

    const response = await axios.post(
      `${BACKEND_URL}${WEBHOOK_ENDPOINT}`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Hub-Signature-256': signature,
        },
      }
    );

    console.log(`✅ Sucesso! Status: ${response.status}`);
    if (response.data) {
      console.log(`📦 Resposta:`, JSON.stringify(response.data, null, 2));
    }
  } catch (error: any) {
    console.error(`❌ Erro ao enviar webhook:`, {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const args = process.argv.slice(2);
  const indexArg = args.find(arg => arg.startsWith('--index='));
  const delayArg = args.find(arg => arg.startsWith('--delay='));

  const specificIndex = indexArg ? parseInt(indexArg.split('=')[1]) : null;
  const delay = delayArg ? parseInt(delayArg.split('=')[1]) : DEFAULT_DELAY;

  // Carrega os webhooks do arquivo JSON
  const fixturesPath = path.join(__dirname, '../test/fixtures/instagram-webhooks.json');
  const webhookData: WebhookData = JSON.parse(fs.readFileSync(fixturesPath, 'utf-8'));

  console.log('🚀 Simulador de Webhooks do Instagram');
  console.log('=====================================');
  console.log(`📡 Backend URL: ${BACKEND_URL}`);
  console.log(`⏱️  Delay entre webhooks: ${delay}ms`);
  console.log(`📊 Total de webhooks disponíveis: ${webhookData.webhooks.length}`);

  if (specificIndex !== null) {
    // Envia apenas um webhook específico
    if (specificIndex < 0 || specificIndex >= webhookData.webhooks.length) {
      console.error(`❌ Índice inválido: ${specificIndex}. Deve ser entre 0 e ${webhookData.webhooks.length - 1}`);
      process.exit(1);
    }

    const webhook = webhookData.webhooks[specificIndex];
    console.log(`\n📌 Enviando webhook #${specificIndex}`);
    await sendWebhook(webhook.payload, webhook.description);
  } else {
    // Envia todos os webhooks
    console.log(`\n📬 Enviando ${webhookData.webhooks.length} webhooks...\n`);

    for (let i = 0; i < webhookData.webhooks.length; i++) {
      const webhook = webhookData.webhooks[i];
      console.log(`\n[${i + 1}/${webhookData.webhooks.length}]`);
      await sendWebhook(webhook.payload, webhook.description);

      if (i < webhookData.webhooks.length - 1) {
        console.log(`⏳ Aguardando ${delay}ms...`);
        await sleep(delay);
      }
    }

    console.log('\n\n✨ Todos os webhooks foram enviados!');
  }

  console.log('\n📊 Resumo:');
  console.log(`   - Webhooks enviados: ${specificIndex !== null ? 1 : webhookData.webhooks.length}`);
  console.log(`   - Backend: ${BACKEND_URL}`);
  console.log('\n💡 Dicas:');
  console.log('   - Verifique o backend em: http://localhost:3001');
  console.log('   - Verifique o frontend em: http://localhost:3000/inbox');
  console.log('   - Use --index=N para enviar apenas um webhook');
  console.log('   - Use --delay=MS para ajustar o delay entre webhooks');
}

main().catch(console.error);
