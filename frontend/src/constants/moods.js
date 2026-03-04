export const MOODS = [
    { label: "Lonely",   color: "#7cb8e8", bg: "rgba(124,184,232,0.1)", emoji: "🌑" },
    { label: "Hopeful",  color: "#7ce8a8", bg: "rgba(124,232,168,0.1)", emoji: "🌱" },
    { label: "Angry",    color: "#e87c7c", bg: "rgba(232,124,124,0.1)", emoji: "🔥" },
    { label: "Grateful", color: "#e8c87c", bg: "rgba(232,200,124,0.1)", emoji: "✨" },
    { label: "Anxious",  color: "#9b8fd4", bg: "rgba(155,143,212,0.1)", emoji: "🌀" },
    { label: "Tired",    color: "#8a9bac", bg: "rgba(138,155,172,0.1)", emoji: "🌙" },
    { label: "Joyful",   color: "#e8a87c", bg: "rgba(232,168,124,0.1)", emoji: "☀️" },
    { label: "Numb",     color: "#708090", bg: "rgba(112,128,144,0.1)", emoji: "🫧" },
  ];
  
  export function getMoodByLabel(label) {
    return MOODS.find((m) => m.label === label) || MOODS[0];
  }