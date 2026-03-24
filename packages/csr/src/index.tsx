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

if (!window.ssp) {
  window.ssp = {
    for: undefined,
    data: null
  }
}

function matchHallmarkComponent(hallmarkPath: string, component: Function){
  const hallmarkName = hallmarkPath.split('/').pop()
  return component.name === hallmarkName
}

export default async function BuildCarats(facets: Facets) {
  init()
  const hallmarks: string[] = await fetch('/.carats/hallmarks').then(r => r.json())
  const { suspense, inAppRouting = true } = facets
  suspense.loading = suspense.loading ?? (() => <>💎 Loading...</>)
  suspense.error = suspense.error ?? ((error: Error) => <>💎 Error: {error.message}</>)
  suspense.notFound = suspense.notFound ?? (() => <>💎 Not Found</>)

  async function clientRender() {
    const url = location.pathname + location.search
    const loaderTimer = setTimeout(() => document.getElementById("loading-indicator")?.classList.remove("hide"), 250)
    await clearHydrations()
    try {
      const { component, params } = getPageComponent.call(facets, location.pathname)
      let props = window.ssp.data
      if (window.ssp.for !== component.name) {
        props = component.defaultProps || { url, params }
        if (hallmarks.some(route => matchHallmarkComponent(route, component))) {
          const sspUrl = `/api${url}`
          props = await fetch(sspUrl).then(r => r.json())
          window.ssp.data = props
          window.ssp.for = component.name
        }
      }
      const html = await renderPage.call(facets, component, props)
      document.getElementById("app")!.innerHTML = html
    } catch (error) {
      document.getElementById("app")!.innerHTML = transpile(suspense.error(error as Error))
    } finally {
      clearTimeout(loaderTimer)
      window.dispatchEvent(new Event("load"))
      document.getElementById("loading-indicator")?.classList.add("hide")
    }
  }

  if (inAppRouting) {
    window.addEventListener("load", () => {
      const anchors = document.querySelectorAll<HTMLAnchorElement>("a")
      anchors.forEach((anchor) => {
        if (anchor._isHandled) return
        anchor.addEventListener("click", (event) => {
          history.pushState(null, "", anchor.href)
          const targetUrl = new URL(anchor.href)
          if (targetUrl.origin !== location.origin || anchor.download) return
          event.preventDefault()
          clientRender()
        })
        anchor._isHandled = true
      })
    })
  }

  return {
    clientRender,
  }
}