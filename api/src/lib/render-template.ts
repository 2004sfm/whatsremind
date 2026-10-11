import { db, schema } from "../db";
import { eq } from "drizzle-orm";

interface TemplateComponent {
  type: string;
  text?: string;
}

export function replaceParameters(text: string, parameters: string[]): string {
  let rendered = text;
  parameters.forEach((param, index) => {
    const placeholder = new RegExp(`\\{\\{${index + 1}\\}\\}`, "g");
    rendered = rendered.replace(placeholder, param);
  });
  return rendered;
}

export async function renderTemplateToText(
  templateName: string,
  parameters: string[]
): Promise<string> {
  const template = await db.query.localTemplates.findFirst({
    where: eq(schema.localTemplates.name, templateName),
  });

  if (!template || !template.componentsJson) {
    // Fallback if template is not stored locally
    const name = parameters[0] ?? "";
    const code = parameters[1] ?? "";
    const debt = parameters[2] ?? "";
    return `Hola ${name}, te recordamos que tu código es ${code} y tu saldo pendiente es ${debt}.`;
  }

  try {
    const components = JSON.parse(template.componentsJson) as unknown;
    if (!Array.isArray(components)) {
      return replaceParameters(template.componentsJson, parameters);
    }

    const parts: string[] = [];

    for (const comp of components) {
      if (typeof comp === "object" && comp !== null && "text" in comp && typeof (comp as TemplateComponent).text === "string") {
        const componentText = (comp as TemplateComponent).text || "";
        parts.push(replaceParameters(componentText, parameters));
      }
    }

    return parts.join("\n\n");
  } catch {
    return replaceParameters(template.componentsJson, parameters);
  }
}
