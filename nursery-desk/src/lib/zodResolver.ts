import type { FieldErrors, FieldValues, Resolver } from 'react-hook-form'
import type { z } from 'zod'

export function zodResolver<T extends z.ZodType>(schema: T): Resolver<z.infer<T> & FieldValues> {
  const resolver: Resolver<z.infer<T> & FieldValues> = async (values) => {
    const result = schema.safeParse(values)
    if (result.success) {
      return {
        values: result.data as z.infer<T> & FieldValues,
        errors: {},
      }
    }

    const errors: FieldErrors<z.infer<T> & FieldValues> = {}
    for (const issue of result.error.issues) {
      const key = String(issue.path[0] ?? 'root')
      if (!errors[key]) {
        Object.assign(errors, {
          [key]: { type: issue.code, message: issue.message },
        })
      }
    }
    return { values: {}, errors }
  }

  return resolver
}
