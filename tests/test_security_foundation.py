import unittest

from core.security import (
    build_flask_security_config,
    issue_csrf_token,
    validate_csrf_token,
)


class SecurityFoundationTests(unittest.TestCase):
    def test_build_flask_security_config(self):
        config = build_flask_security_config("segredo-teste", secure_cookie=True)
        self.assertEqual(config["SECRET_KEY"], "segredo-teste")
        self.assertTrue(config["SESSION_COOKIE_HTTPONLY"])
        self.assertTrue(config["SESSION_COOKIE_SECURE"])
        self.assertEqual(config["SESSION_COOKIE_SAMESITE"], "Lax")

    def test_issue_and_validate_csrf_token(self):
        session = {}
        token = issue_csrf_token(session)
        self.assertTrue(token)
        self.assertEqual(token, session["_csrf_token"])
        self.assertTrue(validate_csrf_token(session, token))
        self.assertFalse(validate_csrf_token(session, "invalido"))


if __name__ == "__main__":
    unittest.main()

