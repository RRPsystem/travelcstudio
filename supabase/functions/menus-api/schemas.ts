import { z } from "npm:zod@3";

const MenuItemSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().min(1).max(100),
  url: z.string().max(500),
  order: z.number().int().min(0),
  parent_id: z.string().uuid().nullable().optional()
});

export const SaveMenuSchema = z.object({
  brand_id: z.string().uuid(),
  menu_id: z.string().uuid().optional(),
  name: z.string().min(1).max(100),
  items: z.array(MenuItemSchema)
});
