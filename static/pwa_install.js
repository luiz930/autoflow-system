(function () {
    let deferredPrompt = null;

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
})();
