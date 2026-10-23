import { api } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'

type Payload = {
  classes: Array<{ id: string; name: string }>
}

export function useTeacherClass() {
  const query = useQuery({
    queryKey: ['teacher-classes'],
    queryFn: () => api<Payload>('/api/teacher/classes'),
  })
  const classes = query.data?.classes ?? []
  return {
    query,
    classes,
    classId: classes[0]?.id,
    className: classes[0]?.name,
  }
}
