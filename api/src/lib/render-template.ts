import { db, schema } from "../db";
import { eq } from "drizzle-orm";

interface TemplateComponent {
  type: string;
  text?: string;
}

export function getDynamicGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "¡Buenos días!";
  if (hour >= 12 && hour < 19) return "¡Buenas tardes!";
  return "¡Buenas noches!";
}

export function replaceParameters(text: string, parameters: string[]): string {
  let rendered = text;

  // Dynamic greeting: {{0}}, {{salute}}, {{saludo}}
  const greeting = getDynamicGreeting();
  rendered = rendered.replace(/\{\{(0|salute|saludo)\}\}/gi, greeting);

  // Spintax support: {Hola|Buenos días|Saludos}
  rendered = rendered.replace(/\{([^{}]+)\}/g, (_, choices) => {
    const parts = choices.split("|");
    return parts[Math.floor(Math.random() * parts.length)] || "";
  });

  // Numbered variables: {{1}} = code, {{2}} = debt, {{3}} = name, etc.
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
    const code = parameters[0] ?? "";
    const debt = parameters[1] ?? "";
    const name = parameters[2] ?? "";
    const greeting = getDynamicGreeting();
    return `${greeting} ${name}, le recordamos que su apartamento ${code} presenta un saldo pendiente de ${debt}.`;
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
