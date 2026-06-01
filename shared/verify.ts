import z from "zod"

export function verifyEmail(email: any): string {
  return z.string().trim().toLowerCase().pipe(z.email()).parse(email)
}

export function verifyPrimitiveMetadata(target: any) {
  return z.object({
    data: z.record(z.string(), z.array(z.string())),
    customGroups: z.array(z.object({
      id: z.string(),
      name: z.string().max(5),
      sources: z.array(z.string()),
    })).optional(),
    updatedTime: z.number(),
  }).parse(target)
}
