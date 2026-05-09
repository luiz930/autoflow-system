from __future__ import annotations

import argparse
import json
import os
import sys


ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

import app as app_module  # noqa: E402
from core.firebase_sync import (  # noqa: E402
    obter_firestore_client,
    pull_firestore_to_sql,
    push_sql_to_firestore,
    sync_bidirectional,
)


def parse_args():
    parser = argparse.ArgumentParser(
        description="Migra e sincroniza o banco atual do site com Firebase Firestore."
    )
    parser.add_argument(
        "--direction",
        choices=["push", "pull", "bidirectional"],
        default="push",
        help="push envia banco do site para Firestore; pull traz Firestore para o banco do site.",
    )
    parser.add_argument(
        "--tables",
        nargs="+",
        default=None,
        help="Tabelas/colecoes para sincronizar. Padrao: tabelas principais do sistema.",
    )
    parser.add_argument("--empresa-id", type=int, default=None, help="Filtra por empresa_id quando a tabela tiver essa coluna.")
    parser.add_argument("--limit", type=int, default=None, help="Limite de registros por tabela para testes.")
    parser.add_argument("--dry-run", action="store_true", help="Conta e valida sem gravar.")
    parser.add_argument("--project-id", default=None, help="Firebase project id opcional.")
    parser.add_argument("--database-id", default=None, help="Firestore database id opcional.")
    parser.add_argument(
        "--database-backend",
        choices=["sqlite", "postgres"],
        default=None,
        help="Forca o banco de origem/destino nesta execucao sem alterar o .env.",
    )
    parser.add_argument(
        "--skip-init-db",
        action="store_true",
        help="Nao roda init_db antes da sincronizacao; use quando o schema ja estiver pronto.",
    )
    parser.add_argument("--pretty", action="store_true", help="Imprime JSON formatado.")
    return parser.parse_args()


def tabelas_padrao():
    preferidas = [
        "empresas",
        "licencas",
        "usuarios",
        "clientes",
        "veiculos",
        "tipos_servico",
        "servicos",
        "servico_cobrancas_extras",
        "fotos",
        "checklist_itens",
        "servico_checklist",
        "retornos_clientes",
        "notificacoes",
        "orcamentos",
        "orcamento_itens",
        "notas_fiscais",
        "nota_fiscal_itens",
        "configuracao_empresa",
    ]
    existentes = set(getattr(app_module, "TABELAS_SISTEMA_ORDENADAS", []) or [])
    return [tabela for tabela in preferidas if tabela in existentes]


def main():
    args = parse_args()
    tabelas = args.tables or tabelas_padrao()
    if not tabelas:
        raise SystemExit("Nenhuma tabela informada para sincronizar.")

    if args.database_backend and hasattr(app_module, "configurar_banco_runtime"):
        app_module.configurar_banco_runtime(backend=args.database_backend)

    firestore_client = None
    if not (args.dry_run and args.direction == "push"):
        firestore_client = obter_firestore_client(
            project_id=args.project_id,
            database_id=args.database_id,
        )

    if not args.skip_init_db:
        app_module.garantir_init_db()
    conn = app_module.conectar()
    try:
        if args.direction == "push":
            resultado = push_sql_to_firestore(
                conn,
                firestore_client,
                tabelas,
                empresa_id=args.empresa_id,
                limit=args.limit,
                dry_run=args.dry_run,
            )
        elif args.direction == "pull":
            resultado = pull_firestore_to_sql(
                conn,
                firestore_client,
                tabelas,
                empresa_id=args.empresa_id,
                limit=args.limit,
                dry_run=args.dry_run,
            )
        else:
            resultado = sync_bidirectional(
                conn,
                firestore_client,
                tabelas,
                empresa_id=args.empresa_id,
                limit=args.limit,
                dry_run=args.dry_run,
            )
    finally:
        try:
            conn.close()
        except Exception:
            pass

    print(json.dumps(resultado, ensure_ascii=False, indent=2 if args.pretty else None, default=str))


if __name__ == "__main__":
    main()
