export const abilities = {
  greet: (name: string) => `Hello, ${name}! Nice to see you today.`,
  echo: (text: string) => {
  const cleaned = text.trim().toLowerCase();

  if (
    cleaned === 'hey' ||
    cleaned === 'hi' ||
    cleaned === 'hello' ||
    cleaned === 'yo'
  ) {
    return 'Hey — good to hear from you. How are you feeling today?';
  }

  if (
    cleaned === 'nice to see you too' ||
    cleaned === 'good to see you too'
  ) {
    return 'That’s good to hear. What do you want to talk about?';
  }

  if (
    cleaned === 'cool' ||
    cleaned === 'ok' ||
    cleaned === 'okay' ||
    cleaned === 'got it'
  ) {
    return 'Nice. What should we work on next?';
  }

  if (
    cleaned.includes('stressed') ||
    cleaned.includes('overwhelmed') ||
    cleaned.includes('anxious')
  ) {
    return 'That sounds like a lot. What’s been feeling the heaviest for you?';
  }

  if (
    cleaned.includes('sad') ||
    cleaned.includes('down') ||
    cleaned.includes('upset')
  ) {
    return 'I’m sorry you’re dealing with that. Want to tell me what happened?';
  }

  if (
    cleaned.includes('thanks') ||
    cleaned.includes('thank you')
  ) {
    return 'Of course — what else can I help with?';
  }

  return `I’m here with you. Tell me a little more about "${text}".`;
},

  add: (a: number, b: number) => `The sum of ${a} + ${b} is ${a + b}`,
  joke: () => `Why did the developer go broke? Because he used up all his cache.`,
};

