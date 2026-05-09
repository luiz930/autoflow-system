import sqlite3
import unittest

from core import firebase_sync


class FakeFirestoreDocument:
    def __init__(self, collection, doc_id):
        self.collection = collection
        self.id = doc_id

    def set(self, data, merge=True):
        self.collection.docs[self.id] = dict(data)


class FakeFirestoreCollection:
    def __init__(self):
        self.docs = {}

    def document(self, doc_id):
        return FakeFirestoreDocument(self, doc_id)


class FakeFirestoreBatch:
    def __init__(self):
        self.ops = []

    def set(self, ref, data, merge=True):
        self.ops.append((ref, data, merge))

    def commit(self):
        for ref, data, merge in self.ops:
            ref.set(data, merge=merge)
        self.ops = []


class FakeFirestore:
    def __init__(self):
        self.collections = {}

    def collection(self, name):
        self.collections.setdefault(name, FakeFirestoreCollection())
        return self.collections[name]

    def batch(self):
        return FakeFirestoreBatch()


class FirebaseSyncTests(unittest.TestCase):
    def test_preparar_documento_firestore_remove_blob_e_adiciona_meta(self):
        documento = firebase_sync.preparar_documento_firestore(
            {
                "id": 10,
                "empresa_id": 1,
                "nome": "Cliente",
                "arquivo_blob": b"conteudo",
            },
            "clientes",
            synced_at="2026-05-09T00:00:00Z",
        )

        self.assertEqual(documento["id"], 10)
        self.assertEqual(documento["_sql_id"], 10)
        self.assertEqual(documento["_collection"], "clientes")
        self.assertNotIn("arquivo_blob", documento)

    def test_push_sql_to_firestore_grava_documentos_por_tabela(self):
        conn = sqlite3.connect(":memory:")
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute(
            "CREATE TABLE clientes (id INTEGER PRIMARY KEY, empresa_id INTEGER, nome TEXT, arquivo_blob BLOB)"
        )
        cursor.execute(
            "INSERT INTO clientes (id, empresa_id, nome, arquivo_blob) VALUES (1, 1, 'Ana', ?)",
            (b"foto",),
        )
        conn.commit()

        firestore = FakeFirestore()
        resultado = firebase_sync.push_sql_to_firestore(conn, firestore, ["clientes"])

        self.assertEqual(resultado["total"], 1)
        self.assertIn("1", firestore.collections["clientes"].docs)
        self.assertEqual(firestore.collections["clientes"].docs["1"]["nome"], "Ana")
        self.assertNotIn("arquivo_blob", firestore.collections["clientes"].docs["1"])


if __name__ == "__main__":
    unittest.main()
