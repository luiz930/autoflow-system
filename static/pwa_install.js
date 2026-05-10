(function () {
    let deferredPrompt = null;

    function buildNetworkBanner() {
        if (document.getElementById("pwa-network-banner")) {
            return document.getElementById("pwa-network-banner");
        }
        const banner = document.createElement("div");
        banner.id = "pwa-network-banner";
        banner.className = "pwa-network-banner";
        banner.hidden = true;
        document.body.appendChild(banner);
        return banner;
    }

    function updateNetworkBanner() {
        const banner = buildNetworkBanner();
        const offline = navigator.onLine === false;
        banner.hidden = !offline;
        banner.textContent = offline ? "Sem conexao com o servidor. Alteracoes podem nao ser salvas." : "";
        document.documentElement.toggleAttribute("data-offline", offline);
    }

    function protectFormSubmits() {
        document.addEventListener("submit", (event) => {
            if (event.defaultPrevented) {
                return;
            }
            const form = event.target;
            if (!(form instanceof HTMLFormElement) || form.dataset.submitLock === "off") {
                return;
            }
            if (form.dataset.submitting === "true") {
                event.preventDefault();
                return;
            }
            form.dataset.submitting = "true";
            form.setAttribute("aria-busy", "true");
            form.querySelectorAll("button[type='submit'], input[type='submit']").forEach((control) => {
                if (control.name) {
                    return;
                }
                control.dataset.originalText = control.textContent || "";
                control.disabled = true;
                if (control.tagName === "BUTTON" && control.textContent.trim()) {
                    control.textContent = "Aguarde...";
                }
            });
            setTimeout(() => {
                form.dataset.submitting = "false";
                form.removeAttribute("aria-busy");
                form.querySelectorAll("button[type='submit'], input[type='submit']").forEach((control) => {
                    if (control.name) {
                        return;
                    }
                    control.disabled = false;
                    if (control.tagName === "BUTTON" && control.dataset.originalText) {
                        control.textContent = control.dataset.originalText;
                    }
                });
            }, 12000);
        });
    }

    function isStandalone() {
        return window.matchMedia("(display-mode: standalone)").matches
            || window.navigator.standalone === true;
    }

    function buildInstallButton() {
        if (document.getElementById("pwa-install-button") || isStandalone()) {
            return null;
        }

        const button = document.createElement("button");
        button.id = "pwa-install-button";
        button.type = "button";
        button.className = "pwa-install-button";
        button.textContent = "Instalar app";
        button.hidden = true;
        document.body.appendChild(button);
        return button;
    }

    const installButton = buildInstallButton();

    if (!installButton) {
        return;
    }

    if (!window.isSecureContext) {
        installButton.textContent = "App exige HTTPS";
        installButton.title = "Para instalar como app no Chrome Android, abra o sistema por HTTPS com certificado valido.";
        installButton.hidden = false;
        installButton.disabled = true;
        return;
    }

    window.addEventListener("beforeinstallprompt", (event) => {
        event.preventDefault();
        deferredPrompt = event;
        installButton.hidden = false;
    });

    installButton.addEventListener("click", async () => {
        if (!deferredPrompt) {
            return;
        }

        installButton.disabled = true;
        deferredPrompt.prompt();

        try {
            await deferredPrompt.userChoice;
        } finally {
            deferredPrompt = null;
            installButton.hidden = true;
            installButton.disabled = false;
        }
    });

    window.addEventListener("appinstalled", () => {
        deferredPrompt = null;
        installButton.hidden = true;
    });

    window.addEventListener("online", updateNetworkBanner);
    window.addEventListener("offline", updateNetworkBanner);
    updateNetworkBanner();
    protectFormSubmits();
})();
