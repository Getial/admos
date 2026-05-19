import api from './axios'

export const clientsApi = {
  list: (search = '') => api.get('/clients/', { params: search ? { search } : {} }),
  create: (data) => api.post('/clients/', data),
  update: (id, data) => api.patch(`/clients/${id}/`, data),
  remove: (id) => api.delete(`/clients/${id}/`),
}
