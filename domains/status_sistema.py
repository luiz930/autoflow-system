ROTAS_CENTRAL_TECNICA = [
    ("Login", "/login"),
    ("Inicio", "/"),
    ("Painel", "/painel"),
    ("Clientes", "/clientes"),
    ("Historico", "/historico"),
    ("Financeiro", "/financeiro"),
    ("Relatorios", "/relatorios"),
    ("Configuracoes", "/configuracoes"),
    ("Status sistema", "/status-sistema"),
    ("PWA status", "/api/pwa/status"),
    ("Manifest", "/site.webmanifest"),
    ("Service worker", "/sw.js"),
]


TABELAS_CENTRAL_TECNICA = [
    "empresas",
    "licencas",
    "usuarios",
    "clientes",
    "veiculos",
    "servicos",
    "fotos",
    "sincronizacoes_clientes",
    "historico_lavagens_sync",
    "configuracao_empresa",
    "configuracao_backup",
    "auditoria",
    "telemetria_eventos",
    "schema_migrations",
]


def classificar_latencia_ms(valor_ms):
    valor = int(valor_ms or 0)
    if valor <= 500:
        return "rapido"
    if valor <= 1500:
        return "atencao"
    return "lento"


def rotulo_latencia_ms(valor_ms):
    categoria = classificar_latencia_ms(valor_ms)
    if categoria == "rapido":
        return "Rapido"
    if categoria == "atencao":
        return "Medio"
    return "Lento"


def classificar_tendencia_resposta_ms(anterior_ms, atual_ms):
    anterior = int(anterior_ms or 0)
    atual = int(atual_ms or 0)
    if not anterior or not atual:
        return "estavel"
    delta = atual - anterior
    margem = max(250, int(anterior * 0.2))
    if delta > margem:
        return "piorou"
    if delta < -margem:
        return "melhorou"
    return "estavel"


def rotulo_tendencia_resposta(tendencia):
    if tendencia == "piorou":
        return "Piorou"
    if tendencia == "melhorou":
        return "Melhorou"
    return "Estavel"


def causa_provavel_lentidao_rota(rota, item=None):
    rota = str(rota or "").strip()
    item = item or {}
    status = int(item.get("status") or 0)
    ultimo_ms = int(item.get("ultimo_ms") or item.get("tempo_ms") or 0)
    if status >= 500:
        return "Erro de servidor: revisar stack da Central de erros e ultimo deploy."
    if status in {301, 302, 303, 307, 308}:
        return "Redirecionamento: validar sessao, senha obrigatoria, permissao ou licenca."
    if ultimo_ms <= 1500:
        return "Sem lentidao relevante na ultima medicao."
    if rota in {"/financeiro", "/relatorios"}:
        return "Consultas financeiras e agregacoes de relatorio podem estar pressionando o banco."
    if rota == "/painel":
        return "Painel operacional depende de servicos, fotos, extras e timers; cache ou resumo pode precisar aquecer."
    if rota == "/clientes":
        return "Listagem de clientes/sincronizacoes pode estar esperando banco online ou busca ampla."
    if rota == "/configuracoes":
        return "Configuracoes carrega licenca, empresa, HUD e permissoes; primeira carga tende a aquecer caches."
    if rota == "/":
        return "Home combina HUD, snapshot e contexto global; banco online lento afeta a primeira carga."
    if rota == "/status-sistema":
        return "Status executa checks de banco, backup, licenca e PWA."
    return "Rota lenta: medir consultas SQL e dependencias externas antes de refatorar."


def enriquecer_metricas_tempo_resposta(metricas_por_rota, rotas_monitoradas):
    itens = []
    for rota in sorted(rotas_monitoradas):
        item = dict((metricas_por_rota or {}).get(rota) or {})
        item.setdefault("rota", rota)
        item.setdefault("ultimo_ms", 0)
        item.setdefault("anterior_ms", 0)
        item.setdefault("media_ms", 0)
        item.setdefault("max_ms", 0)
        item.setdefault("amostras", 0)
        item.setdefault("status", "")
        item.setdefault("ultima_medicao", "")
        item["classe"] = classificar_latencia_ms(item.get("ultimo_ms") or 0)
        item["label"] = rotulo_latencia_ms(item.get("ultimo_ms") or 0)
        item["tendencia"] = item.get("tendencia") or classificar_tendencia_resposta_ms(
            item.get("anterior_ms") or 0,
            item.get("ultimo_ms") or 0,
        )
        item["tendencia_label"] = rotulo_tendencia_resposta(item.get("tendencia"))
        item["alerta_2s"] = bool(item.get("alerta_2s") or int(item.get("ultimo_ms") or 0) > 2000)
        item["pioras_consecutivas"] = int(item.get("pioras_consecutivas") or 0)
        item["causa_provavel"] = causa_provavel_lentidao_rota(item.get("rota"), item)
        itens.append(item)
    return itens
