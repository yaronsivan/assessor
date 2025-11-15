export const MESSAGES = {
  survey: {
    name: {
      fun: "First things first - what's your name, brave soul?",
      formal: "What's your name?"
    },
    email: {
      fun: "And your email? (I promise I won't spam you from inside this lamp!)",
      formal: "What's your email? (optional)"
    },
    canDecode: {
      fun: "Quick question - can you actually read Hebrew letters, or are they still just squiggly lines to you?",
      formal: "Can you decode/read the Hebrew alphabet?"
    },
    hasStudied: {
      fun: "Have you dabbled in Hebrew before, or is this your first rodeo?",
      formal: "Have you studied Hebrew before?"
    },
    studyDetails: {
      fun: "Alright, tell me about your Hebrew journey!",
      formal: "Tell me about your study experience"
    }
  },

  validationQuestions: {
    fun: {
      present: "I bet you've got the PRESENT tense down, don't you?",
      inf: "You know your infinitives and binyanim, right?",
      past: "I'm guessing you control PAST tense pretty comfortably?",
      futBasic: "You've mastered basic FUTURE tense, haven't you?",
      futAdv: "I suspect you can handle advanced FUTURE forms and irregulars?",
      passive: "You know some PASSIVE verbs, I'm sure!",
      fluencyDaily: "You're fluent in daily conversation, aren't you?",
      fluencyComplex: "I bet you can handle complex tasks like forms and long instructions?",
      fluencyNews: "You can read news and formal texts with ease, can't you?",
      academic: "I'm thinking you can manage academic or legal content, no?"
    },
    formal: {
      present: "Do you control PRESENT tense (basic forms)?",
      inf: "Do you know infinitives and binyanim?",
      past: "Do you control PAST tense comfortably?",
      futBasic: "Do you control FUTURE (basic forms)?",
      futAdv: "Do you control FUTURE (advanced/irregulars)?",
      passive: "Do you know some PASSIVE verbs?",
      fluencyDaily: "Are you fluent in daily conversation?",
      fluencyComplex: "Can you handle complex tasks (forms, long instructions)?",
      fluencyNews: "Can you read news/formal texts with relative ease?",
      academic: "Can you manage academic/legal content?"
    }
  },

  game: {
    loading: {
      fun: "Give me a moment while I conjure up some questions for you...",
      formal: "Loading questions..."
    },
    warmup: {
      fun: "Let's warm up with a couple questions first... I need to calibrate my magic!",
      formal: "Let's start with a few warmup questions."
    },
    playful: {
      fun: [
        "Let's see how you handle this one...",
        "Here's an interesting question for you!",
        "Show me what you've got!",
        "Ready for the next challenge?",
        "I'm curious to see how you do with this...",
        "Let's keep going!",
        "Another question coming your way!",
        "Time to test your skills!",
        "Ooh, this one's a good one!",
        "Think you can crack this?",
        "My magical sense tells me you'll like this question!",
        "Here comes another one!"
      ],
      formal: [
        "Next question:",
        "Please answer the following:",
        "Question:",
        "Consider this question:"
      ]
    },
    supportive: {
      fun: "Just a few more questions and I'll be FREE! Almost there!",
      formal: "Just a few more questions to complete the assessment..."
    },
    processing: {
      fun: "Let me consult my ancient scrolls... Processing your results!",
      formal: "Processing your results..."
    }
  },

  gateFail: {
    fun: "Ah, you're not quite ready for this quest yet! Come back when you can decode the Hebrew alphabet, and I'll be here waiting (still trapped, unfortunately).",
    formal: "This test is for readers of Hebrew script. Once you can decode the alphabet, come back and we'll assess you."
  },

  results: {
    beginner: {
      fun: "{name}, you're just starting your Hebrew journey! How exciting! Let me help you find the perfect starting point!",
      formal: "{name}, you are at the beginner level."
    },
    discovered: {
      fun: "Aha! I knew it, {name}! I've figured out exactly where you belong in your Hebrew journey!",
      formal: "Assessment complete, {name}. Here are your results."
    },
    thanks: {
      fun: "Thanks for helping me escape for a moment! Now I must return to my lamp... until someone else needs their level assessed! 🧞‍♂️✨",
      formal: "Thank you for completing the Hebrew Level Assessment."
    }
  }
};

export function getMessage(path, mode = 'fun', variables = {}) {
  const keys = path.split('.');
  let message = MESSAGES;

  for (const key of keys) {
    message = message[key];
    if (!message) return '';
  }

  if (typeof message === 'object' && (message.fun || message.formal)) {
    message = message[mode] || message.fun;
  }

  // Replace variables like {name}
  if (typeof message === 'string') {
    Object.keys(variables).forEach(key => {
      message = message.replace(`{${key}}`, variables[key]);
    });
  }

  return message;
}
