import { clearHydrations, hydrate } from '@carats/hooks'
import { defineFacets, Facets, getPageComponent } from '@carats/render'
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
    }
  }
}

let _facets: Facets = defineFacets({});

export async function clientRender() {
  if (typeof window === 'undefined') return
  const url = location.pathname + location.search
  const loaderTimer = setTimeout(() => document.getElementById("loading-indicator")?.classList.remove("hide"), 250)
  await clearHydrations()
  try {
    const { component, params } = getPageComponent.call(_facets, location.href)
    let props = component.defaultProps
    let loading = false
    if (component.burnished && (window.carats.ssp.for !== url || component.recast)) {
      loading = true
      document.getElementById("app")!.innerHTML = await transpile(Promise.resolve(_facets.suspense.loading()))
      const sspUrl = `/culet${url}`
      props = await fetch(sspUrl).then(r => r.json())
      window.carats.ssp.data = props
      window.carats.ssp.for = url
    }
    else if (window.carats.ssp.for !== url) {
      props = params || component.defaultProps
    }
    else {
      props = window.carats.ssp.data
    }
    let element = component.call(component, props)
    if (element instanceof Promise && !loading) {
      loading = true
      document.getElementById("app")!.innerHTML = await transpile(Promise.resolve(_facets.suspense.loading()))
    }
    element = await element
    hydrate(async () => {
      if (!component.head) return
      const headStart = document.getElementById('carats-crown-start')
      if (!headStart) throw Error('carats-crown-start is not mounted')
      const headEnd = document.getElementById('carats-crown-end')
      if (!headEnd) throw Error('carats-crown-end is not mounted')
      const range = document.createRange()
      range.setStartAfter(headStart)
      range.setEndBefore(headEnd)
      range.deleteContents()
      const fragment = range.createContextualFragment(await transpile(Promise.resolve(component.head)))
      headStart.after(fragment)
    })

    const html = await transpile(Promise.resolve(element))
    document.getElementById("app")!.innerHTML = html
  } catch (error) {
    const errorElement = await transpile(Promise.resolve(_facets.suspense.error(error as Error)))
    document.getElementById("app")!.innerHTML = errorElement
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
  _facets = facets

  if (!window.carats) {
    window.carats = {
      ssp: {
        for: undefined,
        data: null
      }
    }
  }
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
  return facets;
}