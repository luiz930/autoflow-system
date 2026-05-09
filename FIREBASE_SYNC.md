# Firebase sync do site

Esta etapa nao troca o banco principal do Flask. O site continua usando o banco atual, e o script `scripts/firebase_sync.py` migra/sincroniza as tabelas principais com o Firestore.

## Credenciais

Use uma service account do Firebase/Google Cloud fora do repositorio.

Opcoes aceitas:

```powershell
$env:FIREBASE_SERVICE_ACCOUNT_FILE="C:\caminho\service-account.json"
```

ou:

```powershell
$env:FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
```

Opcional:

```powershell
$env:FIREBASE_PROJECT_ID="seu-projeto"
$env:FIRESTORE_DATABASE_ID="(default)"
```

Nao versionar JSON de credenciais.

## Teste sem gravar

```powershell
python scripts/firebase_sync.py --direction push --dry-run --pretty
```

Se a conexao online antiga estiver lenta ou bloqueada, valide primeiro usando o SQLite local:

```powershell
python scripts/firebase_sync.py --direction push --dry-run --database-backend sqlite --skip-init-db --limit 1 --pretty
```

## Migrar banco atual para Firestore

```powershell
python scripts/firebase_sync.py --direction push --pretty
```

## Trazer alteracoes do Firestore para o banco do site

```powershell
python scripts/firebase_sync.py --direction pull --pretty
```

## Sincronizacao em duas vias

```powershell
python scripts/firebase_sync.py --direction bidirectional --pretty
```

## Escopo por empresa

```powershell
python scripts/firebase_sync.py --direction push --empresa-id 1 --pretty
```

## Tabelas especificas

```powershell
python scripts/firebase_sync.py --direction push --tables usuarios clientes veiculos servicos fotos --pretty
```

## Observacoes

- Campos BLOB grandes sao ignorados no Firestore nesta primeira etapa para evitar documentos acima do limite. As fotos devem ir para Firebase Storage na etapa do app.
- Os documentos usam o mesmo nome da tabela como colecao e o `id` SQL como document id.
- A sincronizacao em duas vias ainda e operacional/controlada por comando. Depois de validarmos o modelo, podemos ligar workers automaticos ou mudar telas especificas do site para escrita dupla.
