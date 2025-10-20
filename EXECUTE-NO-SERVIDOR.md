# Executar Migrations no Servidor de Produção

## Opção 1: Script Completo

```bash
# 1. No servidor, vá para o diretório do projeto
cd ~/social-selling

# 2. Execute este comando para rodar todas as migrations
for file in backend/migrations/0*.sql; do
  echo "========================================";
  echo "Executando: $file";
  echo "========================================";
  docker exec -i social-selling-postgres psql -U social_selling_user -d social_selling < "$file" 2>&1;
  if [ $? -eq 0 ]; then
    echo "✅ Migration executada: $file";
  else
    echo "❌ Erro: $file";
  fi;
  echo "";
done

# 3. Verificar se as tabelas foram criadas
docker exec social-selling-postgres psql -U social_selling_user -d social_selling -c "\dt"

# 4. Verificar especificamente a tabela users
docker exec social-selling-postgres psql -U social_selling_user -d social_selling -c "\d users"

# 5. Contar registros na tabela users
docker exec social-selling-postgres psql -U social_selling_user -d social_selling -c "SELECT COUNT(*) FROM users;"
```

## Opção 2: Executar Migration por Migration (se houver problemas)

```bash
cd ~/social-selling

# Executar migrations uma por uma
docker exec -i social-selling-postgres psql -U social_selling_user -d social_selling < backend/migrations/001-initial-schema.sql
docker exec -i social-selling-postgres psql -U social_selling_user -d social_selling < backend/migrations/002-create-refresh-tokens.sql
docker exec -i social-selling-postgres psql -U social_selling_user -d social_selling < backend/migrations/003-create-client-accounts.sql
# ... continue para todas as migrations
```

## Opção 3: Usando o Script Bash

```bash
# 1. No servidor, vá para o diretório do projeto
cd ~/social-selling

# 2. Execute o script
bash run-migrations-production.sh
```

## Verificações Importantes

### 1. Verificar se o PostgreSQL está rodando
```bash
docker ps | grep postgres
```

### 2. Testar conexão com o banco
```bash
docker exec social-selling-postgres psql -U social_selling_user -d social_selling -c "SELECT version();"
```

### 3. Verificar se o banco existe
```bash
docker exec social-selling-postgres psql -U social_selling_user -l | grep social_selling
```

### 4. Listar todas as tabelas após migrations
```bash
docker exec social-selling-postgres psql -U social_selling_user -d social_selling -c "\dt"
```

## Após Executar as Migrations

### Reiniciar o backend
```bash
docker compose restart backend
```

### Verificar logs do backend
```bash
docker logs social-selling-backend --tail 100 -f
```

### Testar endpoint de registro
```bash
curl -X POST https://app-socialselling.willianbvsanches.com/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "teste@example.com",
    "password": "Test123456",
    "name": "Usuario Teste"
  }'
```

## Troubleshooting

### Se der erro "relation already exists"
Isso é normal se as tabelas já existirem. As migrations vão apenas pular essas tabelas.

### Se der erro de permissão
```bash
# Verificar permissões do usuário
docker exec social-selling-postgres psql -U postgres -d social_selling -c "\du"
```

### Se o banco não existir
```bash
# Criar o banco (se necessário)
docker exec social-selling-postgres psql -U postgres -c "CREATE DATABASE social_selling OWNER social_selling_user;"
```
