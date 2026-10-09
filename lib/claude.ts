import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;
const getClient = () => (client ??= new Anthropic());

export const model = () => process.env.CLAUDE_MODEL || "claude-sonnet-5-5";

export type ToolDef = Anthropic.Tool;

/**
 * Makes Claude answer through one tool and returns that tool's input.
 * Current models reject a forced tool_choice, so we use "auto" with a strict
 * schema, tell Claude to call the tool, and nudge once if it answers in text.
 */
export async function callTool<T>(system: string, messages: Anthropic.MessageParam[], tool: ToolDef): Promise<T> {
  const request = (msgs: Anthropic.MessageParam[]) =>
    getClient().messages.create({
      model: model(),
      max_tokens: 16000,
      system: `${system}\n\nAnswer only by calling the ${tool.name} tool.`,
      messages: msgs,
      tools: [{ ...tool, strict: true }],
      tool_choice: { type: "auto" },
      output_config: { effort: "medium" },
    });

  let res = await request(messages);
  for (let attempt = 0; attempt < 2; attempt++) {
    if (res.stop_reason === "refusal") throw new Error("Claude declined this request.");
    const call = res.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === tool.name);
    if (call) return call.input as T;
    if (attempt === 1) break;
    res = await request([
      ...messages,
      { role: "assistant", content: res.content },
      { role: "user", content: `Please answer by calling the ${tool.name} tool.` },
    ]);
  }
  throw new Error(`Claude didn't call ${tool.name}.`);
}

/** Raw access for the chat agent's tool loop (Step 7). */
export function createMessage(params: Omit<Anthropic.MessageCreateParamsNonStreaming, "model">) {
  return getClient().messages.create({ model: model(), ...params });
}
