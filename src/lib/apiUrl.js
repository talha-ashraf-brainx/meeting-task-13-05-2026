export function apiUrl(path) {
  const origin = import.meta.env.VITE_DEV_API_ORIGIN
  return origin ? `${origin}${path}` : path
}
