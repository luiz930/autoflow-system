import sqlite3
import unittest

from core.product_foundation import build_brand_context, run_product_foundation_migrations


def add_column_if_needed(cursor, tabela, definicao_coluna):
    nome_coluna = definicao_coluna.split()[0]
    cursor.execute(f"PRAGMA table_info({tabela})")
    existentes = {row[1] for row in cursor.fetchall()}
    if nome_coluna in existentes:
        return
    cursor.execute(f"ALTER TABLE {tabela} ADD COLUMN {definicao_coluna}")


class ProductFoundationMigrationsTests(unittest.TestCase):
    def setUp(self):
        self.conn = sqlite3.connect(":memory:")
        self.conn.row_factory = sqlite3.Row
        c = self.conn.cursor()
        c.execute("CREATE TABLE usuarios (id INTEGER PRIMARY KEY AUTOINCREMENT, usuario TEXT)")
        c.execute("CREATE TABLE clientes (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT)")
        c.execute("CREATE TABLE veiculos (id INTEGER PRIMARY KEY AUTOINCREMENT, placa TEXT)")
        c.execute("CREATE TABLE servicos (id INTEGER PRIMARY KEY AUTOINCREMENT, valor REAL)")
        c.execute("CREATE TABLE fotos (id INTEGER PRIMARY KEY AUTOINCREMENT, caminho TEXT)")
        c.execute("CREATE TABLE retornos_clientes (id INTEGER PRIMARY KEY AUTOINCREMENT, placa TEXT)")
        c.execute("CREATE TABLE sincronizacoes_clientes (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT)")
        c.execute("CREATE TABLE orcamentos (id INTEGER PRIMARY KEY AUTOINCREMENT, numero INTEGER)")
        c.execute("CREATE TABLE notas_fiscais (id INTEGER PRIMARY KEY AUTOINCREMENT, numero_nota TEXT)")
        c.execute("CREATE TABLE configuracao_empresa (id INTEGER PRIMARY KEY, nome_fantasia TEXT)")
        self.conn.commit()

    def tearDown(self):
        self.conn.close()

    def test_run_product_foundation_migrations_creates_product_tables(self):
        run_product_foundation_migrations(
            self.conn,
            add_column_if_needed,
            lambda: "2026-05-01T00:00:00",
            print_func=lambda *_args, **_kwargs: None,
        )
        c = self.conn.cursor()
        c.execute("SELECT nome FROM schema_migrations")
        migrations = {row[0] for row in c.fetchall()}
        self.assertIn("foundation_enterprises", migrations)
        self.assertIn("foundation_branding_storage", migrations)

        c.execute("SELECT id, slug FROM empresas WHERE id=1")
        empresa = c.fetchone()
        self.assertEqual(empresa["id"], 1)
        self.assertEqual(empresa["slug"], "wagen-estetica")

        c.execute("PRAGMA table_info(configuracao_empresa)")
        colunas = {row[1] for row in c.fetchall()}
        self.assertIn("marca_nome", colunas)
        self.assertIn("licenca_plano", colunas)

    def test_build_brand_context_prefers_config_values(self):
        contexto = build_brand_context(
            {
                "marca_nome": "Minha Marca",
                "marca_subtitulo": "Minha Operacao",
                "licenca_plano": "pro",
                "licenca_status": "ativa",
            },
            {"nome_fantasia": "Empresa Padrao"},
        )
        self.assertEqual(contexto["brand_name"], "Minha Marca")
        self.assertEqual(contexto["brand_subtitle"], "Minha Operacao")
        self.assertEqual(contexto["licenca_plano"], "pro")
        self.assertEqual(contexto["licenca_status"], "ativa")

    def test_migration_replaces_global_unique_placa_with_empresa_scope(self):
        self.conn.close()
        self.conn = sqlite3.connect(":memory:")
        self.conn.row_factory = sqlite3.Row
        c = self.conn.cursor()
        c.execute("CREATE TABLE usuarios (id INTEGER PRIMARY KEY AUTOINCREMENT, usuario TEXT)")
        c.execute("CREATE TABLE clientes (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT)")
        c.execute("CREATE TABLE veiculos (id INTEGER PRIMARY KEY AUTOINCREMENT, empresa_id INTEGER DEFAULT 1, placa TEXT UNIQUE NOT NULL)")
        c.execute("CREATE TABLE servicos (id INTEGER PRIMARY KEY AUTOINCREMENT, empresa_id INTEGER DEFAULT 1, valor REAL)")
        c.execute("CREATE TABLE fotos (id INTEGER PRIMARY KEY AUTOINCREMENT, empresa_id INTEGER DEFAULT 1, caminho TEXT)")
        c.execute("CREATE TABLE retornos_clientes (id INTEGER PRIMARY KEY AUTOINCREMENT, empresa_id INTEGER DEFAULT 1, placa TEXT NOT NULL UNIQUE)")
        c.execute("CREATE TABLE sincronizacoes_clientes (id INTEGER PRIMARY KEY AUTOINCREMENT, empresa_id INTEGER DEFAULT 1, nome TEXT)")
        c.execute("CREATE TABLE orcamentos (id INTEGER PRIMARY KEY AUTOINCREMENT, empresa_id INTEGER DEFAULT 1, numero INTEGER)")
        c.execute("CREATE TABLE notas_fiscais (id INTEGER PRIMARY KEY AUTOINCREMENT, empresa_id INTEGER DEFAULT 1, numero_nota TEXT)")
        c.execute("CREATE TABLE configuracao_empresa (id INTEGER PRIMARY KEY, empresa_id INTEGER DEFAULT 1, nome_fantasia TEXT)")
        self.conn.commit()

        run_product_foundation_migrations(
            self.conn,
            add_column_if_needed,
            lambda: "2026-05-01T00:00:00",
            print_func=lambda *_args, **_kwargs: None,
        )

        c = self.conn.cursor()
        c.execute("INSERT INTO veiculos (empresa_id, placa) VALUES (?, ?)", (1, "AAA1234"))
        c.execute("INSERT INTO veiculos (empresa_id, placa) VALUES (?, ?)", (2, "AAA1234"))
        c.execute("INSERT INTO retornos_clientes (empresa_id, placa) VALUES (?, ?)", (1, "BBB1234"))
        c.execute("INSERT INTO retornos_clientes (empresa_id, placa) VALUES (?, ?)", (2, "BBB1234"))
        self.conn.commit()

        c.execute("PRAGMA index_list(veiculos)")
        indices_veiculos = c.fetchall()
        unico_global_veiculos = []
        for indice in indices_veiculos:
            nome = indice[1]
            c.execute(f"PRAGMA index_info({nome})")
            colunas = [row[2] for row in c.fetchall()]
            if indice[2] and colunas == ["placa"]:
                unico_global_veiculos.append(nome)
        self.assertEqual(unico_global_veiculos, [])


if __name__ == "__main__":
    unittest.main()
