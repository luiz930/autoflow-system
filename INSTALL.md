# Instalacao

## Requisitos

- Python 3.11+
- PostgreSQL/Supabase opcional
- credencial do Google Drive opcional

## 1. Clonar e instalar

```bash
git clone <repo>
cd lavagem_novo
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

No Windows:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## 2. Configurar ambiente

Copie o template:

```bash
cp .env.example .env
```

Preencha ao menos:

```env
DATABASE_BACKEND=postgres
STRICT_ONLINE_DATABASE=true
SUPABASE_DATABASE_URL=
FLASK_SECRET_KEY=
```

## 3. Subir o sistema

```bash
python app.py
```

## 4. Validar

```bash
python -m py_compile app.py
python -m unittest discover -s tests -v
```

