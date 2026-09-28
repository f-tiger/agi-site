// Curated upstream projects. TDS does not own these projects or sell their licenses.
export const reviewed='2026-09-27';
export const projects=[
 {id:'upscayl',name:'Upscayl',kind:'ai',repo:'upscayl/upscayl',site:'https://upscayl.org/download',license:'AGPL-3.0',licenseUrl:'https://github.com/upscayl/upscayl/blob/main/LICENSE',docs:'https://docs.upscayl.org/',tool:'image-compressor',video:'upscayl',platform:'Windows · macOS · Linux'},
 {id:'whisper',name:'Whisper',kind:'ai',repo:'openai/whisper',site:'https://github.com/openai/whisper',license:'MIT',licenseUrl:'https://github.com/openai/whisper/blob/main/LICENSE',docs:'https://github.com/openai/whisper#setup',tool:'ai-audio-to-text',platform:'Python · FFmpeg'},
 {id:'ollama',name:'Ollama',kind:'ai',repo:'ollama/ollama',site:'https://ollama.com/download',license:'MIT (runtime)',licenseUrl:'https://github.com/ollama/ollama/blob/main/LICENSE',docs:'https://docs.ollama.com/',tool:'ai-text-summarizer',platform:'Windows · macOS · Linux'},
 {id:'obs',name:'OBS Studio',kind:'video',repo:'obsproject/obs-studio',site:'https://obsproject.com/download',license:'GPL-2.0-or-later',licenseUrl:'https://github.com/obsproject/obs-studio/blob/master/COPYING',docs:'https://obsproject.com/kb/quick-start-guide',tool:'ai-audio-to-text',platform:'Windows · macOS · Linux'},
 {id:'audacity',name:'Audacity',kind:'audio',repo:'audacity/audacity',site:'https://www.audacityteam.org/download/',license:'GPL-3.0 (distribution)',licenseUrl:'https://github.com/audacity/audacity/blob/master/LICENSE.txt',docs:'https://support.audacityteam.org/',tool:'ai-audio-to-text',video:'audacity',platform:'Windows · macOS · Linux'},
 {id:'shotcut',name:'Shotcut',kind:'video',repo:'mltframework/shotcut',site:'https://shotcut.org/download/',license:'GPL-3.0',licenseUrl:'https://github.com/mltframework/shotcut/blob/master/COPYING',docs:'https://shotcut.org/tutorials/',tool:'image-compressor',video:'shotcut',platform:'Windows · macOS · Linux'}
];
// Titles/authors from YouTube oEmbed; dates/durations from the public watch metadata.
export const videos=[
 {id:'upscayl',youtube:'3M77flVZlVY',title:'Upscayl Tutorial - How to use Upscayl? | Best Free AI Image Upscaler for Linux, Mac and Windows',author:'Upscayl',channel:'https://www.youtube.com/@upscayl',date:'2024-12-04T01:04:58-08:00',duration:'PT4M7S',time:'4:07',source:'https://www.youtube.com/watch?v=3M77flVZlVY',tool:'image-compressor'},
 {id:'audacity',youtube:'Im2W7pokfpw',title:'Audacity Basics (NEW in 2023): Recording, Editing, Mixing',author:'Kyle Stedman',channel:'https://www.youtube.com/@kylestedman',date:'2023-07-10T14:14:51-07:00',duration:'PT18M21S',time:'18:21',source:'https://www.youtube.com/watch?v=Im2W7pokfpw',tool:'ai-audio-to-text'},
 {id:'shotcut',youtube:'JtsB2iZRb9c',title:'Shotcut Video Editor Tutorial For Beginners - Fast Start',author:'James Woo',channel:'https://www.youtube.com/@JamesWoo',date:'2019-09-13T04:07:14-07:00',duration:'PT15M30S',time:'15:30',source:'https://shotcut.org/tutorials/',tool:'image-compressor'}
];
export const growthSlugs=['open-source',...projects.map(p=>'open-source/'+p.id),'videos',...videos.map(v=>'videos/'+v.id),'creator-kit'];
export const affiliateUrl=(lang,kind)=>{
 const queries={mic:['USB microphone headphone monitoring','USB Mikrofon Kopfhörer Monitoring'],light:['adjustable video light','regelbare Videoleuchte'],storage:['external SSD USB','externe SSD USB']};
 if(!queries[kind])throw Error('Unknown equipment category');
 const de=lang==='de';return `https://www.amazon.${de?'de':'com'}/s?k=${encodeURIComponent(queries[kind][de?1:0])}&tag=${de?'getecoback-21':'ecoback0d-20'}`;
};
