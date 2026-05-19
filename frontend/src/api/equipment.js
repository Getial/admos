import api from './axios'

export const brandsApi = {
  list: (search = '') => api.get('/brands/', { params: search ? { search } : {} }),
  create: (data) => api.post('/brands/', data),
  update: (id, data) => api.patch(`/brands/${id}/`, data),
  remove: (id) => api.delete(`/brands/${id}/`),
}

export const equipmentApi = {
  list: (search = '') => api.get('/equipment/', { params: search ? { search } : {} }),
  create: (data) => api.post('/equipment/', data),
  update: (id, data) => api.patch(`/equipment/${id}/`, data),
  remove: (id) => api.delete(`/equipment/${id}/`),
}
