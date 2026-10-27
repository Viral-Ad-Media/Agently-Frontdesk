import * as React from "react"

// Measures an element before paint and keeps the size in sync as it resizes.
// Returns undefined until the first measurement.
export function useSize(ref) {
  const [size, setSize] = React.useState(undefined)

  React.useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const { width, height } = el.getBoundingClientRect()
      setSize((prev) =>
        prev && prev.width === Math.round(width) && prev.height === Math.round(height)
          ? prev
          : { width: Math.round(width), height: Math.round(height) }
      )
    }
    measure()
    if (typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])

  return size
}
