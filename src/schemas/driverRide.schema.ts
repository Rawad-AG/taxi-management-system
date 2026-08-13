import { z } from 'zod';

export const driverActionSchema = z.object({
  params: z.object({
    id: z.string().min(1),
    action: z.enum(['accept', 'arrive', 'start', 'complete']),
  }),
});
