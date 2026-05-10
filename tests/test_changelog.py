import subprocess
import unittest
from unittest.mock import patch

from domains.changelog import CHANGELOG_CACHE, carregar_contexto_changelog


class ChangelogTests(unittest.TestCase):
    def setUp(self):
        CHANGELOG_CACHE["carregado_em"] = 0.0
        CHANGELOG_CACHE["repo_root"] = ""
        CHANGELOG_CACHE["payload"] = None

    def test_carregar_contexto_changelog_parseia_historico_git(self):
        saida_log = "\n".join(
            [
                "abc1234def\x1f2026-04-22\x1fAtualiza layout, HUD e central de retornos",
                "fedcba9876\x1f2026-05-02\x1fCorrige migracoes Postgres e estabilidade da sessao",
            ]
        )

        def git_fake(args, **_kwargs):
            if args[3:6] == ["remote", "get-url", "origin"]:
                return subprocess.CompletedProcess(args=[], returncode=0, stdout="https://github.com/luiz930/lavagem_novo.git")
            if args[3:5] == ["branch", "--show-current"]:
                return subprocess.CompletedProcess(args=[], returncode=0, stdout="main")
            if args[3:6] == ["rev-parse", "--short", "HEAD"]:
                return subprocess.CompletedProcess(args=[], returncode=0, stdout="fedcba9")
            if args[3:7] == ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]:
                return subprocess.CompletedProcess(args=[], returncode=0, stdout="origin/main")
            if args[3:6] == ["rev-list", "--left-right", "--count"]:
                return subprocess.CompletedProcess(args=[], returncode=0, stdout="0\t0")
            if args[3] == "log":
                return subprocess.CompletedProcess(args=[], returncode=0, stdout=saida_log)
            return subprocess.CompletedProcess(args=[], returncode=1, stdout="")

        with patch("domains.changelog.subprocess.run", side_effect=git_fake):
            contexto = carregar_contexto_changelog("C:/repo", versao_atual="Versao: 1.0.0")

        self.assertEqual(contexto["resumo"]["versao_atual"], "Versao: 1.0.0")
        self.assertEqual(contexto["resumo"]["branch_atual"], "main")
        self.assertEqual(contexto["resumo"]["hash_atual"], "fedcba9")
        self.assertEqual(contexto["resumo"]["total_commits"], 2)
        self.assertEqual(contexto["resumo"]["primeiro_commit_em"], "22/04/2026")
        self.assertEqual(contexto["resumo"]["ultimo_commit_em"], "02/05/2026")
        self.assertEqual(contexto["resumo"]["github_url"], "https://github.com/luiz930/lavagem_novo")
        self.assertEqual(contexto["resumo"]["github_upstream"], "origin/main")
        self.assertTrue(contexto["resumo"]["github_sincronizado"])
        self.assertIn("/commit/fedcba9876", contexto["commits_recentes"][0]["url"])
        self.assertTrue(contexto["marcos"])
        self.assertTrue(contexto["grupos"])
        self.assertEqual(contexto["grupos"][0]["periodo"], "2026-05")


if __name__ == "__main__":
    unittest.main()
