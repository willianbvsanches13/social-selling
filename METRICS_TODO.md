# 📊 Implementar Endpoint de Métricas (TODO)

## Status: Não Implementado

Atualmente, o Prometheus está configurado para coletar métricas do backend via `/metrics`, mas este endpoint não está implementado.

## Erro Atual (Pode Ignorar)

```json
{
  "level": "error",
  "message": "GET /metrics - 404 - Cannot GET /metrics",
  "timestamp": "2025-10-21 00:12:10"
}
```

**Este erro NÃO afeta o funcionamento da aplicação!**

## Impacto

- ✅ Aplicação funciona normalmente
- ✅ Health checks funcionam
- ✅ Todos os serviços rodando
- ⚠️  Prometheus não consegue coletar métricas customizadas do backend
- ⚠️  Métricas de sistema (CPU, memória, rede) ainda funcionam via node-exporter

## Para Implementar (Opcional)

### 1. Instalar Dependências

```bash
cd backend
npm install @willsoto/nestjs-prometheus prom-client
```

### 2. Adicionar PrometheusModule

**arquivo**: `backend/src/app.module.ts`

```typescript
import { PrometheusModule } from '@willsoto/nestjs-prometheus';

@Module({
  imports: [
    // ... outros imports
    PrometheusModule.register({
      path: '/metrics',
      defaultMetrics: {
        enabled: true,
      },
    }),
  ],
})
export class AppModule {}
```

### 3. Adicionar Métricas Customizadas (Opcional)

**arquivo**: `backend/src/infrastructure/metrics/metrics.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram } from 'prom-client';

@Injectable()
export class MetricsService {
  constructor(
    @InjectMetric('http_requests_total')
    public requestCounter: Counter<string>,

    @InjectMetric('http_request_duration_seconds')
    public requestDuration: Histogram<string>,
  ) {}

  recordRequest(method: string, path: string, statusCode: number, duration: number) {
    this.requestCounter.inc({
      method,
      path,
      status_code: statusCode,
    });

    this.requestDuration.observe(
      {
        method,
        path,
        status_code: statusCode,
      },
      duration / 1000, // Convert to seconds
    );
  }
}
```

### 4. Testar

```bash
# Rebuild backend
docker compose down backend
docker compose up -d --build backend

# Verificar endpoint
curl http://localhost:4000/metrics

# Deve retornar métricas Prometheus:
# TYPE nodejs_heap_size_total_bytes gauge
# nodejs_heap_size_total_bytes 123456
# ...
```

### 5. Verificar no Prometheus

```bash
# Acessar Prometheus UI
open http://localhost:9090

# Query: rate(http_requests_total[5m])
```

## Métricas Disponíveis (Quando Implementado)

### Métricas Padrão (Node.js)
- `nodejs_heap_size_total_bytes` - Tamanho total do heap
- `nodejs_heap_size_used_bytes` - Heap usado
- `nodejs_external_memory_bytes` - Memória externa
- `nodejs_gc_duration_seconds` - Duração do garbage collection
- `process_cpu_user_seconds_total` - CPU user time
- `process_cpu_system_seconds_total` - CPU system time
- `process_resident_memory_bytes` - Memória residente

### Métricas Customizadas (Exemplos)
- `http_requests_total` - Total de requisições HTTP
- `http_request_duration_seconds` - Duração das requisições
- `instagram_posts_published_total` - Posts publicados no Instagram
- `webhook_events_processed_total` - Eventos de webhook processados
- `queue_jobs_completed_total` - Jobs completados na fila
- `queue_jobs_failed_total` - Jobs falhados na fila
- `database_queries_duration_seconds` - Duração das queries no banco

## Prioridade

**Baixa** - Este é um enhancement, não uma correção necessária.

Implemente quando:
- Precisar de observabilidade avançada
- Quiser dashboards customizados no Grafana
- Precisar de alertas baseados em métricas de negócio
- Projeto estiver em produção estável

## Referências

- [NestJS Prometheus](https://github.com/willsoto/nestjs-prometheus)
- [Prometheus Client](https://github.com/simmonds/prom-client)
- [Prometheus Best Practices](https://prometheus.io/docs/practices/naming/)
