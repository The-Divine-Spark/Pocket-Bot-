import fs from "fs";
import { abilities } from "./abilities";

const memoryFile = "./memory.json";

// Load memory
function loadMemory() {
  return JSON.parse(fs.readFileSync(memoryFile, "utf-8"));
}

// Save memory
function saveMemory(memory: any) {
  fs.writeFileSync(memoryFile, JSON.stringify(memory, null, 2));
}

// Main brain function
export async function think(userMessage: string) {
  const memory = loadMemory();
  memory.conversationHistory.push({ user: userMessage });

  let response = "";

  // Simple keyword matching logic
  if (userMessage.toLowerCase().includes("hello")) {
    response = abilities.greet("friend");

  } else if (userMessage.toLowerCase().startsWith("add ")) {
    const parts = userMessage.trim().split(/\s+/);

    if (parts.length < 3) {
      response = "Please use the format: add 4 9";
    } else {
      const a = Number(parts[1]);
      const b = Number(parts[2]);

      if (Number.isNaN(a) || Number.isNaN(b)) {
        response = "Please use numbers only, like: add 4 9";
      } else {
        response = abilities.add(a, b);
      }
    }

  } else if (userMessage.toLowerCase().includes("joke")) {
    response = abilities.joke();

  } else {
    response = abilities.echo(userMessage);
  }

  memory.conversationHistory.push({ bot: response });
  saveMemory(memory);

  return response;
}
