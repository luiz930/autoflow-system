# Deploy

## Variaveis minimas

```env
DATABASE_BACKEND=postgres
STRICT_ONLINE_DATABASE=true
SUPABASE_DATABASE_URL=
FLASK_SECRET_KEY=
SESSION_COOKIE_SECURE=1
CSRF_PROTECTION=0
TELEMETRIA_ATIVA=1
```

## Google Drive

Opcao 1:

```env
GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON=
GOOGLE_DRIVE_FOLDER_ID=
```

Opcao 2:

```env
GOOGLE_DRIVE_SERVICE_ACCOUNT_FILE=/caminho/google_drive_service_account.json
GOOGLE_DRIVE_FOLDER_ID=
```

## Deploy Linux basico

```bash
git pull
pip install -r requirements.txt
python -m py_compile app.py
python -m unittest discover -s tests -v
gunicorn app:app --bind 0.0.0.0:5000
```

## Observacoes

- o projeto espera banco online quando `STRICT_ONLINE_DATABASE=true`
- o JSON do Google Drive nao deve ir para o Git
- as migrations de fundacao rodam no boot via `init_db()`

