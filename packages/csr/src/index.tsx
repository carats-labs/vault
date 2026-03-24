import { CaratsRenderContext, renderPage } from '@carats/core';
import { clearHydrations } from '@carats/hooks';
import { transpile, init } from 'jjsx';

init();

declare global {
  interface HTMLAnchorElement {
    _isHandled: boolean;
  }
}

export default function BuildCarats(config: CaratsRenderContext) {
  const { suspense, inAppRouting = true } = config;
  suspense.loading = suspense.loading ?? (() => <>💎 Loading...</>);
  suspense.error = suspense.error ?? ((error: Error) => <>💎 Error: {error.message}</>);
  suspense.notFound = suspense.notFound ?? (() => <>💎 Not Found</>);

  async function clientRender() {
    const url = location.pathname + location.search;
    const loaderTimer = setTimeout(() => document.getElementById("loading-indicator")?.classList.remove("hide"), 250);
    await clearHydrations();
    try {
      const html = await renderPage.call(config, url, async (sspUrl) => await fetch(sspUrl).then(r => r.json()));
      document.getElementById("app")!.innerHTML = html;
    } catch (error) {
      document.getElementById("app")!.innerHTML = transpile(suspense.error(error as Error));
    } finally {
      clearTimeout(loaderTimer);
      history.pushState(null, "", url);
      window.dispatchEvent(new Event("load"));
      document.getElementById("loading-indicator")?.classList.add("hide");
    }
  }

  if (inAppRouting) {
    window.addEventListener("load", () => {
      const anchors = document.querySelectorAll<HTMLAnchorElement>("a");
      anchors.forEach((anchor) => {
        if (anchor._isHandled) return;
        anchor.addEventListener("click", (event) => {
          const targetUrl = new URL(anchor.href);
          if (targetUrl.origin !== location.origin || anchor.download) return;
          event.preventDefault();
          clientRender();
        });
        anchor._isHandled = true;
      });
    })
  }

  return {
    clientRender,
  };
}