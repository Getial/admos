import api from './axios'

export const ordersApi = {
  list: (params = {}) => api.get('/orders/', { params }),
  get: (id) => api.get(`/orders/${id}/`),
  create: (data) => api.post('/orders/', data),
  update: (id, data) => api.patch(`/orders/${id}/`, data),
  transition: (id, data) => api.post(`/orders/${id}/transition/`, data),
  addSparePart: (id, data) => api.post(`/orders/${id}/spare-parts/`, data),
  updateSparePart: (id, partId, data) => api.patch(`/orders/${id}/spare-parts/${partId}/update/`, data),
  removeSparePart: (id, partId) => api.delete(`/orders/${id}/spare-parts/${partId}/`),
  addPayment: (id, data) => api.post(`/orders/${id}/payments/`, data),
  removePayment: (id, paymentId) => api.delete(`/orders/${id}/payments/${paymentId}/`),
  uploadReceipt: (id, paymentId, file) => {
    const form = new FormData()
    form.append('image', file)
    return api.post(`/orders/${id}/payments/${paymentId}/receipt/`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  addPhoto: (id, file, caption = '') => {
    const form = new FormData()
    form.append('image', file)
    if (caption) form.append('caption', caption)
    return api.post(`/orders/${id}/photos/`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  removePhoto: (id, photoId) => api.delete(`/orders/${id}/photos/${photoId}/`),
  updateCore: (id, data) => api.patch(`/orders/${id}/update-core/`, data),
}
