import { z } from 'zod';
export const AskInput = z.object({ question: z.string().trim().min(1).max(8000) }).strict();
export const AskResponse = z.object({
  answer: z.string().min(1).max(16000), confidence: z.number().min(0).max(1),
  assumptions: z.array(z.string().max(1000)).max(20), sources: z.array(z.string().max(1000)).max(30),
}).strict();
export type AskResponse = z.infer<typeof AskResponse>;
export const ErrorEnvelope = z.object({ error: z.object({ code: z.string(), message: z.string(), requestId: z.string() }) });
export const jsonSchema = (schema: z.ZodType) => z.toJSONSchema(schema, { target: 'draft-7' });
