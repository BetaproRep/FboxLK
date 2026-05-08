import { useQuery } from '@tanstack/react-query'
import { fetchDashboardSummary } from '@/api/dashboard'
import type { DashboardData } from '@/api/dashboard'

export function useDashboardData() {
  return useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => fetchDashboardSummary(),
    staleTime: 60_000,
  })
}
