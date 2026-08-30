/**
 * Interface strings for the assistant, in the languages Cupertino actually
 * speaks. Roughly 55% of residents speak a language other than English at
 * home, so English-only help reaches barely half the city.
 *
 * Only the interface is translated. Agenda titles, motions and headlines stay
 * in their original language, because machine-translating an official record
 * without the city standing behind it is how someone ends up at the wrong
 * hearing. The assistant explains any of it on request instead.
 */
export interface ChatStrings {
  label: string;
  intro: string;
  recordsNote: string;
  placeholder: string;
  ask: string;
  working: string;
  thinking: string;
  disclaimer: string;
  inputLabel: string;
  suggestions: string[];
}

export const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "zh-Hant", name: "繁體中文" },
  { code: "zh-Hans", name: "简体中文" },
  { code: "hi", name: "हिन्दी" },
  { code: "es", name: "Español" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];

/** Told to the model so it replies in the reader's language. */
export const LANGUAGE_NAMES: Record<LanguageCode, string> = {
  en: "English",
  "zh-Hant": "Traditional Chinese (繁體中文)",
  "zh-Hans": "Simplified Chinese (简体中文)",
  hi: "Hindi (हिन्दी)",
  es: "Spanish (Español)",
};

export const STRINGS: Record<LanguageCode, ChatStrings> = {
  en: {
    label: "Cupertino Eye",
    intro:
      "Ask about meetings, agendas, the council, commissions, the November election, or local news. Answers come from the city's own records.",
    recordsNote:
      "Agendas, motions and headlines stay in their original language because they are the official record. Ask and the assistant will explain any of it.",
    placeholder: "Ask about meetings, the council, the election...",
    ask: "Ask",
    working: "Working",
    thinking: "Checking the city's records",
    disclaimer:
      "Answers are generated and can be wrong. This site is not the City of Cupertino. Confirm anything with legal or financial consequences against the city's official records.",
    inputLabel: "Ask a question about Cupertino city government",
    suggestions: [
      "What's happening in the parks this week?",
      "Is there a city meeting coming up?",
      "How do I speak at a council meeting?",
      "Who's running for council in November?",
      "How did the council vote on housing?",
      "What's in the local news?",
    ],
  },
  "zh-Hant": {
    label: "Cupertino Eye",
    intro:
      "可詢問會議、議程、市議會、委員會、十一月選舉或地方新聞。答案來自市府本身的公開紀錄。",
    recordsNote:
      "議程、動議與新聞標題屬於官方紀錄，因此保留原文。若需說明，請直接詢問助理。",
    placeholder: "詢問會議、市議會、選舉…",
    ask: "詢問",
    working: "處理中",
    thinking: "正在查詢市府紀錄",
    disclaimer:
      "答案由 AI 生成，可能有誤。本網站並非庫比蒂諾市政府。涉及法律或財務後果的事項，請以市府官方紀錄為準。",
    inputLabel: "詢問庫比蒂諾市政府相關問題",
    suggestions: [
      "這星期公園有什麼活動？",
      "最近有市府會議嗎？",
      "我要如何在市議會發言？",
      "十一月有誰參選市議員？",
      "市議會對住房案怎麼投票？",
      "最近有什麼地方新聞？",
    ],
  },
  "zh-Hans": {
    label: "Cupertino Eye",
    intro:
      "可询问会议、议程、市议会、委员会、十一月选举或地方新闻。答案来自市府本身的公开记录。",
    recordsNote:
      "议程、动议与新闻标题属于官方记录，因此保留原文。如需说明，请直接询问助理。",
    placeholder: "询问会议、市议会、选举…",
    ask: "询问",
    working: "处理中",
    thinking: "正在查询市府记录",
    disclaimer:
      "答案由 AI 生成，可能有误。本网站并非库比蒂诺市政府。涉及法律或财务后果的事项，请以市府官方记录为准。",
    inputLabel: "询问库比蒂诺市政府相关问题",
    suggestions: [
      "这星期公园有什么活动？",
      "最近有市府会议吗？",
      "我要如何在市议会发言？",
      "十一月有谁参选市议员？",
      "市议会对住房案怎么投票？",
      "最近有什么地方新闻？",
    ],
  },
  hi: {
    label: "Cupertino Eye",
    intro:
      "बैठकों, एजेंडा, काउंसिल, आयोगों, नवंबर के चुनाव या स्थानीय समाचार के बारे में पूछें। उत्तर शहर के अपने सार्वजनिक रिकॉर्ड से आते हैं।",
    recordsNote:
      "एजेंडा, प्रस्ताव और समाचार शीर्षक आधिकारिक रिकॉर्ड हैं, इसलिए वे मूल भाषा में ही रहते हैं। समझाने के लिए सहायक से पूछें।",
    placeholder: "बैठकों, काउंसिल या चुनाव के बारे में पूछें...",
    ask: "पूछें",
    working: "काम जारी",
    thinking: "शहर के रिकॉर्ड देखे जा रहे हैं",
    disclaimer:
      "उत्तर AI द्वारा तैयार किए जाते हैं और गलत हो सकते हैं। यह साइट क्यूपर्टिनो शहर की आधिकारिक साइट नहीं है। कानूनी या वित्तीय असर वाली किसी भी बात की पुष्टि शहर के आधिकारिक रिकॉर्ड से करें।",
    inputLabel: "क्यूपर्टिनो नगर सरकार के बारे में प्रश्न पूछें",
    suggestions: [
      "इस हफ़्ते पार्कों में क्या हो रहा है?",
      "क्या आने वाले दिनों में कोई शहर की बैठक है?",
      "मैं काउंसिल की बैठक में कैसे बोल सकता हूँ?",
      "नवंबर में काउंसिल के लिए कौन चुनाव लड़ रहा है?",
      "हाउसिंग पर काउंसिल ने कैसे मतदान किया?",
      "स्थानीय समाचार में क्या है?",
    ],
  },
  es: {
    label: "Cupertino Eye",
    intro:
      "Pregunta sobre reuniones, agendas, el concejo, las comisiones, las elecciones de noviembre o noticias locales. Las respuestas provienen de los registros oficiales de la ciudad.",
    recordsNote:
      "Las agendas, las mociones y los titulares se mantienen en su idioma original porque son el registro oficial. Pregunta y el asistente te explicará cualquiera de ellos.",
    placeholder: "Pregunta sobre reuniones, el concejo, las elecciones...",
    ask: "Preguntar",
    working: "Trabajando",
    thinking: "Consultando los registros de la ciudad",
    disclaimer:
      "Las respuestas son generadas y pueden contener errores. Este sitio no es la Ciudad de Cupertino. Confirma cualquier asunto con consecuencias legales o financieras en los registros oficiales de la ciudad.",
    inputLabel: "Haz una pregunta sobre el gobierno municipal de Cupertino",
    suggestions: [
      "¿Qué hay en los parques esta semana?",
      "¿Hay alguna reunión municipal próximamente?",
      "¿Cómo puedo hablar en una reunión del concejo?",
      "¿Quiénes se postulan al concejo en noviembre?",
      "¿Cómo votó el concejo sobre vivienda?",
      "¿Qué hay en las noticias locales?",
    ],
  },
};
