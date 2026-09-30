import { z } from "zod";
import { LIST_COLOR_IDS, LIST_ICON_IDS } from "@/lib/lists/icons";
import { KINDS } from "@/lib/titles/kinds";

export const listInputSchema = z.object({
  name: z.string().trim().min(1, "Give the list a name.").max(40, "Keep the name under 40 characters."),
  icon: z.enum(LIST_ICON_IDS, "Choose an icon."),
  color: z.enum(LIST_COLOR_IDS, "Choose a color."),
});

export const manualTitleSchema = z.object({
  name: z.string().trim().min(1, "Enter the title.").max(200, "That title is too long."),
  kind: z.enum(KINDS, "Choose movie, series or anime."),
  year: z
    .string()
    .trim()
    .transform((s) => (s ? Number(s) : null))
    .pipe(z.number().int("Enter a year like 2019.").min(1880, "Enter a year like 2019.").max(2100, "Enter a year like 2019.").nullable()),
});

export type FormState = { errors?: Record<string, string> };

// Zod's issues as one message per field, the first for each.
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) errors[String(issue.path[0] ?? "form")] ??= issue.message;
  return errors;
}
