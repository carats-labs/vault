import { clearHydrations } from '@carats/hooks'
import { Facets, getPageComponent, renderPage } from '@carats/render'
import { init, transpile } from 'jjsx'

declare global {
  interface HTMLAnchorElement {
    _isHandled: boolean
  }
  interface Window {
    ssp: {
      for: string | undefined,
      data: any
    }
  }
}

let _facets: Facets = {} as Facets;

export async function clientRender() {
  const { suspense } = _facets
  suspense.loading = suspense.loading ?? (() => <>💎 Loading...</>)
  suspense.error = suspense.error ?? ((error: Error) => <>💎 Error: {error.message}</>)
  suspense.notFound = suspense.notFound ?? (() => <>💎 Not Found</>)

  const url = location.pathname + location.search
  const loaderTimer = setTimeout(() => document.getElementById("loading-indicator")?.classList.remove("hide"), 250)
  await clearHydrations()
  try {
    const { component } = getPageComponent.call(_facets, location.href)
    let props = component.defaultProps
    if (component.burnished && (window.ssp.for !== url || component.recast)) {
      const sspUrl = `/culet${url}`
      props = await fetch(sspUrl).then(r => r.json())
      window.ssp.data = props
      window.ssp.for = url
    } else {
      props = window.ssp.data
    }
    const html = await renderPage.call(_facets, component, props)
    document.getElementById("app")!.innerHTML = html
  } catch (error) {
    document.getElementById("app")!.innerHTML = transpile(suspense.error(error as Error))
  } finally {
    clearTimeout(loaderTimer)
    window.dispatchEvent(new Event("load"))
    document.getElementById("loading-indicator")?.classList.add("hide")
  }
}

export function goTo(url: string) {
  const targetUrl = new URL(url, location.origin)
  if (targetUrl.origin !== location.origin) {
    window.location.href = url
    return
  }
  history.pushState(null, "", url)
  clientRender()
}

export function mount(facets: Facets) {
  init()
  if (!window.ssp) {
    window.ssp = {
      for: undefined,
      data: null
    }
  }
  _facets = facets
  const { inAppRouting = true } = facets

  if (inAppRouting) {
    window.addEventListener("load", () => {
      const anchors = document.querySelectorAll<HTMLAnchorElement>("a")
      anchors.forEach((anchor) => {
        if (anchor._isHandled) return
        const targetUrl = new URL(anchor.href, location.origin)
        if (targetUrl.origin !== location.origin || anchor.download) return
        anchor.addEventListener("click", (event) => {
          event.preventDefault()
          history.pushState(null, "", anchor.href)
          clientRender()
        })
        anchor._isHandled = true
      })
    })
    window.addEventListener("popstate", clientRender)
  }
}