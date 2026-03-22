export interface VoiceSelection {
  voiceId: string;
  voiceLabel: string;
  docType: string;
}

// ElevenLabs premade voice IDs
// Arnold  - VR6AewLTigWG4xSOukaG - powerful, commanding
// Rachel  - 21m00Tcm4TlvDq8ikWAM - calm, solemn
// Josh    - TxGEqnHWrfWFTfGW9XjX - authoritative, political
// Antoni  - ErXwobaYiN019PkySvjV - warm, intimate
// Adam    - pNInz6obpgDQGcFmaJgB - documentary narrator (default)

const WAR_RE =
  /\b(war|battle|troops|soldier|combat|military|attack|siege|army|navy|casualties|invasion|surrender|regiment|artillery|colonel|general|lieutenant|fort|front|enemy|wound|killed|explosion|bomb|captured|rebel|union|confederate|skirmish|bayonet|cannon|cavalry|infantry)\b/i;

const MEMORIAL_RE =
  /\b(died|death|passed away|obituary|memorial|funeral|mourning|grief|in memory|departed|ashes|cemetery|buried|eulogy|tribute|widow|orphan|rest in peace|survived by|solemn|elegy)\b/i;

const SPEECH_RE =
  /\b(president|congress|senate|address|speech|declaration|proclamation|constitution|liberty|freedom|democracy|nation|citizens|government|hereby|whereas|resolved|inaugur|four score|fellow americans|fellow citizens)\b/i;

const LETTER_RE =
  /\b(dear|dearest|my love|sincerely|faithfully|yours truly|beloved|darling|letter|diary|journal|memoir|personal|mother|father|sister|brother|wife|husband|home|miss you|affectionately|tenderly)\b/i;

export function selectVoice(title: string, text: string): VoiceSelection {
  const combined = `${title} ${text.slice(0, 300)}`;

  if (WAR_RE.test(combined)) {
    return { voiceId: "VR6AewLTigWG4xSOukaG", voiceLabel: "Commanding Voice", docType: "War & Military" };
  }
  if (MEMORIAL_RE.test(combined)) {
    return { voiceId: "21m00Tcm4TlvDq8ikWAM", voiceLabel: "Solemn Narrator", docType: "Memorial" };
  }
  if (SPEECH_RE.test(combined)) {
    return { voiceId: "TxGEqnHWrfWFTfGW9XjX", voiceLabel: "Authoritative Voice", docType: "Political Speech" };
  }
  if (LETTER_RE.test(combined)) {
    return { voiceId: "ErXwobaYiN019PkySvjV", voiceLabel: "Intimate Narrator", docType: "Personal Letter" };
  }

  return { voiceId: "pNInz6obpgDQGcFmaJgB", voiceLabel: "Documentary Narrator", docType: "Historical Record" };
}
