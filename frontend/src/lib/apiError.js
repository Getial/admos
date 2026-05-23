export function getApiError(error) {
  if (!error) return null
  const data = error?.response?.data
  if (data && typeof data === 'object') {
    return Object.values(data).flat().join(' ')
  }
  return error.message ?? 'Error inesperado'
}
