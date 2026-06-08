# App mobile

App mobile offline-first para uso operacional com SQLite local. O banco local e a fila de sincronizacao sao a fonte imediata; o servidor online entra somente quando houver conexao e configuracao.

## Como rodar

1. Instale Node.js com npm no computador.
2. Entre nesta pasta:

```powershell
cd "D:\PROJETOS SITES (HTML, CSS, JAVASCRIPT E PYTHON)\projeto\mobile"
npm install
npm start
```

3. Para gerar Android nativo:

```powershell
npm run android
```

## Modelo de dados

- `usuarios`: login offline com hash bcrypt igual ao site.
- `clientes`, `veiculos`, `servicos`, `fotos`: primeira base operacional local.
- `sync_queue`: fila de alteracoes locais para enviar ao servidor.
- `sync_state`: controle de ultimo pull/push.

## Regra principal

O app nunca depende do banco online para abrir, logar ou registrar dados. Quando o servidor estiver configurado, `syncService` envia pendencias e baixa mudancas.

## Servidor de sincronizacao

No Flask, configure um token antes de expor o endpoint:

```powershell
setx MOBILE_SYNC_TOKEN "troque-por-um-token-grande"
```

No app, preencha:

- URL: endereco do servidor Flask, por exemplo `https://seu-dominio.com`
- Token: o mesmo valor de `MOBILE_SYNC_TOKEN`

O endpoint usado pelo app e `/api/mobile/sync`.
