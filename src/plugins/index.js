/*
  Plugin system.

  A plugin is a plain object:
  {
    id: string,                 // stable unique id
    name: string,               // display name
    description: string,        // shown in the plugin panel
    version?: string,
    defaultEnabled?: boolean,

    // Slash commands contributed to the composer. Typing "/id" and sending
    // runs the command instead of hitting the model.
    commands?: [{
      name: string,             // without slash, e.g. "clear"
      description: string,
      run: (args: string, ctx) => void | Promise<void>,
    }],

    // Transform the outgoing messages array right before the API call.
    // Return a new array (or the same one). Runs in registration order for
    // all enabled plugins.
    transformOutgoing?: (messages, ctx) => messages,

    // Extra actions shown under an assistant message.
    messageActions?: [{
      label: string,
      icon?: string,
      run: (message, ctx) => void,
    }],
  }

  `ctx` gives plugins a small, safe surface into the app:
  {
    getState, addSystemNote, setComposer, sendMessage,
    newConversation, clearConversation, settings,
  }
*/

import { builtinPlugins } from "./builtins.jsx";

let registry = [];

export function registerPlugins(plugins) {
  for (const p of plugins) {
    if (!p || !p.id) continue;
    if (registry.some((x) => x.id === p.id)) continue;
    registry.push(p);
  }
}

export function getAllPlugins() {
  return registry.slice();
}

export function getPlugin(id) {
  return registry.find((p) => p.id === id);
}

// Collect enabled commands as a flat map: { name -> { plugin, command } }
export function collectCommands(enabledIds) {
  const map = new Map();
  for (const p of registry) {
    if (!enabledIds.includes(p.id)) continue;
    for (const cmd of p.commands || []) {
      map.set(cmd.name.toLowerCase(), { plugin: p, command: cmd });
    }
  }
  return map;
}

// Run every enabled transformOutgoing hook, in order.
export function applyOutgoingTransforms(messages, enabledIds, ctx) {
  let result = messages;
  for (const p of registry) {
    if (!enabledIds.includes(p.id)) continue;
    if (typeof p.transformOutgoing === "function") {
      try {
        const next = p.transformOutgoing(result, ctx);
        if (Array.isArray(next)) result = next;
      } catch (err) {
        console.warn(`Plugin "${p.id}" transformOutgoing failed:`, err);
      }
    }
  }
  return result;
}

export function collectMessageActions(enabledIds) {
  const actions = [];
  for (const p of registry) {
    if (!enabledIds.includes(p.id)) continue;
    for (const a of p.messageActions || []) {
      actions.push({ ...a, pluginId: p.id });
    }
  }
  return actions;
}

export function defaultEnabledIds() {
  return registry.filter((p) => p.defaultEnabled).map((p) => p.id);
}

// Register the built-ins on module load.
registerPlugins(builtinPlugins);
