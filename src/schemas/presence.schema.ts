import { z } from 'zod';

export const togglePresenceSchema = z.object({
  body: z.object({
    online: z.boolean(),
  }),
});
