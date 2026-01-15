import { z } from "npm:zod@3";

export const SavePageSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9\-\/]+$/),
  content_json: z.any().optional(),
  content: z.string().optional(),
  body_html: z.string().optional(),
  page_id: z.string().uuid().optional(),
  content_type: z.enum(['page', 'news', 'destination', 'trip']).optional(),
  is_template: z.union([z.boolean(), z.literal('true'), z.literal('false')]).optional(),
  template_category: z.string().max(50).optional(),
  preview_image_url: z.string().url().optional()
});

export const PublishPageSchema = z.object({
  body_html: z.string().optional()
});