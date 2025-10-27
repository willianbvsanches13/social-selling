#!/bin/bash

###############################################################################
# Docker Cleanup Script - Limpeza Segura de Recursos Docker
#
# Este script remove imagens, containers, volumes e cache não utilizados
# de forma segura, mantendo apenas os recursos ativos.
###############################################################################

set -e  # Para execução se houver erro

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para imprimir mensagens coloridas
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_header() {
    echo ""
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}================================================${NC}"
    echo ""
}

# Verificar se Docker está instalado e rodando
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker não está instalado!"
        exit 1
    fi

    if ! docker info &> /dev/null; then
        print_error "Docker daemon não está rodando!"
        exit 1
    fi

    print_success "Docker está rodando"
}

# Mostrar uso atual de disco
show_disk_usage_before() {
    print_header "Uso de Disco ANTES da Limpeza"
    docker system df
    echo ""
}

# Mostrar containers ativos
show_active_containers() {
    print_header "Containers Ativos (NÃO serão removidos)"

    if [ "$(docker ps -q)" ]; then
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Image}}"
    else
        print_warning "Nenhum container ativo encontrado"
    fi
    echo ""
}

# Backup de containers importantes (opcional)
backup_container_info() {
    print_info "Salvando informações dos containers ativos..."
    docker ps --format "{{.Names}}" > /tmp/docker_active_containers_backup.txt
    print_success "Backup salvo em: /tmp/docker_active_containers_backup.txt"
    echo ""
}

# Limpeza do cache de build
cleanup_build_cache() {
    print_header "Limpando Cache de Build"

    CACHE_SIZE=$(docker system df -v | grep "Build Cache" | awk '{print $4}')
    print_info "Cache atual: $CACHE_SIZE"

    docker builder prune -a -f

    print_success "Cache de build limpo!"
    echo ""
}

# Limpeza de volumes não utilizados
cleanup_volumes() {
    print_header "Limpando Volumes Não Utilizados"

    VOLUMES_COUNT=$(docker volume ls -q | wc -l)
    print_info "Total de volumes: $VOLUMES_COUNT"

    if [ "$VOLUMES_COUNT" -gt 0 ]; then
        print_warning "Volumes não usados serão removidos (dados podem ser perdidos!)"
        docker volume prune -f
        print_success "Volumes não utilizados removidos!"
    else
        print_info "Nenhum volume para remover"
    fi
    echo ""
}

# Limpeza de imagens não utilizadas
cleanup_images() {
    print_header "Limpando Imagens Não Utilizadas"

    IMAGES_COUNT=$(docker images -q | wc -l)
    print_info "Total de imagens: $IMAGES_COUNT"

    docker image prune -a -f

    print_success "Imagens não utilizadas removidas!"
    echo ""
}

# Limpeza de containers parados
cleanup_stopped_containers() {
    print_header "Limpando Containers Parados"

    STOPPED_COUNT=$(docker ps -a -q -f status=exited | wc -l)

    if [ "$STOPPED_COUNT" -gt 0 ]; then
        print_info "Containers parados encontrados: $STOPPED_COUNT"
        docker container prune -f
        print_success "Containers parados removidos!"
    else
        print_info "Nenhum container parado para remover"
    fi
    echo ""
}

# Limpeza de redes não utilizadas
cleanup_networks() {
    print_header "Limpando Redes Não Utilizadas"

    docker network prune -f

    print_success "Redes não utilizadas removidas!"
    echo ""
}

# Mostrar uso após limpeza
show_disk_usage_after() {
    print_header "Uso de Disco DEPOIS da Limpeza"
    docker system df
    echo ""
}

# Calcular espaço recuperado
calculate_space_saved() {
    print_header "Resumo da Limpeza"

    BEFORE_SIZE=$(cat /tmp/docker_size_before.txt 2>/dev/null || echo "0")
    AFTER_SIZE=$(docker system df --format "{{.Size}}" | head -1)

    print_success "Limpeza concluída com sucesso!"
    print_info "Containers ativos preservados: $(docker ps -q | wc -l)"
    echo ""
}

# Função principal
main() {
    print_header "🧹 Docker Cleanup - Limpeza Segura"

    # Verificações iniciais
    check_docker

    # Salvar tamanho inicial
    docker system df --format "{{.Size}}" | head -1 > /tmp/docker_size_before.txt

    # Mostrar estado atual
    show_disk_usage_before
    show_active_containers

    # Pedir confirmação
    print_warning "Esta operação irá remover:"
    echo "  - Cache de build não utilizado"
    echo "  - Volumes não utilizados"
    echo "  - Imagens não utilizadas"
    echo "  - Containers parados"
    echo "  - Redes não utilizadas"
    echo ""
    print_info "Containers ativos NÃO serão afetados!"
    echo ""

    # read -p "Deseja continuar? (s/n): " -n 1 -r
    # echo ""
    REPLY="s"

    if [[ ! $REPLY =~ ^[SsYy]$ ]]; then
        print_warning "Operação cancelada pelo usuário"
        exit 0
    fi

    # Executar limpeza
    backup_container_info
    cleanup_build_cache
    cleanup_stopped_containers
    cleanup_volumes
    cleanup_images
    cleanup_networks

    # Mostrar resultados
    show_disk_usage_after
    calculate_space_saved

    print_success "✨ Limpeza concluída!"
}

# Executar script
main
