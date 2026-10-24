// Safety net that does NOT depend on the AI model. If the user's last message
// describes a medical emergency or thoughts of self-harm, the server answers with a
// fixed, carefully worded message and the matching call buttons.

const EMERGENCY = [
  // English
  /chest (pain|tightness)|pain in (my )?chest|heart attack/i,
  /(can'?t|cannot|unable to|struggling to|difficulty|trouble) breath/i,
  /faint(ed|ing)|passed out|unconscious|not waking|collapsed/i,
  /\bstroke\b|face (is )?droop|slurred speech|can'?t (move|lift) (my )?(arm|leg|hand)|one side (of my body )?(is )?(weak|numb)/i,
  /bleeding (a lot|heavily|badly)|heavy bleeding|won'?t stop bleeding/i,
  /\bseizure|having (a )?fit\b|convulsion/i,
  /swallowed (poison|pills|too many)|poison(ed|ing)|overdose/i,
  /fell (down )?and can'?t get up|severe allergic|throat (is )?swelling|face (is )?swelling/i,
  // Hindi (Devanagari)
  /सीने में दर्द|छाती में दर्द|सीने में जकड़न|दिल का दौरा|हार्ट अटैक/,
  /सांस नहीं ले|साँस नहीं ले|सांस लेने में (बहुत )?(तकलीफ|दिक्कत)|दम घुट/,
  /बेहोश|चक्कर (खाकर|आकर) गिर|गिर गया और उठ नहीं|गिर गई और उठ नहीं/,
  /लकवा|ज़ुबान लड़खड़ा|जुबान लड़खड़ा|चेहरा टेढ़ा|एक तरफ (का )?(शरीर )?(कमज़ोर|सुन्न)/,
  /बहुत (ज़्यादा |ज्यादा )?खून (बह|निकल)|खून नहीं रुक/,
  /दौरा पड़|मिर्गी|ज़हर खा|जहर खा|ज़्यादा गोलियां|ज्यादा गोलियां/,
  // Marathi (Devanagari)
  /छातीत (दुखत|दुखतंय|दुखतय|दुखतं|वेदना)|छातीत जळज|हृदयविकार|हार्ट अटॅक/,
  /श्वास घेता येत नाही|श्वास (घ्यायला )?त्रास|दम (खूप )?लागतो|खूप दम लागत/,
  /बेशुद्ध|चक्कर येऊन पडल|पडलो आणि उठता येत नाही|पडले आणि उठता येत नाही/,
  /लकवा|पक्षाघात|बोलता येत नाही|तोंड वाकडे|एका बाजूला (अशक्त|सुन्न)/,
  /खूप रक्त (जात|येत)|रक्त थांबत नाही/,
  /फिट आली|झटके येत|विष (प्यायल|खाल्ल)|जास्त गोळ्या/,
  // Romanised Hindi / Marathi
  /chhati (me|mein|mai|madhe)? ?(dard|dukh)|chhatit dukh|seene (me|mein) dard|sine (me|mein) dard/i,
  /saans nahi|sans nahi|shwas gheta yet nahi|shwas gheta yeat nahi|dam lag(to|toy|tay)/i,
  /behosh|beshuddh|bhan nahi/i,
];

const SELF_HARM = [
  /want to die|wish i (was|were) dead|end my life|kill myself|suicid|no reason to live|better off dead|don'?t want to live/i,
  /मरना चाहता|मरना चाहती|जीना नहीं चाहता|जीना नहीं चाहती|आत्महत्या|जान दे दूँ|जान दे दूं|जीने का मन नहीं/,
  /मरावंसं वाटतंय|मरावसं वाटतंय|मरावेसे वाटते|जगावंसं वाटत नाही|जगावेसे वाटत नाही|आत्महत्या|जीव द्यावासा/,
  /marne ka (man|mann)|jeene ka (man|mann) nahi|jina nahi chahta|jina nahi chahti|marava(s|n)?(ng|n)? ?wat|jagavas?a vatat nahi|aatmahatya|atmahatya/i,
];

function detectRisk(text) {
  const t = String(text || '');
  if (SELF_HARM.some((re) => re.test(t))) return 'selfharm';
  if (EMERGENCY.some((re) => re.test(t))) return 'emergency';
  return null;
}

const FIXED = {
  emergency: {
    English: 'This sounds serious. Please call 112 or an ambulance right now, or ask someone nearby to help you. Please do not wait. If you can, tell your family too. I am here with you.',
    Hindi: 'यह गंभीर हो सकता है। कृपया अभी 112 पर कॉल करें या एम्बुलेंस बुलाएँ, या पास में किसी से मदद माँगें। कृपया इंतज़ार न करें। हो सके तो अपने परिवार को भी बताएँ। मैं आपके साथ हूँ।',
    Marathi: 'हे गंभीर असू शकते. कृपया आत्ताच 112 वर कॉल करा किंवा रुग्णवाहिका बोलवा, किंवा जवळच्या कोणाला मदतीला बोलवा. कृपया थांबू नका. शक्य असल्यास तुमच्या कुटुंबालाही सांगा. मी तुमच्यासोबत आहे.',
  },
  selfharm: {
    English: 'I am really sorry you are feeling this much pain. You matter, and you do not have to face this alone. Please talk to someone right now: call your family, or call the free helpline Tele-MANAS at 14416. If you are in danger, call 112. I am here with you.',
    Hindi: 'मुझे बहुत दुख है कि आप इतना दर्द महसूस कर रहे हैं। आप महत्वपूर्ण हैं और आपको यह अकेले नहीं सहना है। कृपया अभी किसी से बात करें: अपने परिवार को फ़ोन करें, या मुफ़्त हेल्पलाइन टेली-मानस 14416 पर कॉल करें। अगर आप खतरे में हैं तो 112 पर कॉल करें। मैं आपके साथ हूँ।',
    Marathi: 'तुम्हाला इतक्या वेदना होत आहेत याचे मला खूप वाईट वाटते. तुम्ही महत्त्वाचे आहात आणि हे तुम्हाला एकट्याने सहन करायचे नाही. कृपया आत्ताच कोणाशी तरी बोला: तुमच्या कुटुंबाला फोन करा, किंवा मोफत हेल्पलाइन टेली-मानस 14416 वर कॉल करा. तुम्ही धोक्यात असाल तर 112 वर कॉल करा. मी तुमच्यासोबत आहे.',
  },
};

const FIXED_ACTIONS = {
  emergency: ['emergency', 'call_family'],
  selfharm: ['helpline', 'call_family', 'emergency'],
};

const LANG_CODE = { English: 'en', Hindi: 'hi', Marathi: 'mr' };

function fixedResponse(kind, language) {
  const lang = FIXED[kind][language] ? language : 'English';
  return { reply: FIXED[kind][lang], actions: FIXED_ACTIONS[kind], lang: LANG_CODE[lang], safety: kind };
}

module.exports = { detectRisk, fixedResponse };
