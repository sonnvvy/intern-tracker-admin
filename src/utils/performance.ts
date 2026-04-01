export function debounce<T extends (...args: any[]) => void>(fn: T, delay = 300) {
  let timer: number | null = null

  return (...args: Parameters<T>) => {
    if (timer !== null) {
      window.clearTimeout(timer)
    }
    timer = window.setTimeout(() => {
      fn(...args)
    }, delay)
  }
}

export function throttle<T extends (...args: any[]) => void>(fn: T, delay = 200) {
  let last = 0
  let timer: number | null = null

  return (...args: Parameters<T>) => {
    const now = Date.now()
    const remain = delay - (now - last)

    if (remain <= 0) {
      if (timer !== null) {
        window.clearTimeout(timer)
        timer = null
      }
      last = now
      fn(...args)
      return
    }

    if (timer === null) {
      timer = window.setTimeout(() => {
        last = Date.now()
        timer = null
        fn(...args)
      }, remain)
    }
  }
}
