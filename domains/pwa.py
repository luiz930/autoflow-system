def montar_manifesto_pwa(produto):
    produto = dict(produto or {})
    nome_app = produto.get("site_title") or produto.get("brand_name") or "Gestao Estetica"
    nome_curto = (produto.get("brand_name") or "Gestao")[:24]
    cor_fundo = produto.get("brand_background_color") or "#0b0b0b"
    cor_tema = produto.get("brand_primary_color") or "#facc15"
    icone = produto.get("brand_favicon_url") or produto.get("brand_logo_url") or ""
    shortcut_icons = [{"src": icone, "sizes": "192x192", "purpose": "any maskable"}] if icone else []
    manifest_icons = [
        {"src": icone, "sizes": "192x192", "purpose": "any maskable"},
        {"src": icone, "sizes": "512x512", "purpose": "any maskable"},
    ] if icone else []

    return {
        "id": "/?source=pwa",
        "name": nome_app,
        "short_name": nome_curto,
        "description": f"Aplicativo operacional para gestao de {str(produto.get('business_niche_label') or 'servicos').lower()}, atendimentos, fotos, clientes, financeiro e licencas.",
        "start_url": "/?source=pwa",
        "scope": "/",
        "display": "standalone",
        "display_override": ["standalone", "minimal-ui", "browser"],
        "orientation": "portrait",
        "background_color": cor_fundo,
        "theme_color": cor_tema,
        "categories": ["business", "productivity", "utilities"],
        "lang": "pt-BR",
        "dir": "ltr",
        "prefer_related_applications": False,
        "capture_links": "existing-client-navigate",
        "launch_handler": {"client_mode": "navigate-existing"},
        "permissions": ["camera", "microphone"],
        "shortcuts": [
            {
                "name": "Painel operacional",
                "short_name": "Painel",
                "description": "Abrir atendimentos em andamento.",
                "url": "/painel?source=pwa_shortcut",
                "icons": shortcut_icons,
            },
            {
                "name": "Novo atendimento",
                "short_name": "Atender",
                "description": "Abrir a tela inicial para iniciar atendimento.",
                "url": "/?source=pwa_shortcut",
                "icons": shortcut_icons,
            },
        ],
        "icons": manifest_icons,
    }


def montar_status_pwa(request_is_secure=False, host=""):
    host = str(host or "")
    seguro = bool(request_is_secure or host.startswith(("localhost", "127.0.0.1")))
    return {
        "ok": seguro,
        "secure_context_required": True,
        "secure_request": bool(request_is_secure),
        "host": host,
        "manifest_url": "/site.webmanifest",
        "service_worker_url": "/sw.js",
        "service_worker_scope": "/",
        "mensagem": (
            "PWA pronto para instalacao."
            if seguro else
            "Para instalar como app no Chrome Android, acesse por HTTPS com certificado valido. Em HTTP o Chrome permite apenas criar atalho."
        ),
    }
