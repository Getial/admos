import api from './axios'

const params = (start, end, extra = {}) => ({
  params: { start, end, ...extra },
})

export const dashboardApi = {
  productivity:  (start, end, technicianId) =>
    api.get('/dashboard/productivity/', params(start, end, technicianId ? { technician: technicianId } : {})),
  equipment:     (start, end) => api.get('/dashboard/equipment/',    params(start, end)),
  revenue:       (start, end) => api.get('/dashboard/revenue/',      params(start, end)),
  repairTimes:   (start, end) => api.get('/dashboard/repair-times/', params(start, end)),
}
