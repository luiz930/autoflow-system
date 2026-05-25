# Guia de Contribuicao

Obrigado por considerar contribuir com o AutoFlow ERP.

Este projeto e uma base de software empresarial, entao mudancas devem preservar estabilidade, clareza e compatibilidade com dados existentes.

## Como contribuir

1. Crie uma branch descritiva.
2. Mantenha alteracoes focadas em um unico objetivo.
3. Escreva ou ajuste testes quando alterar regra de negocio.
4. Rode as validacoes locais.
5. Abra um pull request com resumo claro.

## Padroes tecnicos

- Preferir modulos em `domains/` para regras de negocio.
- Manter `app.py` como camada de orquestracao enquanto a migracao para blueprints evolui.
- Preservar compatibilidade com SQLite e PostgreSQL.
- Proteger consultas por `empresa_id` quando aplicavel.
- Evitar credenciais, dumps, tokens ou arquivos sensiveis no Git.
- Usar nomes claros e profissionais para funcoes, rotas e variaveis.

## Validacoes recomendadas

```powershell
python -m py_compile app.py
python -m unittest discover -s tests -v
git diff --check
```

Para arquivos JavaScript:

```powershell
node --check static/sw.js
node --check static/auto_suporte.js
node --check static/photo_upload.js
node --check static/pwa_install.js
```

Para o app mobile:

```powershell
cd mobile
npm run lint
```

## Pull requests

Um bom PR deve incluir:

- objetivo da mudanca;
- arquivos principais alterados;
- impacto no banco de dados, se houver;
- testes executados;
- screenshots quando alterar interface.

## Issues

Ao abrir uma issue, informe:

- ambiente usado;
- passos para reproduzir;
- resultado esperado;
- resultado obtido;
- logs ou prints quando disponivel.

## Seguranca

Nao reporte vulnerabilidades sensiveis em issues publicas. Entre em contato diretamente com o mantenedor do projeto.
