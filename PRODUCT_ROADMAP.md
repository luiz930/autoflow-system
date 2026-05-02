# Roadmap de Produto

## Fase 1 - Estabilizacao

- modularizacao inicial do backend em `core/`
- migrations versionadas
- seguranca base
- testes minimos
- documentacao de setup e deploy

## Fase 2 - Produto

- multiempresa via `empresa_id`
- licenciamento via `licencas`
- telemetria via `telemetria_eventos`
- white-label basico em `configuracao_empresa`
- storage padronizado por provider

## Fase 3 - Venda

- deploy padronizado
- plano/licenca por empresa
- suporte e diagnostico
- branding e dominios personalizados

## Proximo corte tecnico recomendado

1. separar rotas por blueprint
2. isolar SQL por dominio
3. aplicar filtros de `empresa_id` nas consultas
4. mover uploads para provider unico
5. fechar CSRF em todos os formularios
