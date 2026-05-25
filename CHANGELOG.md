# Changelog

Todas as mudancas relevantes deste projeto devem ser documentadas neste arquivo.

O formato segue uma organizacao inspirada em Keep a Changelog e versionamento semantico sempre que possivel.

## [Unreleased]

### Planejado

- Separacao progressiva de rotas por blueprint.
- Isolamento de SQL por dominio.
- Expansao do painel financeiro.
- Evolucao da sincronizacao mobile offline/online.
- Novas telas documentadas com screenshots reais.

## [1.0.0] - Base SaaS/ERP

### Adicionado

- Cadastro de clientes, veiculos e placas.
- Historico de servicos por veiculo.
- Controle operacional de atendimentos.
- Agenda de retornos comerciais.
- Modulos de financeiro, orcamentos e notas fiscais.
- Configuracoes de empresa e personalizacao visual.
- Base multiempresa com `empresa_id`.
- Sistema de licencas por empresa.
- Telemetria de eventos.
- Backup local, externo e Google Drive opcional.
- PWA instalavel.
- App mobile offline-first em React Native.
- Suite de testes automatizados.

### Tecnico

- Fundacao de produto em `core/product_foundation.py`.
- Dominios separados em `domains/`.
- Suporte a SQLite local e PostgreSQL/Supabase.
- Protecao CSRF e headers de seguranca.
- Estrutura preparada para SaaS comercial.
