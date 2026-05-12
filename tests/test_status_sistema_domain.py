import unittest

from domains.status_sistema import (
    causa_provavel_lentidao_rota,
    classificar_latencia_ms,
    classificar_tendencia_resposta_ms,
    enriquecer_metricas_tempo_resposta,
    rotulo_latencia_ms,
)


class StatusSistemaDomainTests(unittest.TestCase):
    def test_classifica_latencia_e_tendencia(self):
        self.assertEqual(classificar_latencia_ms(250), "rapido")
        self.assertEqual(rotulo_latencia_ms(900), "Medio")
        self.assertEqual(classificar_latencia_ms(2200), "lento")
        self.assertEqual(classificar_tendencia_resposta_ms(1000, 1350), "piorou")
        self.assertEqual(classificar_tendencia_resposta_ms(1500, 900), "melhorou")
        self.assertEqual(classificar_tendencia_resposta_ms(0, 900), "estavel")

    def test_enriquece_metricas_com_causa_provavel(self):
        itens = enriquecer_metricas_tempo_resposta(
            {
                "/financeiro": {
                    "rota": "/financeiro",
                    "ultimo_ms": 2400,
                    "anterior_ms": 1000,
                    "status": 200,
                }
            },
            {"/financeiro"},
        )

        self.assertEqual(itens[0]["classe"], "lento")
        self.assertEqual(itens[0]["tendencia"], "piorou")
        self.assertIn("Consultas financeiras", itens[0]["causa_provavel"])

    def test_causa_provavel_prioriza_status_http(self):
        self.assertIn("Erro de servidor", causa_provavel_lentidao_rota("/", {"status": 500}))
        self.assertIn("Redirecionamento", causa_provavel_lentidao_rota("/", {"status": 302}))


if __name__ == "__main__":
    unittest.main()
