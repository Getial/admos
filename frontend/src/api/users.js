import api from './axios'

export const usersApi = {
  list: (search = '') => api.get('/users/', { params: search ? { search } : {} }),
  create: (data) => api.post('/users/', data),
  update: (id, data) => api.patch(`/users/${id}/`, data),
}
