import { clearHydrations, hydrate } from '@carats/hooks'
import { defineFacets, Facets, getPageComponent, renderPage } from '@carats/render'
import { init, transpile } from 'jjsx'

declare global {
  interface HTMLAnchorElement {
    _isHandled: boolean
  }
  interface Window {
    carats: {
      ssp: {
        for: string | undefined,
        data: any
      }
      crown?: string
    }
  }
}

let _facets: Facets = defineFacets({});

export async function clientRender() {
  const { suspense } = _facets

  const url = location.pathname + location.search
  const loaderTimer = setTimeout(() => document.getElementById("loading-indicator")?.classList.remove("hide"), 250)
  await clearHydrations()
  try {
    const { component } = getPageComponent.call(_facets, location.href)
    let props = component.defaultProps
    if (component.burnished && (window.carats.ssp.for !== url || component.recast)) {
      const sspUrl = `/culet${url}`
      props = await fetch(sspUrl).then(r => r.json())
      window.carats.ssp.data = props
      window.carats.ssp.for = url
    } else {
      props = window.carats.ssp.data
    }
    hydrate(() => {
      let dynamicHead = ''
      if (component.head) {
        dynamicHead = transpile(component.head)
      }
      if (window.carats.crown) {
        document.head.innerHTML = document.head.innerHTML.replace(window.carats.crown, dynamicHead)
      } else {
        document.head.innerHTML += dynamicHead
      }
      window.carats.crown = dynamicHead
    })

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
  if (!window.carats) {
    window.carats = {
      ssp: {
        for: undefined,
        data: null
      }
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