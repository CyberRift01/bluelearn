import { z } from 'zod'

// For creating a guide, shared by the API (request
// validation) and the frontend (form validation + inferred type).
// A guide starts as an empty draft and is fleshed out in the editor, so
// every field is optional; knowledge_type defaults to theory.
export const createGuideSchema = z.object({
  title: z.string().trim().max(200).nullish(),
  knowledge_type: z.enum(['theory', 'practice']).default('theory'),
  summary: z.string().trim().max(500).nullish(),
  body: z.string().trim().nullish(),
})

export type CreateGuideInput = z.infer<typeof createGuideSchema>
