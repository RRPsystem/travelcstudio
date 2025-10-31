import { z } from "npm:zod@3";

export const SaveContentSchema = z.object({
  id: z.string().uuid().optional(),
  brand_id: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  content: z.any().optional(),
  content_json: z.any().optional(),
  status: z.enum(['draft', 'published']).optional(),
  template_category: z.string().max(50).optional(),
  preview_image_url: z.string().url().optional()
});
