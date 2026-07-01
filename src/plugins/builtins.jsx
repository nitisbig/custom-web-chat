// Built-in plugins that ship with the app. Each demonstrates a different hook.

const now = () => new Date().toLocaleString();

/** Slash commands: /clear, /new, /system, /shrug */
const commandsPlugin = {
  id: "core-commands",
  name: "Slash Commands",
  description:
    "Adds /new, /clear, /system <text>, and /shrug. Type a command in the composer and send.",
  version: "1.0.0",
  defaultEnabled: true,
  commands: [
    {
      name: "new",
      description: "Start a new conversation",
      run: (_args, ctx) => ctx.newConversation(),
    },
    {
      name: "clear",
      description: "Clear the current conversation",
      run: (_args, ctx) => ctx.clearConversation(),
    },
    {
      name: "system",
      description: "Set the system prompt: /system You are a pirate.",
      run: (args, ctx) => {
        const text = args.trim();
        ctx.updateSettings({ systemPrompt: text });
        ctx.addSystemNote(
          text ? `System prompt set to: "${text}"` : "System prompt cleared."
        );
      },
    },
    {
      name: "shrug",
      description: "Append ¯\\_(ツ)_/¯ to the composer",
      run: (_args, ctx) => {
        const cur = ctx.getComposer();
        ctx.setComposer((cur + " ¯\\_(ツ)_/¯").trim());
      },
    },
  ],
};

/** Injects the current date/time so the model can answer "what time is it". */
const timeAwarePlugin = {
  id: "time-aware",
  name: "Time Awareness",
  description:
    "Silently tells the model the current local date and time on every request.",
  version: "1.0.0",
  defaultEnabled: false,
  transformOutgoing: (messages) => {
    const note = {
      role: "system",
      content: `Context: the current local date and time is ${now()}.`,
    };
    return [note, ...messages];
  },
};

/** Enforces terse answers via a prepended system instruction. */
const concisePlugin = {
  id: "concise-mode",
  name: "Concise Mode",
  description:
    "Prepends an instruction asking the model to be brief and skip filler.",
  version: "1.0.0",
  defaultEnabled: false,
  transformOutgoing: (messages) => [
    {
      role: "system",
      content:
        "Be concise. Prefer short, direct answers. Avoid preamble, filler, and repetition unless asked to elaborate.",
    },
    ...messages,
  ],
};

/** Adds a "Word count" action beneath assistant messages. */
const wordCountPlugin = {
  id: "word-count",
  name: "Word Count Action",
  description:
    'Adds a "Count" button under assistant replies that reports word and character counts.',
  version: "1.0.0",
  defaultEnabled: true,
  messageActions: [
    {
      label: "Count",
      icon: "#",
      run: (message, ctx) => {
        const words = (message.content.trim().match(/\S+/g) || []).length;
        const chars = message.content.length;
        ctx.addSystemNote(`That reply: ${words} words, ${chars} characters.`);
      },
    },
  ],
};

export const builtinPlugins = [
  commandsPlugin,
  wordCountPlugin,
  timeAwarePlugin,
  concisePlugin,
];
