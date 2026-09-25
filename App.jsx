import { useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, setDoc } from 'firebase/firestore';
import {
  ArrowUp,
  BookOpen,
  CalendarDays,
  Compass,
  Feather,
  Eye,
  EyeOff,
  FileText,
  HeartHandshake,
  ImagePlus,
  Leaf,
  Lock,
  Mail,
  Moon,
  Newspaper,
  Paintbrush,
  Palette,
  PenLine,
  Plus,
  Quote,
  Scale,
  Shield,
  ShieldCheck,
  Sparkles,
  Sunrise,
  Trash2,
  Waves
} from 'lucide-react';
import { auth, db, googleProvider } from './firebase';

const STORAGE_KEY = 'quiet-harbor-journal-v1';
const PIN_KEY = 'quiet-harbor-pin-v1';
const CUSTOM_WEATHER_STORAGE_KEY = 'quiet-journal-custom-weather-v1';
const CUSTOM_QUOTES_STORAGE_KEY = 'quiet-journal-custom-quotes-v1';
const QUOTE_STYLE_STORAGE_KEY = 'quiet-journal-quote-style-v1';
const JOURNAL_STYLE_STORAGE_KEY = 'quiet-journal-style-v1';
const COMPANION_STORAGE_KEY = 'quiet-journal-companion-v1';

function getInitialCompanion() {
  const defaults = {
    character: '🐭',
    leaf: '',
    rainEnabled: true,
    sootSpritesEnabled: true,
    animation: 'breathe',
    size: 80,
    x: 0,
    y: 0
  };
  try {
    const saved = localStorage.getItem(COMPANION_STORAGE_KEY);
    if (saved) {
      const parsed = { ...defaults, ...JSON.parse(saved) };
      if (parsed.leaf === '🍃') parsed.leaf = '';
      return parsed;
    }
  } catch {}
  return defaults;
}

const journalFontOptions = [
  { id: 'serif', label: 'Elegant Serif', css: '"Cormorant Garamond", Georgia, serif' },
  { id: 'sans', label: 'Clean Sans', css: 'Inter, ui-sans-serif, system-ui, sans-serif' },
  { id: 'hand', label: 'Soft Script', css: '"Segoe Print", "Bradley Hand", cursive' }
];

const journalSizeOptions = [
  { id: 'sm', label: 'Cozy', value: '1rem' },
  { id: 'md', label: 'Balanced', value: '1.12rem' },
  { id: 'lg', label: 'Spacious', value: '1.25rem' }
];

const quoteFontOptions = [
  { id: 'serif', label: 'Elegant Serif', css: '"Cormorant Garamond", Georgia, serif' },
  { id: 'sans', label: 'Clean Sans', css: 'Inter, ui-sans-serif, system-ui, sans-serif' },
  { id: 'hand', label: 'Journal Script', css: '"Segoe Print", "Bradley Hand", cursive' }
];

const quoteSizeOptions = [
  { id: 'sm', label: 'Soft', value: '1.5rem' },
  { id: 'md', label: 'Balanced', value: '1.9rem' },
  { id: 'lg', label: 'Focused', value: '2.5rem' }
];

const moods = [
  { label: 'Happy', emoji: '☀️', value: 5, color: 'bg-amber-300' },
  { label: 'Calm', emoji: '🏖️', value: 4, color: 'bg-sage-300' },
  { label: 'Neutral', emoji: '⛅', value: 3, color: 'bg-slate-200' },
  { label: 'Sad', emoji: '🌧️', value: 2, color: 'bg-blue-200' },
  { label: 'Anxious', emoji: '🌪️', value: 1, color: 'bg-rose-200' }
];

const prompts = [
  'What made you smile today?',
  'Name one thing you are grateful for right now.',
  'How are you really feeling in this moment?',
  'What do you need to hear from yourself today?',
  'What is one thing you can let go of?',
  'What small win did you have today?',
  'How would you describe your mood to a friend?'
];

const rewardMessages = [
  'Saved. You gave today a soft place to land. 🌿',
  'A quiet page is waiting for future you now. ☁️',
  'You showed up for yourself. That is worth keeping. 🤍',
  'Another little bloom settled into your archive. 🌷',
  'This space is gentler because you returned to it. ✨',
  'Your journal held that moment safely. 🌙',
  'One honest page is more than enough for today. 🌱'
];

const quotes = [
  'You are allowed to go slowly. Small steps still move you forward.',
  'Rest is not a reward. It is part of the rhythm.',
  'Let this moment be enough to begin again.',
  'Your feelings can be real without being permanent.',
  'Breathe like the tide: arrive, soften, return.',
  'A quiet day can still be a brave day.',
  'Be gentle with yourself. You are doing the best you can.',
  'Slow progress is still progress.',
  'It is okay to take a break. The world can wait.',
  'You deserve the same kindness you give to others.',
  'Not every day has to be productive to be meaningful.',
  'Small wins are still wins worth celebrating.',
  'Your worth is not measured by your productivity.',
  'Peace begins with a single deep breath.',
  'The sun will rise, and you will try again with fresh eyes.',
  'Soft hearts can still be strong hearts.',
  'Let go of what you cannot control today.',
  'There is courage in simply showing up.',
  'Healing is not linear; it is perfectly okay to backtrack.',
  'You are exactly where you need to be in this moment.',
  'Today is a new page, write it gently.',
  'Even the darkest night will end and the sun will rise.',
  'Your pace does not need to match anyone elses.',
  'Let your thoughts pass like clouds in a quiet sky.',
  'Choose one small thing today that brings you peace.',
  'Growth happens quietly, beneath the surface.',
  'It is enough to simply exist right now.',
  'You are not behind; you are on your own timeline.',
  'A calm mind brings inner strength and self-confidence.',
  'Do not let yesterday take up too much of today.',
  'The present moment is filled with joy and happiness.',
  'Sometimes the most productive thing you can do is relax.',
  'You carry so much. It is okay to set some of it down.',
  'Be like water—flexible, yet powerful enough to reshape stone.',
  'The journey of a thousand miles begins with a single step.',
  'Kindness towards yourself is the greatest medicine.',
  'Inhale the future, exhale the past.',
  'Stars cannot shine without darkness.',
  'Let yourself rest in the spaces between words.',
  'Trust the timing of your life.',
  'Every moment is a fresh beginning.',
  'You are capable of amazing things, even on hard days.',
  'What feels like an ending is often just a new beginning.',
  'Quiet the mind, and the soul will speak.',
  'Be patient with yourself. Nothing in nature blooms all year.',
  'You are a work in progress, and that is perfectly fine.',
  'The world is better because you are in it.',
  'Your story is still being written.',
  'Take life one breath at a time.',
  'Wherever you are, be there fully.'
];

const resources = [
  {
    title: 'The 3-minute grounding reset',
    text: 'Name five things you see, four you feel, three you hear, two you smell, and one thing you can taste. Let the room become real again before you write.'
  },
  {
    title: 'A gentle body check-in',
    text: 'Start at your forehead and move slowly to your shoulders, chest, hands, stomach, legs, and feet. Notice tension without trying to force it away.'
  },
  {
    title: 'Tiny routine, big kindness',
    text: 'Choose one small daily anchor: water after waking, sunlight for two minutes, or one sentence in your journal before sleep.'
  },
  {
    title: 'When thoughts feel loud',
    text: 'Write the loudest thought as a sentence, then write: “A kinder way to say this might be…” This helps create distance without ignoring the feeling.'
  },
  {
    title: 'A low-energy reflection',
    text: 'Use three short lines: “Today felt…”, “I needed…”, and “Tomorrow I can try…”. A useful entry does not need to be long.'
  },
  {
    title: 'A safe closing ritual',
    text: 'End your entry by naming one object in the room, one sensation in your body, and one small action you can take next.'
  }
];

const tips = [
  'Write for honesty, not for grammar.',
  'Start with one sentence when a blank page feels too big.',
  'Track patterns without judging yourself for having them.',
  'End entries with one small next step or one thing you can release.',
  'Use prompts as doors, not assignments.',
  'Try naming the feeling before explaining it.',
  'Reread only when it feels supportive, not when it becomes self-criticism.',
  'Keep one “comfort list” of people, places, songs, and rituals that help.'
];

const wellnessArticles = [
  {
    title: 'How to start journaling when you do not know what to write',
    read: 'Quick note',
    body: 'Start by describing the present moment instead of trying to summarize your whole life. Write what the room feels like, what your body is asking for, and one sentence that begins with “Right now…”. This removes the pressure to be deep and turns journaling into a simple check-in.'
  },
  {
    title: 'Using mood tracking without judging yourself',
    read: 'Gentle guide',
    body: 'A mood tracker is most helpful when it becomes a pattern finder, not a report card. Instead of asking “Why am I not better?”, try asking “What tends to happen before this mood?” or “What helped even a little?” Curiosity is more useful than criticism.'
  },
  {
    title: 'A calming evening reflection routine',
    read: 'Quick note',
    body: 'Before sleep, keep the routine small: one thing that felt difficult, one thing that felt supportive, and one thing you can set down for tonight. This creates a gentle ending without turning bedtime into another task.'
  },
  {
    title: 'What to write on a difficult day',
    read: 'Support note',
    body: 'On difficult days, write in fragments. Try “I feel…”, “I wish…”, “I need…”, and “One safe next step is…”. Short phrases can carry a lot. You do not need to explain your feelings perfectly for them to matter.'
  },
  {
    title: 'Making a personal comfort menu',
    read: 'Gentle guide',
    body: 'A comfort menu is a short list of options for when your mind feels crowded. Include one body-based option, one connection option, one practical option, and one rest option. When stress rises, choose from the menu instead of starting from zero.'
  },
  {
    title: 'The difference between reflection and rumination',
    read: 'Gentle guide',
    body: 'Reflection often leads to understanding, kindness, or a next step. Rumination loops without relief. If writing starts to feel like a spiral, pause and shift to grounding: describe what you see, drink water, or write one compassionate closing sentence.'
  },
  {
    title: 'Gentle prompts for self-understanding',
    read: 'Quick note',
    body: 'Prompts work best when they open a door rather than demand an answer. Try: “What part of me needs patience?”, “What felt manageable today?”, or “What would support look like in the next hour?”'
  },
  {
    title: 'Building a journal habit that survives busy weeks',
    read: 'Gentle guide',
    body: 'A sustainable journal habit should be easy to return to. Set the bar low: one sentence counts, one mood check-in counts, and skipping a day does not erase the practice. The goal is a place to come back to.'
  },
  {
    title: 'Private online diary vs a paper journal',
    read: 'Comparison',
    body: 'A private online diary is easier to revisit, search, and keep close through daily life, while a paper journal can feel tactile and slower. The better choice is the one you will genuinely return to. For many people, privacy controls, mood tracking, and easier access make a digital diary feel more sustainable.'
  },
  {
    title: 'How to keep a diary privately online',
    read: 'Helpful guide',
    body: 'If you want to keep a diary privately online, choose one calm space, use a consistent login, add a lock when it helps, and keep your entries easy to begin. Privacy is not just technical. It also comes from trusting the place where you write.'
  }
];

const seoLandingBlocks = [
  {
    title: 'Private online diary',
    text: 'Use Quiet Journal Journey as a private online diary when you want a calm place to write daily thoughts, check in with yourself, and keep reflections personal.'
  },
  {
    title: 'Mood journal',
    text: 'Track feelings over time with a mood journal flow that makes it easier to notice patterns, save gentle notes, and reflect without turning the process into pressure.'
  },
  {
    title: 'Online diary with lock',
    text: 'If you want an online diary with lock protection, you can add a soft PIN for the browser while still keeping the journaling experience simple and welcoming.'
  }
];

const seoFaqs = [
  {
    question: 'What is Quiet Journal Journey?',
    answer: 'Quiet Journal Journey is a private online diary and mood journal for daily reflection, guided prompts, customizable journaling, and optional lock protection.'
  },
  {
    question: 'Can I use Quiet Journal Journey as a private online diary?',
    answer: 'Yes. You can use it as a private online diary to write personal entries, track your mood, and keep your journaling space calm and personal.'
  },
  {
    question: 'Does Quiet Journal Journey include mood tracking?',
    answer: 'Yes. The journal includes mood tracking so you can log how you feel and notice patterns over time without making the experience feel heavy or complicated.'
  },
  {
    question: 'Can I lock my diary entries?',
    answer: 'Yes. You can add an optional lock PIN for the browser, change the PIN later, or remove the lock if you no longer want to use it.'
  },
  {
    question: 'Can I add photos to my diary entries?',
    answer: 'Yes. You can upload photos to journal entries and then click them to move or resize them directly in the editor.'
  }
];

const seoGuidePages = [
  {
    label: 'Popular guide',
    title: 'Private online diary guide',
    text: 'A calm starting page for people who want a private place to journal online.',
    href: '/private-online-diary.html'
  },
  {
    label: 'Popular guide',
    title: 'Mood journal guide',
    text: 'A focused page for people who want mood tracking and gentle reflection in one space.',
    href: '/mood-journal.html'
  },
  {
    label: 'Popular guide',
    title: 'Online diary with lock guide',
    text: 'A privacy-focused page for people who want a journal with optional browser lock protection.',
    href: '/online-diary-with-lock.html'
  },
  {
    label: 'Helpful read',
    title: 'Journal prompts',
    text: 'A prompt collection for days when starting feels harder than writing.',
    href: '/journal-prompts.html'
  },
  {
    label: 'Helpful read',
    title: 'Daily reflection journal',
    text: 'A softer evening reading page for daily reflection and end-of-day journaling.',
    href: '/daily-reflection-journal.html'
  }
];

const THEME_STORAGE_KEY = 'quiet-journal-theme-v1';
const DESIGN_STORAGE_KEY = 'quiet-journal-design-v1';
const CUSTOM_COLOR_STORAGE_KEY = 'quiet-journal-custom-color-v1';
const QUOTE_BG_STORAGE_KEY = 'quiet-journal-quote-bg-v1';
const COMFORT_MODE_STORAGE_KEY = 'quiet-journal-comfort-mode-v1';

const colorThemes = [
  { id: 'sage', name: 'Sage Calm', accent: '#587f49', soft: '#edf4e8', glow: '#bfd8b0' },
  { id: 'lavender', name: 'Lavender Rest', accent: '#7c6aa6', soft: '#f0ecfb', glow: '#c9bce8' },
  { id: 'ocean', name: 'Ocean Breath', accent: '#387f8f', soft: '#e7f5f7', glow: '#a8d8df' },
  { id: 'sunrise', name: 'Warm Sunrise', accent: '#b97843', soft: '#fff0df', glow: '#edc194' },
  { id: 'rose', name: 'Rose Kindness', accent: '#a96b76', soft: '#fbebee', glow: '#e8bbc3' }
];

const designStyles = [
  { id: 'soft', name: 'Soft Cards', description: 'Rounded, airy, and gentle.', radius: '1.5rem', texture: 'none' },
  { id: 'editorial', name: 'Editorial', description: 'More magazine-like and refined.', radius: '0.85rem', texture: 'linear-gradient(135deg, rgba(255,255,255,0.52), rgba(255,255,255,0))' },
  { id: 'playful', name: 'Playful Calm', description: 'Bubbly shapes with a lighter mood.', radius: '2.25rem', texture: 'radial-gradient(circle at 15% 20%, rgba(255,255,255,0.55), transparent 28%)' }
];

const quoteCardColors = [
  { name: 'Forest', value: '#45643b' },
  { name: 'Lavender', value: '#6f5c99' },
  { name: 'Ocean', value: '#2f7585' },
  { name: 'Clay', value: '#9a6847' },
  { name: 'Rose', value: '#9b5f6b' },
  { name: 'Charcoal', value: '#2f3a37' }
];

const journalAtmospherePresets = [
  {
    id: 'quiet-morning',
    name: 'Quiet Morning',
    note: 'Warm light, elegant words, and a steady pace.',
    themeId: 'sunrise',
    designId: 'soft',
    quoteBg: '#9a6847',
    journalFontId: 'serif',
    quoteFontId: 'serif',
    companionAnimation: 'float'
  },
  {
    id: 'rainy-window',
    name: 'Rainy Window',
    note: 'Cool tones for slower thoughts and softer check-ins.',
    themeId: 'ocean',
    designId: 'editorial',
    quoteBg: '#2f7585',
    journalFontId: 'serif',
    quoteFontId: 'sans',
    companionAnimation: 'wave'
  },
  {
    id: 'soft-night',
    name: 'Soft Night',
    note: 'A gentle evening mood for deeper reflection.',
    themeId: 'lavender',
    designId: 'editorial',
    quoteBg: '#6f5c99',
    journalFontId: 'sans',
    quoteFontId: 'serif',
    companionAnimation: 'breathe'
  },
  {
    id: 'golden-dusk',
    name: 'Golden Dusk',
    note: 'Cozy warmth when you want the page to feel personal.',
    themeId: 'rose',
    designId: 'playful',
    quoteBg: '#9b5f6b',
    journalFontId: 'hand',
    quoteFontId: 'hand',
    companionAnimation: 'bounce'
  }
];

const todayISO = () => new Date().toISOString().slice(0, 10);

function formatMonthLabel(monthKey) {
  const [year, month] = monthKey.split('-').map(Number);
  return new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1));
}

function shiftMonthKey(monthKey, offset) {
  const [year, month] = monthKey.split('-').map(Number);
  const next = new Date(year, month - 1 + offset, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
}

function buildCalendarDays(monthKey) {
  const [year, month] = monthKey.split('-').map(Number);
  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const leadingBlanks = firstDay.getDay();
  return [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      return {
        day,
        dateKey: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      };
    })
  ];
}

function getInitialEntries() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function getSavedPin() {
  try {
    return localStorage.getItem(PIN_KEY) || '';
  } catch {
    return '';
  }
}

function getInitialCustomWeathers() {
  try {
    const saved = localStorage.getItem(CUSTOM_WEATHER_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function getInitialCustomQuotes() {
  try {
    const saved = localStorage.getItem(CUSTOM_QUOTES_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function getInitialQuoteStyle() {
  try {
    const saved = localStorage.getItem(QUOTE_STYLE_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return {
    fontId: 'serif',
    sizeId: 'md',
    textColor: '#ffffff'
  };
}

function getInitialJournalStyle() {
  try {
    const saved = localStorage.getItem(JOURNAL_STYLE_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return {
    fontId: 'sans',
    sizeId: 'md'
  };
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(dateString));
}

function getPlainTextFromHtml(html = '') {
  if (typeof document === 'undefined') {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  return (tempDiv.textContent || tempDiv.innerText || '').replace(/\s+/g, ' ').trim();
}

function getCompanionFrameDimensions(size, isVideo, isUploadedMedia) {
  if (!isUploadedMedia) {
    return { width: size, height: size };
  }
  if (isVideo) {
    return {
      width: Math.min(size * 1.9, 560),
      height: Math.min(size * 1.45, 400)
    };
  }
  return {
    width: Math.min(size * 2.1, 560),
    height: Math.min(size * 1.55, 420)
  };
}

function clampCompanionPosition(size, x, y, containerWidth, containerHeight, isVideo, isUploadedMedia) {
  const frame = getCompanionFrameDimensions(size, isVideo, isUploadedMedia);
  const maxX = Math.max(0, (containerWidth - frame.width) / 2);
  const maxY = Math.max(0, (containerHeight - frame.height) / 2);
  return {
    x: Math.max(-maxX, Math.min(maxX, x)),
    y: Math.max(-maxY, Math.min(maxY, y))
  };
}

function StatCard({ icon: Icon, label, value, tone }) {
  return (
    <div className="group rounded-[1.75rem] border border-white/80 bg-gradient-to-br from-white/95 to-white/75 p-5 shadow-lift backdrop-blur transition duration-300 hover:-translate-y-1 hover:shadow-soft">
      <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl shadow-sm ${tone}`}>
        <Icon size={21} />
      </div>
      <p className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-sage-500">{label}</p>
      <p className="mt-3 break-words text-2xl font-extrabold leading-tight tracking-tight text-ink">{value}</p>
    </div>
  );
}

function WeatherGlyph({ mood, size = 'text-3xl' }) {
  if (mood?.image) {
    return <img alt={mood.label} className="inline-block h-9 w-9 rounded-2xl object-cover shadow-sm" src={mood.image} />;
  }
  return <span className={`inline-block ${size}`} aria-label={mood?.label}>{mood?.emoji || '🌙'}</span>;
}

function SectionHeader({ eyebrow, title, text }) {
  return (
    <div className="mx-auto mb-9 max-w-3xl text-center">
      <p className="text-sm font-bold uppercase tracking-widest text-sage-600">{eyebrow}</p>
      <h2 className="mt-3 font-display text-5xl font-bold leading-tight text-sage-950">{title}</h2>
      {text && <p className="mt-4 text-lg leading-8 text-sage-800">{text}</p>}
    </div>
  );
}

function InfoCard({ icon: Icon, title, children }) {
  return (
    <article className="customizable-card rounded-3xl border border-white/70 bg-white/75 p-6 shadow-lift backdrop-blur transition hover:-translate-y-1 hover:bg-white/90">
      <div className="theme-icon mb-5 flex h-12 w-12 items-center justify-center rounded-3xl bg-sage-100 text-sage-800">
        <Icon size={22} />
      </div>
      <h3 className="text-2xl font-extrabold text-ink">{title}</h3>
      <div className="mt-3 leading-7 text-sage-800">{children}</div>
    </article>
  );
}

function ThemeStudio({
  selectedTheme,
  selectedDesign,
  customColor,
  quoteBg,
  companion,
  journalStyle,
  quoteStyle,
  customWeatherName,
  customWeatherEmoji,
  customWeatherImage,
  customWeathers,
  isOpen,
  onClose,
  onThemeChange,
  onDesignChange,
  onCustomColorChange,
  onQuoteBgChange,
  onCompanionChange,
  onAtmosphereApply,
  onCustomWeatherNameChange,
  onCustomWeatherEmojiChange,
  onCustomWeatherImageUpload,
  onAddCustomWeather,
  onDeleteCustomWeather
}) {
  const animationOptions = [
    { id: 'breathe', label: 'Breathe' },
    { id: 'bounce', label: 'Bounce' },
    { id: 'float', label: 'Float' },
    { id: 'wiggle', label: 'Wiggle' },
    { id: 'spin', label: 'Spin' },
    { id: 'wave', label: 'Wave' },
    { id: 'none', label: 'Still' }
  ];

  function handleCompanionImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const safeUploadSize = file.type.startsWith('video/') ? 150 : 120;
      onCompanionChange({ ...companion, character: String(reader.result || ''), size: safeUploadSize, leaf: '', x: 0, y: 0 });
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className={`customizer-shell fixed inset-y-0 right-0 z-30 flex transition ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <div className={`fixed inset-0 bg-ink/20 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
      <aside id="design" className={`relative h-full w-screen max-w-5xl overflow-y-auto bg-white/95 shadow-soft backdrop-blur-xl transition duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="grid min-h-full lg:grid-cols-12">
          <div className="theme-panel p-7 text-white lg:col-span-4 lg:p-8">
            <div className="flex items-start justify-between gap-4">
              <Palette className="text-white/90" size={34} />
              <button className="rounded-full bg-white/20 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/30" onClick={onClose} type="button">Done</button>
            </div>
            <p className="mt-7 text-sm font-bold uppercase tracking-widest text-white/80">Customize your space</p>
            <h2 className="mt-3 font-display text-4xl font-bold leading-tight">Choose the look that feels right today.</h2>
            <p className="mt-4 leading-7 text-white/85">Visitors can personalize colors and style. Their choice is saved only in their own browser, and this drawer can stay tucked away.</p>
          </div>
          <div className="space-y-7 p-7 lg:col-span-8 lg:p-8">
            <div>
              <div className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-sage-700"><Paintbrush size={16} /> Color theme</div>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {colorThemes.map((theme) => (
                  <button
                    className={`custom-option rounded-3xl border p-4 text-left transition hover:-translate-y-1 ${selectedTheme === theme.id ? 'is-selected border-sage-500 bg-sage-50 shadow-lift' : 'border-sage-100 bg-white'}`}
                    key={theme.id}
                    onClick={() => {
                      onThemeChange(theme.id);
                    }}
                    type="button"
                  >
                    <span className="mb-3 block h-9 w-full rounded-2xl" style={{ background: `linear-gradient(135deg, ${theme.soft}, ${theme.accent})` }} />
                    <span className="block text-sm font-extrabold text-ink">{theme.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
              <label className="custom-option rounded-3xl border border-sage-100 bg-white p-5 shadow-sm lg:col-span-1">
                <span className="mb-3 block text-sm font-bold uppercase tracking-widest text-sage-700">Custom color</span>
                <input
                  aria-label="Choose a custom accent color"
                  className="h-12 w-full cursor-pointer rounded-2xl border border-sage-100 bg-white p-1"
                  onChange={(event) => {
                    onCustomColorChange(event.target.value);
                    onThemeChange('custom');
                  }}
                  type="color"
                  value={customColor}
                />
                <span className="mt-3 block text-sm font-semibold text-sage-700">Pick any accent color.</span>
              </label>
              <div className="grid gap-3 lg:col-span-2">
                {designStyles.map((style) => (
                  <button
                    className={`custom-option flex items-center justify-between rounded-3xl border bg-white p-4 text-left transition hover:-translate-y-1 ${selectedDesign === style.id ? 'is-selected border-sage-500 shadow-lift' : 'border-sage-100'}`}
                    key={style.id}
                    onClick={() => {
                      onDesignChange(style.id);
                    }}
                    type="button"
                  >
                    <span>
                      <span className="block font-extrabold text-ink">{style.name}</span>
                      <span className="text-sm text-sage-700">{style.description}</span>
                    </span>
                    <span className="theme-dot h-8 w-8 rounded-full" />
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-sage-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-sage-700"><Sparkles size={16} /> Atmosphere presets</div>
              <p className="text-sm leading-6 text-sage-700">Pick a ready-made mood and let the design drawer handle the look for you instead of crowding the writing area.</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {journalAtmospherePresets.map((preset) => {
                  const isPresetActive = selectedTheme === preset.themeId && selectedDesign === preset.designId && journalStyle.fontId === preset.journalFontId && quoteStyle.fontId === preset.quoteFontId;
                  return (
                    <button
                      className={`rounded-[1.4rem] border p-4 text-left transition hover:-translate-y-0.5 ${isPresetActive ? 'border-sage-500 bg-sage-50 shadow-lift' : 'border-sage-100 bg-white hover:bg-sage-50'}`}
                      key={preset.id}
                      onClick={() => onAtmosphereApply(preset)}
                      type="button"
                    >
                      <span className="text-sm font-extrabold text-ink">{preset.name}</span>
                      <span className="mt-2 block text-sm leading-6 text-sage-700">{preset.note}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-3xl border border-sage-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-sage-700"><Quote size={16} /> Quote card color</div>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {quoteCardColors.map((color) => (
                  <button
                    className={`custom-option rounded-2xl border p-3 text-left transition hover:-translate-y-1 ${quoteBg.toLowerCase() === color.value.toLowerCase() ? 'is-selected border-sage-500 shadow-lift' : 'border-sage-100'}`}
                    key={color.value}
                    onClick={() => {
                      onQuoteBgChange(color.value);
                    }}
                    type="button"
                  >
                    <span className="mb-2 block h-10 rounded-xl" style={{ background: color.value }} />
                    <span className="text-sm font-extrabold text-ink">{color.name}</span>
                  </button>
                ))}
              </div>
              <label className="mt-4 block rounded-2xl bg-sage-50 p-4">
                <span className="mb-3 block text-sm font-bold text-sage-800">Or pick any quote card color</span>
                <input className="h-11 w-full cursor-pointer rounded-xl border border-sage-100 bg-white p-1" onChange={(event) => onQuoteBgChange(event.target.value)} type="color" value={quoteBg} />
              </label>
            </div>

            <div className="rounded-3xl border border-sage-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-sage-700"><ImagePlus size={16} /> Custom emotion</div>
              <p className="text-sm leading-6 text-sage-700">Keep personal moods in the design drawer instead of the writing page. They still appear in your mood picker after you save them.</p>
              <div className="mt-5 grid gap-3 md:grid-cols-5">
                <input
                  className="rounded-2xl border border-sage-100 bg-sage-50/80 px-4 py-3 font-semibold outline-none transition focus:border-sage-400 focus:bg-white"
                  onChange={(event) => onCustomWeatherNameChange(event.target.value)}
                  placeholder="Name"
                  value={customWeatherName}
                />
                <input
                  className="rounded-2xl border border-sage-100 bg-sage-50/80 px-4 py-3 font-semibold outline-none transition focus:border-sage-400 focus:bg-white"
                  maxLength={4}
                  onChange={(event) => onCustomWeatherEmojiChange(event.target.value)}
                  placeholder="Emoji"
                  value={customWeatherEmoji}
                />
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-sage-300 bg-sage-50/80 px-4 py-3 text-sm font-bold text-sage-800 transition hover:bg-sage-100 md:col-span-2">
                  <ImagePlus size={18} /> Upload image
                  <input accept="image/*" className="hidden" onChange={onCustomWeatherImageUpload} type="file" />
                </label>
                <button className="rounded-2xl bg-sage-800 px-4 py-3 font-bold text-white shadow-lift transition hover:-translate-y-1 hover:bg-sage-700" onClick={onAddCustomWeather} type="button">
                  Add emotion
                </button>
              </div>
              {customWeatherImage && (
                <div className="mt-4 flex items-center gap-3 rounded-2xl bg-sage-50 p-3 text-sm font-semibold text-sage-800">
                  <img alt="Custom weather preview" className="h-12 w-12 rounded-2xl object-cover" src={customWeatherImage} />
                  Image ready — add a name, then save it as a custom emotion.
                </div>
              )}
              {customWeathers.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-sage-500">Saved custom moods</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {customWeathers.map((weather) => (
                      <div key={weather.id} className="inline-flex items-center gap-2 rounded-full border border-sage-100 bg-sage-50 px-3 py-2 text-sm font-semibold text-sage-700">
                        {weather.image ? <img alt={weather.label} className="h-6 w-6 rounded-full object-cover" src={weather.image} /> : <span>{weather.emoji}</span>}
                        <span>{weather.label}</span>
                        <button className="text-sage-400 transition hover:text-rose-500" onClick={() => onDeleteCustomWeather(weather.label)} type="button">×</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <div className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-sage-700"><Sparkles size={16} /> Quote companion</div>
              <div className="grid gap-4 rounded-3xl border border-sage-100 bg-sage-50/70 p-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm font-bold text-sage-800">
                    Mascot emoji or character
                    <input
                      className="mt-2 w-full rounded-2xl border border-sage-100 bg-white px-4 py-3 text-base outline-none focus:border-sage-400"
                      maxLength={4}
                      onChange={(event) => onCompanionChange({ ...companion, character: event.target.value })}
                      placeholder="🐭"
                      value={companion.character?.startsWith('data:') ? '' : companion.character}
                    />
                  </label>
                  <label className="block text-sm font-bold text-sage-800">
                    Leaf / prop
                    <input
                      className="mt-2 w-full rounded-2xl border border-sage-100 bg-white px-4 py-3 text-base outline-none focus:border-sage-400"
                      maxLength={4}
                      onChange={(event) => onCompanionChange({ ...companion, leaf: event.target.value })}
                      placeholder="🍃"
                      value={companion.leaf}
                    />
                  </label>
                </div>
                <label className="block text-sm font-bold text-sage-800">
                  Upload your own photo, GIF, or video to replace the mascot
                  <label className="mt-2 flex cursor-pointer items-center justify-center rounded-2xl border border-dashed border-sage-300 bg-white px-4 py-4 text-sm font-bold text-sage-700 transition hover:border-sage-500 hover:text-sage-900">
                    <ImagePlus size={16} className="mr-2" /> Choose image, GIF, or video
                    <input accept="image/*,image/gif,video/*" className="hidden" onChange={handleCompanionImage} type="file" />
                  </label>
                </label>
                <label className="block text-sm font-bold text-sage-800">
                  Mascot size ({companion.size}px)
                  <input className="mt-2 w-full cursor-pointer accent-sage-700" min="40" max="420" onChange={(event) => onCompanionChange({ ...companion, size: Number(event.target.value) })} type="range" value={companion.size} />
                </label>
                <div>
                  <span className="block text-sm font-bold text-sage-800">Animation style</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {animationOptions.map((option) => (
                      <button
                        className={`rounded-full px-4 py-2 text-sm font-bold transition ${companion.animation === option.id ? 'bg-sage-900 text-white' : 'bg-white text-sage-800 shadow-sm hover:bg-sage-100'}`}
                        key={option.id}
                        onClick={() => onCompanionChange({ ...companion, animation: option.id })}
                        type="button"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 pt-1">
                  <label className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-sage-800 shadow-sm">
                    <input checked={companion.rainEnabled} onChange={(event) => onCompanionChange({ ...companion, rainEnabled: event.target.checked })} type="checkbox" />
                    Rain drops
                  </label>
                  <label className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-sage-800 shadow-sm">
                    <input checked={companion.sootSpritesEnabled} onChange={(event) => onCompanionChange({ ...companion, sootSpritesEnabled: event.target.checked })} type="checkbox" />
                    Soot sprites
                  </label>
                </div>
                {companion.character?.startsWith('data:') && (
                  <button className="w-full rounded-2xl bg-rose-50 px-4 py-3 text-sm font-extrabold text-rose-700 transition hover:bg-rose-100" onClick={() => onCompanionChange({ ...companion, character: '🐭' })} type="button">
                    Remove custom photo
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

function MoodChart({ entries, weatherOptions }) {
  const recent = useMemo(() => entries.slice(0, 7).reverse(), [entries]);
  const legacyMoodMap = {
    'Grounded': 'Happy',
    'Soft': 'Calm',
    'Okay': 'Neutral',
    'Heavy': 'Sad',
    'Stormy': 'Anxious'
  };

  if (!recent.length) {
    return (
      <div className="flex min-h-56 items-center justify-center rounded-3xl border border-dashed border-sage-200 bg-sage-50/70 p-8 text-center text-sage-700">
        Your mood garden is waiting for its first check-in.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-white to-sage-50 px-3 pb-3 pt-6 shadow-inner sm:p-5">
      <div className="flex h-40 items-end gap-1.5 px-0.5 sm:h-64 sm:gap-3 sm:px-2">
        {recent.map((entry) => {
          const effectiveMoodLabel = legacyMoodMap[entry.mood] || entry.mood;
          const mood = weatherOptions.find((item) => item.label === effectiveMoodLabel) || weatherOptions.find(m => m.label === entry.mood) || weatherOptions[2] || moods[2];
          const heightClass = ['h-9 sm:h-12', 'h-14 sm:h-20', 'h-20 sm:h-28', 'h-28 sm:h-40', 'h-36 sm:h-52'][mood.value - 1] || 'h-20 sm:h-28';
          const entryDate = new Date(entry.createdAt);
          return (
            <div className="flex min-w-0 flex-1 flex-col items-center gap-2 sm:gap-3" key={entry.id}>
              <div className="flex h-32 w-full items-end justify-center overflow-hidden rounded-2xl bg-white/50 p-1 shadow-inner backdrop-blur-sm sm:h-52 sm:p-1.5">
                <div className={`w-full rounded-xl ${mood.color || ''} ${heightClass} shadow-md transition-all hover:scale-105 hover:shadow-lg`} style={mood.color ? undefined : { background: mood.hex || '#739f62' }} />
              </div>
              <WeatherGlyph mood={mood} size="text-base sm:text-xl" />
              <div className="flex flex-col items-center gap-0.5 text-center">
                <span className="text-[9px] font-bold uppercase tracking-tight text-sage-400 sm:text-[10px]">{entryDate.toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span>
                <span className="text-[10px] font-extrabold text-sage-700 sm:text-xs">{entryDate.toLocaleDateString('en', { weekday: 'short' })}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PrivacyGate({ hasPin, onUnlock, onCreatePin }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [showPin, setShowPin] = useState(false);

  function submit(event) {
    event.preventDefault();
    if (!pin.trim()) return;
    if (!hasPin) {
      onCreatePin(pin.trim());
      return;
    }
    const saved = getSavedPin();
    if (pin.trim() === saved) onUnlock();
    else setError('That PIN did not match. Try again gently.');
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-sand-50 text-ink">
      <div className="absolute left-10 top-10 h-64 w-64 rounded-full bg-sage-200/60 blur-3xl" />
      <div className="absolute bottom-10 right-10 h-80 w-80 rounded-full bg-sand-200/70 blur-3xl" />
      <section className="relative mx-auto flex min-h-screen max-w-5xl items-center justify-center px-6 py-16">
        <div className="grid overflow-hidden rounded-3xl border border-white/80 bg-white/75 shadow-soft backdrop-blur md:grid-cols-2">
          <div className="flex flex-col justify-between bg-gradient-to-br from-sage-100 via-mist to-sand-100 p-10">
            <div>
              <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-sm font-bold text-sage-800 shadow-lift">
                <ShieldCheck size={18} /> Private by default
              </div>
              <h1 className="font-display text-5xl font-bold leading-tight text-sage-900">Quiet Journal Journey</h1>
              <p className="mt-5 text-lg leading-8 text-sage-800">A calm space for daily reflection, mood tracking, guided prompts, and tiny reminders that you are allowed to soften.</p>
            </div>
            <div className="mt-12 flex items-center gap-3 rounded-3xl bg-white/65 p-4 text-sm text-sage-800">
              <Lock size={19} /> Entries stay in this browser using local storage.
            </div>
          </div>
          <form className="p-10" onSubmit={submit}>
            <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-3xl bg-sage-100 text-sage-700">
              <Lock size={25} />
            </div>
            <h2 className="text-3xl font-extrabold text-ink">{hasPin ? 'Welcome back' : 'Create your soft lock'}</h2>
            <p className="mt-3 leading-7 text-sage-700">{hasPin ? 'Enter your private PIN to open your journal.' : 'Set a simple PIN for this browser. It is a light privacy step for your personal writing space.'}</p>
            <div className="relative mt-8">
              <input
                className="w-full rounded-2xl border border-sage-200 bg-white px-5 py-4 pr-16 text-lg font-semibold tracking-widest outline-none transition focus:border-sage-500 focus:ring-4 focus:ring-sage-100"
                maxLength={12}
                onChange={(event) => setPin(event.target.value)}
                placeholder="Your PIN"
                type={showPin ? 'text' : 'password'}
                value={pin}
              />
              <button
                aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
                className="absolute right-3 top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-xl p-2 text-sage-600 transition hover:bg-sage-50 hover:text-sage-900"
                onClick={() => setShowPin((current) => !current)}
                type="button"
              >
                {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {error && <p className="mt-3 text-sm font-semibold text-rose-600">{error}</p>}
            <button className="mt-6 w-full rounded-2xl bg-ink px-5 py-4 font-bold text-white shadow-lift transition hover:-translate-y-1 hover:bg-sage-800" type="submit">
              {hasPin ? 'Unlock journal' : 'Begin gently'}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

function PinSettingsDialog({ isOpen, onClose, onChangePin, onRemovePin }) {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [showCurrentPin, setShowCurrentPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setCurrentPin('');
      setNewPin('');
      setShowCurrentPin(false);
      setShowNewPin(false);
      setError('');
      setSuccess('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChangePin = (event) => {
    event.preventDefault();
    const result = onChangePin(currentPin, newPin);
    if (result.ok) {
      setSuccess(result.message);
      setError('');
      setCurrentPin('');
      setNewPin('');
      return;
    }
    setError(result.message);
    setSuccess('');
  };

  const handleRemovePin = () => {
    const result = onRemovePin(currentPin);
    if (result.ok) {
      setSuccess('');
      setError('');
      onClose();
      return;
    }
    setError(result.message);
    setSuccess('');
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/25 px-6 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[2rem] border border-white/80 bg-white/95 p-8 shadow-soft">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-sage-600">Privacy</p>
            <h3 className="mt-2 text-3xl font-extrabold text-ink">Manage your lock PIN</h3>
            <p className="mt-3 max-w-xl leading-7 text-sage-700">Change the current PIN for this browser or remove the lock completely if you no longer want the journal gated.</p>
          </div>
          <button className="rounded-full border border-sage-200 bg-white px-4 py-2 text-sm font-bold text-sage-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-sage-50" onClick={onClose} type="button">
            Done
          </button>
        </div>

        <form className="mt-8 grid gap-5" onSubmit={handleChangePin}>
          <label className="block text-sm font-bold text-sage-800">
            Current PIN
            <div className="relative mt-2">
              <input
                className="w-full rounded-2xl border border-sage-200 bg-white px-4 py-3 pr-14 text-base outline-none transition focus:border-sage-500 focus:ring-4 focus:ring-sage-100"
                maxLength={12}
                onChange={(event) => setCurrentPin(event.target.value)}
                placeholder="Enter current PIN"
                type={showCurrentPin ? 'text' : 'password'}
                value={currentPin}
              />
              <button
                aria-label={showCurrentPin ? 'Hide current PIN' : 'Show current PIN'}
                className="absolute right-3 top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-xl p-2 text-sage-600 transition hover:bg-sage-50 hover:text-sage-900"
                onClick={() => setShowCurrentPin((current) => !current)}
                type="button"
              >
                {showCurrentPin ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          <label className="block text-sm font-bold text-sage-800">
            New PIN
            <div className="relative mt-2">
              <input
                className="w-full rounded-2xl border border-sage-200 bg-white px-4 py-3 pr-14 text-base outline-none transition focus:border-sage-500 focus:ring-4 focus:ring-sage-100"
                maxLength={12}
                onChange={(event) => setNewPin(event.target.value)}
                placeholder="Choose a new PIN"
                type={showNewPin ? 'text' : 'password'}
                value={newPin}
              />
              <button
                aria-label={showNewPin ? 'Hide new PIN' : 'Show new PIN'}
                className="absolute right-3 top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-xl p-2 text-sage-600 transition hover:bg-sage-50 hover:text-sage-900"
                onClick={() => setShowNewPin((current) => !current)}
                type="button"
              >
                {showNewPin ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          {error && <p className="text-sm font-semibold text-rose-600">{error}</p>}
          {success && <p className="text-sm font-semibold text-sage-700">{success}</p>}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button className="rounded-2xl bg-ink px-5 py-3 font-bold text-white shadow-lift transition hover:-translate-y-0.5 hover:bg-sage-800" type="submit">
              Update PIN
            </button>
            <button className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-50 px-5 py-3 font-bold text-rose-700 transition hover:-translate-y-0.5 hover:bg-rose-100" onClick={handleRemovePin} type="button">
              <Trash2 size={18} /> Remove lock
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [activeHomeSection, setActiveHomeSection] = useState('overview');
  const [entries, setEntries] = useState(getInitialEntries);
  const [selectedMood, setSelectedMood] = useState('Calm');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saveReward, setSaveReward] = useState('');
  const [customQuotes, setCustomQuotes] = useState(getInitialCustomQuotes);
  const [customQuoteDraft, setCustomQuoteDraft] = useState('');
  const [quoteStyle, setQuoteStyle] = useState(getInitialQuoteStyle);
  const [journalStyle, setJournalStyle] = useState(getInitialJournalStyle);
  const [petHappiness, setPetHappiness] = useState(60);
  const [petTreats, setPetTreats] = useState(0);
  const [petMood, setPetMood] = useState('walking');
  const [importantDates, setImportantDates] = useState(() => {
    const saved = localStorage.getItem('quiet-journal-important-dates');
    return saved ? JSON.parse(saved) : {};
  });
  const [importanceModalOpen, setImportanceModalOpen] = useState(false);
  const [importanceDraft, setImportanceDraft] = useState('');
  const [petPosition, setPetPosition] = useState({ x: 20, y: 40 });
  const [petDirection, setPetDirection] = useState(1);
  const [petBubble, setPetBubble] = useState('');
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(() => todayISO().slice(0, 7));
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(todayISO());
  const [isEditingEntry, setIsEditingEntry] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editMood, setEditMood] = useState('Calm');
  const editBodyRef = useRef(null);
  const [customWeathers, setCustomWeathers] = useState(getInitialCustomWeathers);
  const [customWeatherName, setCustomWeatherName] = useState('');
  const [customWeatherEmoji, setCustomWeatherEmoji] = useState('🌙');
  const [customWeatherImage, setCustomWeatherImage] = useState('');
  const [activePrompt, setActivePrompt] = useState(prompts[0]);
  const [hasPin, setHasPin] = useState(Boolean(getSavedPin()));
  const [locked, setLocked] = useState(Boolean(getSavedPin()));
  const [pinSettingsOpen, setPinSettingsOpen] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(() => new Date().getDate() % quotes.length);
  const [selectedTheme, setSelectedTheme] = useState(() => localStorage.getItem(THEME_STORAGE_KEY) || 'sage');
  const [selectedDesign, setSelectedDesign] = useState(() => localStorage.getItem(DESIGN_STORAGE_KEY) || 'soft');
  const [customColor, setCustomColor] = useState(() => localStorage.getItem(CUSTOM_COLOR_STORAGE_KEY) || '#587f49');
  const [quoteBg, setQuoteBg] = useState(() => localStorage.getItem(QUOTE_BG_STORAGE_KEY) || '#45643b');
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [comfortMode, setComfortMode] = useState(() => localStorage.getItem(COMFORT_MODE_STORAGE_KEY) === 'true');
  const [companion, setCompanion] = useState(getInitialCompanion);
  const [companionSelected, setCompanionSelected] = useState(false);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [cloudStatus, setCloudStatus] = useState('Local mode');
  const entryBodyRef = useRef(null);
  const companionMediaRef = useRef(null);

  const quickEmojis = ['✨', '🌸', '🍃', '☕', '🌙', '💛', '🌿', '☀️', '🧸', '🫧', '🍂', '🫶'];
  const homeSections = [
    { id: 'overview', label: 'Overview', icon: Waves, detail: 'Progress + shortcuts' },
    { id: 'about', label: 'About', icon: Compass, detail: 'How the journal works' },
    { id: 'guides', label: 'Guides', icon: BookOpen, detail: 'Landing and SEO pages' },
    { id: 'resources', label: 'Resources', icon: HeartHandshake, detail: 'Gentle practices' },
    { id: 'articles', label: 'Articles', icon: Newspaper, detail: 'Short reflections' },
    { id: 'faq', label: 'FAQ', icon: Sparkles, detail: 'Common questions' },
    { id: 'tips', label: 'Tips', icon: Leaf, detail: 'Ways to begin' },
    { id: 'privacy', label: 'Privacy', icon: Shield, detail: 'What stays private' },
    { id: 'terms', label: 'Terms', icon: Scale, detail: 'Helpful notes' },
    { id: 'contact', label: 'Contact', icon: Mail, detail: 'Reach the owner' }
  ];
  const homeSectionMap = {
    home: 'overview',
    overview: 'overview',
    about: 'about',
    'seo-landing': 'guides',
    guides: 'guides',
    resources: 'resources',
    articles: 'articles',
    faq: 'faq',
    tips: 'tips',
    privacy: 'privacy',
    terms: 'terms',
    contact: 'contact'
  };

  const activeTheme = colorThemes.find((theme) => theme.id === selectedTheme) || colorThemes[0];
  const activeDesign = designStyles.find((style) => style.id === selectedDesign) || designStyles[0];
  const weatherOptions = useMemo(() => [...moods, ...customWeathers], [customWeathers]);
  const quoteLibrary = useMemo(() => [...quotes, ...customQuotes], [customQuotes]);
  const activeQuoteFont = quoteFontOptions.find((font) => font.id === quoteStyle.fontId)?.css || quoteFontOptions[0].css;
  const activeQuoteSize = quoteSizeOptions.find((size) => size.id === quoteStyle.sizeId)?.value || quoteSizeOptions[1].value;
  const activeJournalFont = journalFontOptions.find((font) => font.id === journalStyle.fontId)?.css || journalFontOptions[0].css;
  const activeJournalSize = journalSizeOptions.find((size) => size.id === journalStyle.sizeId)?.value || journalSizeOptions[1].value;
  const companionIsVideo = String(companion.character || '').startsWith('data:video');
  const companionIsUploadedMedia = String(companion.character || '').startsWith('data:') || String(companion.character || '').startsWith('http');
  const { width: companionFrameWidth, height: companionFrameHeight } = getCompanionFrameDimensions(companion.size, companionIsVideo, companionIsUploadedMedia);
  const themeStyle = {
    '--accent': selectedTheme === 'custom' ? customColor : activeTheme.accent,
    '--accent-soft': selectedTheme === 'custom' ? '#f4f1ec' : activeTheme.soft,
    '--accent-glow': selectedTheme === 'custom' ? customColor : activeTheme.glow,
    '--shape-radius': activeDesign.radius,
    '--theme-texture': activeDesign.texture,
    '--quote-bg': quoteBg
  };

  function navigateToTab(tabId) {
    setActiveTab(tabId);
    if (tabId === 'home') {
      setActiveHomeSection('overview');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openHomeSection(sectionId = 'overview') {
    setActiveTab('home');
    setActiveHomeSection(homeSectionMap[sectionId] || 'overview');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      setCloudStatus(currentUser ? 'Cloud sync on' : 'Local mode');
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    const entriesQuery = query(collection(db, 'users', user.uid, 'entries'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      entriesQuery,
      (snapshot) => {
        setEntries(snapshot.docs.map((entryDoc) => ({ id: entryDoc.id, ...entryDoc.data() })));
        setCloudStatus('Cloud sync on');
      },
      (error) => {
        console.error('Cloud diary sync failed', error);
        setCloudStatus('Cloud sync needs setup');
      }
    );
    return unsubscribe;
  }, [user]);

  useEffect(() => {
    localStorage.setItem(CUSTOM_WEATHER_STORAGE_KEY, JSON.stringify(customWeathers));
  }, [customWeathers]);

  useEffect(() => {
    localStorage.setItem(CUSTOM_QUOTES_STORAGE_KEY, JSON.stringify(customQuotes));
  }, [customQuotes]);

  useEffect(() => {
    localStorage.setItem(QUOTE_STYLE_STORAGE_KEY, JSON.stringify(quoteStyle));
  }, [quoteStyle]);

  useEffect(() => {
    localStorage.setItem(JOURNAL_STYLE_STORAGE_KEY, JSON.stringify(journalStyle));
  }, [journalStyle]);

  useEffect(() => {
    localStorage.setItem(COMPANION_STORAGE_KEY, JSON.stringify(companion));
  }, [companion]);

  useEffect(() => {
    localStorage.setItem('quiet-journal-important-dates', JSON.stringify(importantDates));
  }, [importantDates]);

  useEffect(() => {
    return enableCompanionResize(companionMediaRef);
  }, [companionSelected, companion.size, companion.x, companion.y, companionIsVideo, companionIsUploadedMedia]);

  useEffect(() => {
    const media = companionMediaRef.current;
    const container = media?.closest('.totoro-container');
    const containerRect = container?.getBoundingClientRect();
    if (!containerRect) return;
    const next = clampCompanionPosition(
      companion.size,
      companion.x || 0,
      companion.y || 0,
      containerRect.width,
      containerRect.height,
      companionIsVideo,
      companionIsUploadedMedia
    );
    if (next.x !== (companion.x || 0) || next.y !== (companion.y || 0)) {
      setCompanion((current) => ({ ...current, x: next.x, y: next.y }));
    }
  }, [companion.size, companion.x, companion.y, companionIsVideo, companionIsUploadedMedia]);

  useEffect(() => {
    const handleWindowMouseDown = (event) => {
      if (companionMediaRef.current && !companionMediaRef.current.contains(event.target)) {
        setCompanionSelected(false);
      }
    };
    window.addEventListener('mousedown', handleWindowMouseDown);
    return () => window.removeEventListener('mousedown', handleWindowMouseDown);
  }, []);

  useEffect(() => {
    return enableImageResize(entryBodyRef, setBody);
  }, []);

  useEffect(() => {
    if (isEditingEntry) {
      return enableImageResize(editBodyRef, setEditBody);
    }
    return undefined;
  }, [isEditingEntry]);

  useEffect(() => {
    if (petMood === 'happy' || petMood === 'snack' || petMood === 'yawn') return undefined;
    const moveInterval = window.setInterval(() => {
      setPetPosition((current) => {
        const nextX = Math.max(6, Math.min(88, current.x + (Math.random() * 8 - 4) * petDirection));
        let nextDirection = petDirection;
        if (nextX <= 8 || nextX >= 86) {
          nextDirection = -petDirection;
          setPetDirection(nextDirection);
        }
        const nextY = Math.max(18, Math.min(68, current.y + (Math.random() * 7 - 3.5)));
        if (Math.random() > 0.82) {
          setPetMood('yawn');
          setPetBubble('mrrrp');
          window.setTimeout(() => {
            setPetMood('walking');
            setPetBubble('');
          }, 1200);
        } else if (Math.random() > 0.72) {
          setPetMood('running');
          window.setTimeout(() => setPetMood('walking'), 900);
        }
        return { x: nextX, y: nextY };
      });
    }, 1800);
    return () => window.clearInterval(moveInterval);
  }, [petDirection, petMood]);

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, selectedTheme);
    localStorage.setItem(DESIGN_STORAGE_KEY, selectedDesign);
    localStorage.setItem(CUSTOM_COLOR_STORAGE_KEY, customColor);
    localStorage.setItem(QUOTE_BG_STORAGE_KEY, quoteBg);
  }, [selectedTheme, selectedDesign, customColor, quoteBg]);

  useEffect(() => {
    localStorage.setItem(COMFORT_MODE_STORAGE_KEY, String(comfortMode));
  }, [comfortMode]);

  const streak = useMemo(() => {
    const dates = new Set(entries.map((entry) => entry.createdAt.slice(0, 10)));
    let count = 0;
    const cursor = new Date(todayISO());
    while (dates.has(cursor.toISOString().slice(0, 10))) {
      count += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }, [entries]);

  const averageMood = useMemo(() => {
    if (!entries.length) return '—';
    const legacyMoodMap = { 'Grounded': 'Happy', 'Soft': 'Calm', 'Okay': 'Neutral', 'Heavy': 'Sad', 'Stormy': 'Anxious' };
    const score = entries.reduce((sum, entry) => {
      const effectiveMoodLabel = legacyMoodMap[entry.mood] || entry.mood;
      const mood = weatherOptions.find((item) => item.label === effectiveMoodLabel) || weatherOptions.find(m => m.label === entry.mood) || moods[2];
      return sum + mood.value;
    }, 0) / entries.length;
    if (score >= 4.5) return 'Happy';
    if (score >= 3.5) return 'Calm';
    if (score >= 2.5) return 'Neutral';
    if (score >= 1.5) return 'Sad';
    return 'Anxious';
  }, [entries, weatherOptions]);

  const weeklySummary = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const recentEntries = entries.filter((entry) => new Date(entry.createdAt) >= sevenDaysAgo);
    if (!recentEntries.length) {
      return 'No pressure to have a streak. One gentle check-in is enough to begin.';
    }
    const counts = recentEntries.reduce((acc, entry) => ({ ...acc, [entry.mood]: (acc[entry.mood] || 0) + 1 }), {});
    const commonMood = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Calm';
    return `You checked in ${recentEntries.length} time${recentEntries.length === 1 ? '' : 's'} this week. Your most common mood was ${commonMood}.`;
  }, [entries]);

  const entriesByDate = useMemo(() => entries.reduce((acc, entry) => {
    const key = entry.createdAt.slice(0, 10);
    return { ...acc, [key]: [...(acc[key] || []), entry] };
  }, {}), [entries]);
  const calendarDays = useMemo(() => buildCalendarDays(calendarMonth), [calendarMonth]);
  const selectedDateEntries = entriesByDate[selectedCalendarDate] || [];
  const selectedImportantDate = importantDates[selectedCalendarDate] || null;
  const importantDateCount = useMemo(() => Object.keys(importantDates).length, [importantDates]);

  const rewardLevel = useMemo(() => {
    if (entries.length >= 30) return { title: 'Moon Keeper', emoji: '🌙', next: 'Your quiet archive is glowing.' };
    if (entries.length >= 14) return { title: 'Kindness', emoji: '🌷', next: `${30 - entries.length} more pages until Moon Keeper.` };
    if (entries.length >= 7) return { title: 'Weekly Spark', emoji: '✨', next: `${14 - entries.length} more pages until Kindness.` };
    if (entries.length >= 3) return { title: 'Seedling', emoji: '🌱', next: `${7 - entries.length} more pages until Weekly Spark.` };
    return { title: 'Starter', emoji: '☁️', next: `${Math.max(3 - entries.length, 1)} more pages until Seedling.` };
  }, [entries.length]);

  const draftText = useMemo(() => getPlainTextFromHtml(body), [body]);
  const weeklyGoal = 5;
  const weeklyCheckIns = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    return entries.filter((entry) => new Date(entry.createdAt) >= sevenDaysAgo).length;
  }, [entries]);
  const entriesToNextReward = useMemo(() => {
    if (entries.length >= 30) return 0;
    if (entries.length >= 14) return 30 - entries.length;
    if (entries.length >= 7) return 14 - entries.length;
    if (entries.length >= 3) return 7 - entries.length;
    return Math.max(3 - entries.length, 0);
  }, [entries.length]);
  const journalQuest = useMemo(() => ([
    { label: 'Notice how today feels', done: Boolean(selectedMood) },
    { label: 'Give this page a soft name', done: Boolean(title.trim() || draftText) },
    { label: 'Keep one honest detail', done: draftText.length >= 40 }
  ]), [draftText, selectedMood, title]);
  const completedQuestCount = journalQuest.filter((step) => step.done).length;
  const journalNudge = useMemo(() => {
    if (streak >= 7) return 'You have made this space feel familiar now. Keep returning gently, never forcefully.';
    if (weeklyCheckIns >= weeklyGoal) return 'You have already given yourself enough attention this week. Anything extra is a bonus.';
    if (selectedMood === 'Anxious' || selectedMood === 'Sad') return 'Let this page stay soft. A few honest lines is more than enough today.';
    if (draftText.length >= 40) return 'There is already something worth keeping here. Add one more detail only if it feels right.';
    return 'You do not need to write a lot. A title, one line, or a feeling is already a real check-in.';
  }, [draftText.length, selectedMood, streak, weeklyCheckIns]);
  const latestEntry = entries[0] || null;
  const latestEntrySnippet = useMemo(() => {
    if (!latestEntry) return 'Your first entry can be one honest line. Start with the part that feels easiest to say.';
    const plainText = getPlainTextFromHtml(latestEntry.body || '');
    const source = plainText || latestEntry.title || 'A quiet page is waiting for you.';
    return source.length > 120 ? `${source.slice(0, 117).trim()}…` : source;
  }, [latestEntry]);
  const returnRitual = useMemo(() => {
    if (!latestEntry) {
      return {
        eyebrow: 'Welcome ritual',
        title: 'Your first page is ready.',
        text: 'Choose an atmosphere, name the moment, and let one honest line land.'
      };
    }
    if (streak >= 7) {
      return {
        eyebrow: 'Welcome back',
        title: `${streak} soft days in a row`,
        text: latestEntrySnippet
      };
    }
    return {
      eyebrow: `Last kept on ${formatDate(latestEntry.createdAt)}`,
      title: latestEntry.title || 'A recent reflection',
      text: latestEntrySnippet
    };
  }, [latestEntry, latestEntrySnippet, streak]);
  const hasImageMemory = useMemo(() => entries.some((entry) => /<img/i.test(entry.body || '')), [entries]);
  const achievementBadges = useMemo(() => ([
    {
      id: 'first-entry',
      emoji: '🌱',
      title: 'First Light',
      unlocked: entries.length >= 1,
      hint: entries.length >= 1 ? 'Your journal has begun.' : 'Save your first reflection.'
    },
    {
      id: 'streak',
      emoji: '🔥',
      title: 'Soft Streak',
      unlocked: streak >= 3,
      hint: streak >= 3 ? `${streak} days in a row.` : `${Math.max(3 - streak, 1)} more day${Math.max(3 - streak, 1) === 1 ? '' : 's'} to unlock.`
    },
    {
      id: 'weekly',
      emoji: '🌷',
      title: 'Weekly Bloom',
      unlocked: weeklyCheckIns >= weeklyGoal,
      hint: weeklyCheckIns >= weeklyGoal ? 'You filled this week with gentle check-ins.' : `${Math.max(weeklyGoal - weeklyCheckIns, 1)} more check-in${Math.max(weeklyGoal - weeklyCheckIns, 1) === 1 ? '' : 's'} this week.`
    },
    {
      id: 'memory',
      emoji: '📚',
      title: 'Memory Keeper',
      unlocked: entries.length >= 10,
      hint: entries.length >= 10 ? 'A fuller archive is taking shape.' : `${Math.max(10 - entries.length, 1)} more entries to build your archive.`
    },
    {
      id: 'image',
      emoji: '🖼️',
      title: 'Snapshot Saver',
      unlocked: hasImageMemory,
      hint: hasImageMemory ? 'You saved a visual memory.' : 'Add one photo to unlock this badge.'
    },
    {
      id: 'custom-mood',
      emoji: '💫',
      title: 'Mood Maker',
      unlocked: customWeathers.length > 0,
      hint: customWeathers.length > 0 ? 'Your personal mood palette is live.' : 'Create one custom mood to unlock.'
    }
  ]), [customWeathers.length, entries, hasImageMemory, streak, weeklyCheckIns]);
  const unlockedAchievementCount = achievementBadges.filter((badge) => badge.unlocked).length;
  const nextAchievement = achievementBadges.find((badge) => !badge.unlocked) || achievementBadges[achievementBadges.length - 1];

  async function signInWithGoogle() {
    try {
      setCloudStatus('Opening Google sign-in...');
      const result = await signInWithPopup(auth, googleProvider);
      if (entries.length) {
        await Promise.all(
          entries.map((entry) => setDoc(doc(db, 'users', result.user.uid, 'entries', entry.id), entry, { merge: true }))
        );
      }
      setCloudStatus('Cloud sync on');
    } catch (error) {
      console.error('Google sign-in failed', error);
      setCloudStatus('Sign-in was cancelled or blocked');
    }
  }

  async function handleSignOut() {
    try {
      await signOut(auth);
      setEntries(getInitialEntries());
      setCloudStatus('Local mode');
    } catch (error) {
      console.error('Sign out failed', error);
      setCloudStatus('Could not sign out');
    }
  }

  async function saveEntry(event) {
    event.preventDefault();
    if (!body.trim() && !title.trim()) return;
    const entry = {
      id: crypto.randomUUID(),
      title: title.trim() || activePrompt,
      body: body.trim(),
      mood: selectedMood,
      prompt: activePrompt,
      createdAt: new Date().toISOString()
    };
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid, 'entries', entry.id), entry);
        setCloudStatus('Saved to cloud');
      } catch (error) {
        console.error('Could not save cloud entry', error);
        setCloudStatus('Cloud save failed');
      }
    } else {
      setEntries((currentEntries) => [entry, ...currentEntries]);
    }
    setSaveReward(rewardMessages[Math.floor(Math.random() * rewardMessages.length)]);
    window.setTimeout(() => setSaveReward(''), 4200);
    setTitle('');
    setBody('');
    if (entryBodyRef.current) entryBodyRef.current.innerHTML = '';
    setActivePrompt(prompts[(prompts.indexOf(activePrompt) + 1) % prompts.length]);
    setSelectedMood('Calm');
  }

  async function deleteEntry(id) {
    setEntries(entries.filter((entry) => entry.id !== id));
    if (selectedEntry?.id === id) {
      setSelectedEntry(null);
      setIsEditingEntry(false);
    }
    if (user) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'entries', id));
        setCloudStatus('Deleted from cloud');
      } catch (error) {
        console.error('Could not delete cloud entry', error);
        setCloudStatus('Cloud delete failed');
      }
    }
  }

  function startEditingEntry() {
    if (!selectedEntry) return;
    setEditTitle(selectedEntry.title);
    setEditBody(selectedEntry.body || '');
    setEditMood(selectedEntry.mood);
    setIsEditingEntry(true);
    window.setTimeout(() => {
      if (editBodyRef.current) {
        editBodyRef.current.innerHTML = selectedEntry.body || '';
      }
    }, 0);
  }

  async function saveEditedEntry() {
    if (!selectedEntry) return;
    const editor = editBodyRef.current;
    const finalBody = editor?.innerHTML ?? editBody;
    const updated = {
      ...selectedEntry,
      title: editTitle.trim() || 'Untitled moment',
      body: finalBody,
      mood: editMood
    };
    setEntries((currentEntries) => currentEntries.map((entry) => entry.id === selectedEntry.id ? updated : entry));
    setSelectedEntry(updated);
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid, 'entries', selectedEntry.id), updated);
        setCloudStatus('Updated in cloud');
      } catch (error) {
        console.error('Could not update cloud entry', error);
        setCloudStatus('Cloud update failed');
      }
    }
    setIsEditingEntry(false);
  }

  function handleWeatherImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCustomWeatherImage(String(reader.result || ''));
    reader.readAsDataURL(file);
  }

  function insertTextAtCursor(text) {
    const editor = entryBodyRef.current;
    if (!editor) {
      setBody((current) => current + text);
      return;
    }
    editor.focus();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      editor.append(document.createTextNode(text));
    } else {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const textNode = document.createTextNode(text);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    setBody(editor.innerHTML);
  }

  function insertTextInEditor(editor, text) {
    if (!editor) return;
    editor.focus();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      editor.append(document.createTextNode(text));
    } else {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const textNode = document.createTextNode(text);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }

  function toggleBulletList(editorRef, updateBody) {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    document.execCommand('insertUnorderedList');
    updateBody(editor.innerHTML);
  }

  function insertImageInEditor(editor, src) {
    if (!editor) return;
    editor.focus();
    const img = document.createElement('img');
    img.src = src;
    img.className = 'journal-inline-img';
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    img.style.display = 'block';
    img.style.margin = '1rem auto';
    img.style.borderRadius = '1rem';
    img.style.position = 'relative';
    img.style.transform = 'translate(0px, 0px)';
    img.draggable = false;
    img.alt = 'Journal photo';
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && editor.contains(selection.anchorNode)) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(img);
      range.setStartAfter(img);
      range.setEndAfter(img);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      editor.appendChild(img);
    }
    const br = document.createElement('br');
    img.after(br);
  }

  function insertQuickEmoji(emoji) {
    insertTextAtCursor(`${emoji} `);
  }

  function insertEditQuickEmoji(emoji) {
    insertTextInEditor(editBodyRef.current, `${emoji} `);
    setEditBody(editBodyRef.current?.innerHTML || editBody);
  }

  function handleEntryImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const editor = entryBodyRef.current;
      insertImageInEditor(editor, String(reader.result || ''));
      setBody(editor?.innerHTML || body);
    };
    reader.readAsDataURL(file);
  }

  function handleEditEntryImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const editor = editBodyRef.current;
      insertImageInEditor(editor, String(reader.result || ''));
      setEditBody(editor?.innerHTML || editBody);
    };
    reader.readAsDataURL(file);
  }

  function renderJournalContent(content) {
    return <div className="prose-journal" dangerouslySetInnerHTML={{ __html: String(content || '') }} />;
  }

  function enableImageResize(editorRef, updateBody) {
    const editor = editorRef.current;
    if (!editor) return () => {};

    let selectedImg = null;
    let activeMode = null;
    let resizeHandle = null;
    let animationFrame = null;
    let lastClientX = 0;
    let lastClientY = 0;
    let startX = 0;
    let startY = 0;
    let startW = 0;
    let startH = 0;
    let startTranslateX = 0;
    let startTranslateY = 0;

    const imageBoundsPadding = 12;
    const overlayHost = document.body;

    const selectionOverlay = document.createElement('div');
    selectionOverlay.className = 'journal-media-overlay is-hidden';
    selectionOverlay.setAttribute('contenteditable', 'false');
    selectionOverlay.innerHTML = `
      <span class="companion-selection-border"></span>
      <span class="companion-handle companion-handle-tl" data-journal-resize-handle="tl"></span>
      <span class="companion-handle companion-handle-tm" data-journal-resize-handle="tm"></span>
      <span class="companion-handle companion-handle-tr" data-journal-resize-handle="tr"></span>
      <span class="companion-handle companion-handle-ml" data-journal-resize-handle="ml"></span>
      <span class="companion-handle companion-handle-mr" data-journal-resize-handle="mr"></span>
      <span class="companion-handle companion-handle-bl" data-journal-resize-handle="bl"></span>
      <span class="companion-handle companion-handle-bm" data-journal-resize-handle="bm"></span>
      <span class="companion-handle companion-handle-br" data-journal-resize-handle="br"></span>
    `;
    overlayHost?.appendChild(selectionOverlay);

    const parseTranslate = (img) => {
      const match = /translate(?:3d)?\((-?\d+(?:\.\d+)?)px,\s*(-?\d+(?:\.\d+)?)px(?:,\s*0(?:px)?)?\)/.exec(img.style.transform || '');
      return {
        x: match ? Number(match[1]) : 0,
        y: match ? Number(match[2]) : 0
      };
    };

    const updateSelectionOverlay = () => {
      if (!selectedImg || !selectedImg.isConnected || !overlayHost) {
        selectionOverlay.classList.add('is-hidden');
        return;
      }

      const imgRect = selectedImg.getBoundingClientRect();
      selectionOverlay.style.left = `${imgRect.left}px`;
      selectionOverlay.style.top = `${imgRect.top}px`;
      selectionOverlay.style.width = `${imgRect.width}px`;
      selectionOverlay.style.height = `${imgRect.height}px`;
      selectionOverlay.classList.remove('is-hidden');
    };

    const clampImageTranslate = (img, nextX, nextY) => {
      const editorRect = editor.getBoundingClientRect();
      const imgRect = img.getBoundingClientRect();
      const chromePadding = img.classList.contains('selected-media') || activeMode ? imageBoundsPadding : 0;
      const maxX = Math.max(0, (editorRect.width - imgRect.width - chromePadding * 2) / 2);
      const maxY = Math.max(0, (editorRect.height - imgRect.height - chromePadding * 2) / 2);
      return {
        x: Math.max(-maxX, Math.min(maxX, nextX)),
        y: Math.max(-maxY, Math.min(maxY, nextY))
      };
    };

    const getMaxImageWidth = (translateX, translateY, aspectRatio) => {
      const editorRect = editor.getBoundingClientRect();
      const allowedWidth = Math.max(100, editorRect.width - Math.abs(translateX) * 2 - imageBoundsPadding * 2);
      const allowedHeight = Math.max(100 / aspectRatio, editorRect.height - Math.abs(translateY) * 2 - imageBoundsPadding * 2);
      return Math.max(100, Math.min(allowedWidth, allowedHeight * aspectRatio));
    };

    const serializeEditor = () => {
      const clone = editor.cloneNode(true);
      clone.querySelectorAll('img').forEach((img) => img.classList.remove('selected-media'));
      return clone.innerHTML;
    };

    const clearSelection = () => {
      if (selectedImg) {
        selectedImg.classList.remove('selected-media');
        selectedImg = null;
      }
      selectionOverlay.classList.add('is-hidden');
    };

    const startInteraction = (mode, event, handleName = null) => {
      if (!selectedImg) return;
      activeMode = mode;
      resizeHandle = handleName
        ? {
            left: handleName.includes('l'),
            right: handleName.includes('r'),
            top: handleName.includes('t'),
            bottom: handleName.includes('b')
          }
        : null;
      startW = selectedImg.offsetWidth;
      startH = selectedImg.offsetHeight;
      const translate = parseTranslate(selectedImg);
      startTranslateX = translate.x;
      startTranslateY = translate.y;
      startX = event.clientX;
      startY = event.clientY;
      event.preventDefault();
      event.stopPropagation();
    };

    const handleMouseDown = (event) => {
      const handleTarget = event.target.closest('[data-journal-resize-handle]');
      if (handleTarget && selectedImg) {
        startInteraction('resize', event, handleTarget.getAttribute('data-journal-resize-handle'));
        return;
      }

      if (event.target.closest('.journal-media-overlay') && selectedImg) {
        startInteraction('move', event);
        return;
      }

      const clickedImage = event.target.closest('img');
      if (clickedImage && editor.contains(clickedImage)) {
        if (selectedImg !== clickedImage) {
          clearSelection();
          selectedImg = clickedImage;
          selectedImg.classList.add('selected-media');
          updateSelectionOverlay();
          event.preventDefault();
          return;
        }

        startInteraction('move', event);
        return;
      }

      clearSelection();
    };

    const handleMouseMove = (event) => {
      if (!selectedImg || !activeMode) return;
      lastClientX = event.clientX;
      lastClientY = event.clientY;
      if (animationFrame) return;
      animationFrame = requestAnimationFrame(() => {
        animationFrame = null;
        if (!selectedImg || !activeMode) return;
        const dx = lastClientX - startX;
        const dy = lastClientY - startY;

        if (activeMode === 'move') {
          const next = clampImageTranslate(selectedImg, startTranslateX + dx, startTranslateY + dy);
          selectedImg.style.transform = `translate3d(${next.x}px, ${next.y}px, 0)`;
          updateSelectionOverlay();
          return;
        }

        const aspectRatio = startW / startH || 1;
        const horizontalDelta = resizeHandle?.left ? -dx : resizeHandle?.right ? dx : 0;
        const verticalDelta = resizeHandle?.top ? -dy : resizeHandle?.bottom ? dy : 0;
        const hasHorizontalHandle = Boolean(resizeHandle?.left || resizeHandle?.right);
        const hasVerticalHandle = Boolean(resizeHandle?.top || resizeHandle?.bottom);
        let dominantDelta = 0;

        if (hasHorizontalHandle && hasVerticalHandle) {
          dominantDelta = Math.abs(horizontalDelta) > Math.abs(verticalDelta) ? horizontalDelta : verticalDelta;
        } else if (hasHorizontalHandle) {
          dominantDelta = horizontalDelta;
        } else {
          dominantDelta = verticalDelta;
        }

        const proposedWidth = Math.max(100, startW + dominantDelta);
        const maxWidth = getMaxImageWidth(startTranslateX, startTranslateY, aspectRatio);
        const nextWidth = Math.min(proposedWidth, maxWidth);
        const nextHeight = nextWidth / aspectRatio;
        selectedImg.style.width = `${nextWidth}px`;
        selectedImg.style.height = `${nextHeight}px`;
        const boundedTranslate = clampImageTranslate(selectedImg, startTranslateX, startTranslateY);
        selectedImg.style.transform = `translate3d(${boundedTranslate.x}px, ${boundedTranslate.y}px, 0)`;
        updateSelectionOverlay();
      });
    };

    const handleMouseUp = () => {
      if (selectedImg && activeMode) {
        const translate = parseTranslate(selectedImg);
        const boundedTranslate = clampImageTranslate(selectedImg, translate.x, translate.y);
        selectedImg.style.transform = `translate3d(${boundedTranslate.x}px, ${boundedTranslate.y}px, 0)`;
        updateSelectionOverlay();
        updateBody(serializeEditor());
      }
      activeMode = null;
      resizeHandle = null;
    };

    editor.addEventListener('mousedown', handleMouseDown);
    selectionOverlay.addEventListener('mousedown', handleMouseDown);
    editor.addEventListener('scroll', updateSelectionOverlay);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('resize', updateSelectionOverlay);
    window.addEventListener('scroll', updateSelectionOverlay, true);

    return () => {
      clearSelection();
      editor.removeEventListener('mousedown', handleMouseDown);
      selectionOverlay.removeEventListener('mousedown', handleMouseDown);
      editor.removeEventListener('scroll', updateSelectionOverlay);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('resize', updateSelectionOverlay);
      window.removeEventListener('scroll', updateSelectionOverlay, true);
      selectionOverlay.remove();
    };
  }

  function enableCompanionResize(mediaRef) {
    const media = mediaRef.current;
    if (!media) return () => {};

    let mode = null;
    let resizeHandle = null;
    let startX = 0;
    let startY = 0;
    let startSize = 0;
    let startPosX = 0;
    let startPosY = 0;
    let currentSize = companion.size || 80;
    let currentPosX = companion.x || 0;
    let currentPosY = companion.y || 0;
    let animationFrame = null;
    let lastClientX = 0;
    let lastClientY = 0;

    const getFrameDimensions = (size) => getCompanionFrameDimensions(size, companionIsVideo, companionIsUploadedMedia);

    const selectionPadding = 16;

    const clampPosition = (size, nextX, nextY) => {
      const container = media.closest('.totoro-container');
      const containerRect = container?.getBoundingClientRect();
      const frame = getFrameDimensions(size);
      const chromePadding = companionSelected || mode ? selectionPadding : 0;
      if (!containerRect) return { x: nextX, y: nextY };
      const maxX = Math.max(0, (containerRect.width - frame.width - chromePadding * 2) / 2);
      const maxY = Math.max(0, (containerRect.height - frame.height - chromePadding * 2) / 2);
      return {
        x: Math.max(-maxX, Math.min(maxX, nextX)),
        y: Math.max(-maxY, Math.min(maxY, nextY))
      };
    };

    const buildResizeState = (size, handleName) => {
      const frameBefore = getFrameDimensions(startSize);
      const frameAfter = getFrameDimensions(size);
      const anchorLeft = handleName?.includes('l');
      const anchorRight = handleName?.includes('r');
      const anchorTop = handleName?.includes('t');
      const anchorBottom = handleName?.includes('b');
      const horizontalShift = anchorLeft ? -(frameAfter.width - frameBefore.width) / 2 : anchorRight ? (frameAfter.width - frameBefore.width) / 2 : 0;
      const verticalShift = anchorTop ? -(frameAfter.height - frameBefore.height) / 2 : anchorBottom ? (frameAfter.height - frameBefore.height) / 2 : 0;

      return {
        size,
        frameAfter,
        x: startPosX + horizontalShift,
        y: startPosY + verticalShift
      };
    };

    const fitsResizeBounds = (state) => {
      const container = media.closest('.totoro-container');
      const containerRect = container?.getBoundingClientRect();
      if (!containerRect) return true;
      const halfWidth = containerRect.width / 2;
      const halfHeight = containerRect.height / 2;

      return (
        state.x - state.frameAfter.width / 2 - selectionPadding >= -halfWidth &&
        state.x + state.frameAfter.width / 2 + selectionPadding <= halfWidth &&
        state.y - state.frameAfter.height / 2 - selectionPadding >= -halfHeight &&
        state.y + state.frameAfter.height / 2 + selectionPadding <= halfHeight
      );
    };

    const resolveResizeState = (proposedSize, handleName) => {
      const candidate = buildResizeState(proposedSize, handleName);
      if (fitsResizeBounds(candidate) || proposedSize <= startSize) {
        return candidate;
      }

      let low = startSize;
      let high = proposedSize;
      let best = buildResizeState(startSize, handleName);

      for (let index = 0; index < 18; index += 1) {
        const mid = (low + high) / 2;
        const next = buildResizeState(mid, handleName);
        if (fitsResizeBounds(next)) {
          best = next;
          low = mid;
        } else {
          high = mid;
        }
      }

      return best;
    };

    const applyCompanionPreview = (size, x, y) => {
      currentSize = size;
      currentPosX = x;
      currentPosY = y;
      const frame = getFrameDimensions(size);
      media.style.width = `${frame.width}px`;
      media.style.height = `${frame.height}px`;
      media.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };

    const handleMouseDown = (event) => {
      if (!media.contains(event.target)) return;

      if (!companionSelected) {
        setCompanionSelected(true);
        event.preventDefault();
        return;
      }

      const handle = event.target.closest('[data-resize-handle]');
      startX = event.clientX;
      startY = event.clientY;
      startSize = companion.size || 80;
      startPosX = companion.x || 0;
      startPosY = companion.y || 0;
      currentSize = startSize;
      currentPosX = startPosX;
      currentPosY = startPosY;

      if (handle) {
        mode = 'resize';
        resizeHandle = handle.getAttribute('data-resize-handle');
      } else {
        mode = 'move';
      }

      media.classList.add('is-transforming');
      event.preventDefault();
      event.stopPropagation();
    };

    const handleMouseMove = (event) => {
      if (!mode) return;
      lastClientX = event.clientX;
      lastClientY = event.clientY;
      if (animationFrame) return;
      animationFrame = requestAnimationFrame(() => {
        animationFrame = null;
        if (!mode) return;
        const dx = lastClientX - startX;
        const dy = lastClientY - startY;

        if (mode === 'move') {
          const next = clampPosition(startSize, startPosX + dx, startPosY + dy);
          applyCompanionPreview(startSize, next.x, next.y);
          return;
        }

        let sizeDelta = 0;
        if (resizeHandle === 'ml') sizeDelta = -dx;
        else if (resizeHandle === 'mr') sizeDelta = dx;
        else if (resizeHandle === 'tm') sizeDelta = -dy;
        else if (resizeHandle === 'bm') sizeDelta = dy;
        else {
          const handleXSign = resizeHandle?.includes('l') ? -1 : 1;
          const handleYSign = resizeHandle?.includes('t') ? -1 : 1;
          const sizeDeltaX = handleXSign * dx;
          const sizeDeltaY = handleYSign * dy;
          sizeDelta = Math.abs(sizeDeltaX) > Math.abs(sizeDeltaY) ? sizeDeltaX : sizeDeltaY;
        }

        const proposedSize = Math.max(48, Math.min(420, startSize + sizeDelta));
        const resizeState = resolveResizeState(proposedSize, resizeHandle);
        const next = clampPosition(resizeState.size, resizeState.x, resizeState.y);
        applyCompanionPreview(resizeState.size, next.x, next.y);
      });
    };

    const handleMouseUp = () => {
      if (!mode) return;
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = null;
      }
      media.classList.remove('is-transforming');
      setCompanion((current) => ({ ...current, size: currentSize, x: currentPosX, y: currentPosY }));
      mode = null;
      resizeHandle = null;
    };

    media.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      media.classList.remove('is-transforming');
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }
      media.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }

  function addCustomWeather() {
    const cleanName = customWeatherName.trim();
    if (!cleanName) return;
    const customWeather = {
      id: crypto.randomUUID(),
      label: cleanName,
      emoji: customWeatherEmoji.trim() || '🌙',
      image: customWeatherImage,
      value: 3,
      hex: quoteBg || '#739f62'
    };
    setCustomWeathers([...customWeathers, customWeather]);
    setSelectedMood(cleanName);
    setCustomWeatherName('');
    setCustomWeatherEmoji('🌙');
    setCustomWeatherImage('');
  }

  function handlePetSceneMove(event) {
    if (petMood === 'snack' || petMood === 'happy') return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    const distance = Math.hypot(x - petPosition.x, y - petPosition.y);
    if (distance < 18) {
      petTheDog();
    }
  }

  function petTheDog() {
    setPetHappiness((current) => Math.min(100, current + 10));
    setPetMood('happy');
    setPetBubble('prrr');
    window.setTimeout(() => {
      setPetMood('walking');
      setPetBubble('');
    }, 1300);
  }

  function feedTheDog() {
    setPetHappiness((current) => Math.min(100, current + 18));
    setPetTreats((current) => current + 1);
    setPetMood('snack');
    setPetBubble('nom nom');
    window.setTimeout(() => {
      setPetMood('walking');
      setPetBubble('');
    }, 1500);
  }

  function addCustomQuote() {
    const quote = customQuoteDraft.trim();
    if (!quote) return;
    setCustomQuotes([...customQuotes, quote]);
    setQuoteIndex(quotes.length + customQuotes.length);
    setCustomQuoteDraft('');
  }

  function deleteCustomQuote(quoteToDelete) {
    setCustomQuotes(customQuotes.filter((quote) => quote !== quoteToDelete));
    setQuoteIndex(0);
  }

  function toggleImportantDate(dateKey) {
    setSelectedCalendarDate(dateKey);
    const existing = importantDates[dateKey];
    if (existing) {
      const { [dateKey]: _, ...rest } = importantDates;
      setImportantDates(rest);
    } else {
      setImportanceDraft('');
      setImportanceModalOpen(true);
    }
  }

  function saveImportantDate() {
    if (!importanceDraft.trim()) {
      setImportanceModalOpen(false);
      return;
    }
    setImportantDates({
      ...importantDates,
      [selectedCalendarDate]: {
        note: importanceDraft.trim(),
        createdAt: new Date().toISOString()
      }
    });
    setImportanceModalOpen(false);
    setImportanceDraft('');
  }

  function addStarterLine(label) {
    const starter = `<p><strong>${label}</strong></p><p><br></p>`;
    const currentHtml = entryBodyRef.current?.innerHTML || body || '';
    const nextHtml = currentHtml && currentHtml !== '<br>' ? `${currentHtml}${currentHtml.endsWith('>') ? '' : '<br>'}<p><br></p>${starter}` : starter;
    if (entryBodyRef.current) {
      entryBodyRef.current.innerHTML = nextHtml;
      entryBodyRef.current.focus();
    }
    setBody(nextHtml);
  }

  function deleteCustomWeather(label) {
    setCustomWeathers(customWeathers.filter((weather) => weather.label !== label));
    if (selectedMood === label) setSelectedMood('Calm');
  }

  function applyJournalAtmosphere(preset) {
    setSelectedTheme(preset.themeId);
    setSelectedDesign(preset.designId);
    setQuoteBg(preset.quoteBg);
    setJournalStyle((current) => ({ ...current, fontId: preset.journalFontId }));
    setQuoteStyle((current) => ({ ...current, fontId: preset.quoteFontId }));
    setCompanion((current) => ({ ...current, animation: preset.companionAnimation }));
  }

  function createPin(pin) {
    localStorage.setItem(PIN_KEY, pin);
    setHasPin(true);
    setLocked(false);
  }

  function changePin(currentPin, newPin) {
    const savedPin = getSavedPin();
    if (!currentPin.trim()) {
      return { ok: false, message: 'Enter your current PIN first.' };
    }
    if (currentPin.trim() !== savedPin) {
      return { ok: false, message: 'That current PIN does not match.' };
    }
    if (!newPin.trim()) {
      return { ok: false, message: 'Enter a new PIN to save.' };
    }
    localStorage.setItem(PIN_KEY, newPin.trim());
    setHasPin(true);
    return { ok: true, message: 'Your journal lock PIN has been updated.' };
  }

  function removePin(currentPin) {
    const savedPin = getSavedPin();
    if (!currentPin.trim()) {
      return { ok: false, message: 'Enter your current PIN before removing the lock.' };
    }
    if (currentPin.trim() !== savedPin) {
      return { ok: false, message: 'That current PIN does not match.' };
    }
    localStorage.removeItem(PIN_KEY);
    setHasPin(false);
    setLocked(false);
    setPinSettingsOpen(false);
    return { ok: true, message: 'The journal lock has been removed.' };
  }

  if (locked) {
    return <PrivacyGate hasPin={hasPin} onCreatePin={createPin} onUnlock={() => setLocked(false)} />;
  }

  return (
    <main className={`personalized-site design-${selectedDesign} ${comfortMode ? 'comfort-mode' : ''} min-h-screen overflow-hidden bg-sand-50 pb-24 text-ink lg:pb-0`} style={themeStyle}>
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-0 top-0 h-96 w-96 rounded-full bg-sage-200/70 blur-3xl" />
        <div className="absolute right-0 top-56 h-96 w-96 rounded-full bg-sand-200/80 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-teal-100/70 blur-3xl" />
      </div>


      <nav className="sticky top-0 z-20 px-4 pt-4">
        <div className="site-nav-shell mx-auto max-w-7xl rounded-[2rem] border border-white/80 bg-white/78 p-4 shadow-soft backdrop-blur-xl">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <a className="flex items-center gap-3" href="#home" onClick={() => openHomeSection('home')}>
              <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-sage-700 text-white shadow-lift">
                <Waves size={23} />
              </div>
              <div>
                <p className="font-display text-2xl font-bold text-sage-900">Quiet Journal Journey</p>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sage-600">Private online diary</p>
              </div>
            </a>
              <div className="site-nav-links hidden flex-1 items-center justify-center gap-6 lg:flex">
                {[
                  { id: 'home', label: 'Home', icon: Waves },
                  { id: 'write', label: 'Write', icon: PenLine },
                  { id: 'memories', label: 'Memories', icon: BookOpen },
                  { id: 'insights', label: 'Insights', icon: Sparkles }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    className={`flex items-center gap-2 text-sm font-extrabold uppercase tracking-widest transition ${activeTab === tab.id ? 'text-sage-900' : 'text-sage-400 hover:text-sage-600'}`}
                    onClick={() => navigateToTab(tab.id)}
                  >
                    <tab.icon size={16} /> {tab.label}
                  </button>
                ))}
              </div>

              <div className="site-nav-actions flex flex-1 flex-wrap items-center justify-end gap-3">
              {user ? (
                <div className="rounded-3xl border border-sage-200 bg-white px-4 py-2 text-right text-xs font-extrabold text-sage-950 shadow-lift">
                  <p>{user.displayName || user.email}</p>
                  <p className="text-sage-500">{cloudStatus}</p>
                </div>
              ) : (
                <div className="rounded-3xl border border-sage-200 bg-white px-4 py-2 text-xs font-extrabold text-sage-950 shadow-lift">
                  {authLoading ? 'Checking login...' : 'Sign in to sync your private entries'}
                </div>
              )}
              {user ? (
                <button className="rounded-full border border-sage-200 bg-white/80 px-5 py-3 text-sm font-bold text-sage-800 shadow-lift transition hover:-translate-y-1 hover:bg-white" onClick={handleSignOut} type="button">
                  Sign out
                </button>
              ) : (
                <button className="rounded-full border border-sage-200 bg-white/80 px-5 py-3 text-sm font-bold text-sage-800 shadow-lift transition hover:-translate-y-1 hover:bg-white" onClick={signInWithGoogle} disabled={authLoading} type="button">
                  Sign in with Google
                </button>
              )}
              <button className={`rounded-full border px-5 py-3 text-sm font-bold shadow-lift transition hover:-translate-y-1 ${comfortMode ? 'border-sage-800 bg-sage-900 text-white' : 'border-sage-200 bg-white/80 text-sage-800 hover:bg-white'}`} onClick={() => setComfortMode(!comfortMode)} type="button">
                Comfort mode
              </button>
              {hasPin && (
                <button className="rounded-full border border-sage-200 bg-white/80 px-5 py-3 text-sm font-bold text-sage-800 shadow-lift transition hover:-translate-y-1 hover:bg-white" onClick={() => setPinSettingsOpen(true)} type="button">
                  Manage lock
                </button>
              )}
              <button className="rounded-full border border-sage-200 bg-white/80 px-5 py-3 text-sm font-bold text-sage-800 shadow-lift transition hover:-translate-y-1 hover:bg-white" onClick={() => setLocked(true)} type="button">
                {hasPin ? 'Lock space' : 'Set lock'}
              </button>
            </div>
          </div>
          <div className="site-nav-links mt-4 hidden flex-wrap gap-2 border-t border-sage-100/80 pt-4 lg:flex">
            <a className="rounded-full border border-sage-200 bg-white/95 px-4 py-2 text-sm font-extrabold text-sage-950 transition hover:-translate-y-0.5 hover:border-sage-300 hover:bg-white" href="#journal" onClick={() => navigateToTab('write')}>Journal</a>
            <button className="rounded-full border border-sage-200 bg-white/95 px-4 py-2 text-sm font-extrabold text-sage-950 transition hover:-translate-y-0.5 hover:border-sage-300 hover:bg-white" onClick={() => setCustomizerOpen(true)} type="button">Design</button>
            <a className="rounded-full border border-sage-200 bg-white/95 px-4 py-2 text-sm font-extrabold text-sage-950 transition hover:-translate-y-0.5 hover:border-sage-300 hover:bg-white" href="#about" onClick={() => openHomeSection('about')}>About</a>
            <a className="rounded-full border border-sage-200 bg-white/95 px-4 py-2 text-sm font-extrabold text-sage-950 transition hover:-translate-y-0.5 hover:border-sage-300 hover:bg-white" href="#resources" onClick={() => openHomeSection('resources')}>Resources</a>
            <a className="rounded-full border border-sage-200 bg-white/95 px-4 py-2 text-sm font-extrabold text-sage-950 transition hover:-translate-y-0.5 hover:border-sage-300 hover:bg-white" href="#articles" onClick={() => openHomeSection('articles')}>Articles</a>
            <a className="rounded-full border border-sage-200 bg-white/95 px-4 py-2 text-sm font-extrabold text-sage-950 transition hover:-translate-y-0.5 hover:border-sage-300 hover:bg-white" href="#tips" onClick={() => openHomeSection('tips')}>Tips</a>
            <a className="rounded-full border border-sage-200 bg-white/95 px-4 py-2 text-sm font-extrabold text-sage-950 transition hover:-translate-y-0.5 hover:border-sage-300 hover:bg-white" href="#privacy" onClick={() => openHomeSection('privacy')}>Privacy</a>
            <a className="rounded-full border border-sage-200 bg-white/95 px-4 py-2 text-sm font-extrabold text-sage-950 transition hover:-translate-y-0.5 hover:border-sage-300 hover:bg-white" href="#terms" onClick={() => openHomeSection('terms')}>Terms</a>
            <a className="rounded-full border border-sage-200 bg-white/95 px-4 py-2 text-sm font-extrabold text-sage-950 transition hover:-translate-y-0.5 hover:border-sage-300 hover:bg-white" href="#contact" onClick={() => openHomeSection('contact')}>Contact</a>
          </div>
        </div>
      </nav>

      {activeTab === 'home' && activeHomeSection === 'overview' && (
      <section id="home" className="mx-auto grid max-w-7xl gap-8 px-6 pb-10 pt-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <div className="rounded-[2rem] border border-white/80 bg-white/78 p-8 shadow-soft backdrop-blur-xl lg:p-10">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-sage-100 px-4 py-2 text-sm font-bold text-sage-800 shadow-sm">
              <Sparkles size={17} /> Today can be held softly
            </div>
            <h1 className="max-w-3xl font-display text-5xl font-bold leading-[0.96] tracking-tight text-sage-950 md:text-6xl">Private online diary and mood journal for brighter, gentler thoughts.</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-sage-800">Write in a calm digital diary, track your mood, and keep each entry private with an optional lock PIN.</p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a className="inline-flex items-center gap-2 rounded-full bg-sage-900 px-5 py-3 text-sm font-extrabold text-white shadow-lift transition hover:-translate-y-1 hover:bg-sage-800" href="#journal" onClick={() => navigateToTab('write')}>
                <PenLine size={17} /> Write today’s entry
              </a>
              <button className="inline-flex items-center gap-2 rounded-full border border-sage-200 bg-white px-5 py-3 text-sm font-extrabold text-sage-900 shadow-sm transition hover:-translate-y-1 hover:border-sage-300 hover:bg-sage-50" onClick={() => setCustomizerOpen(true)} type="button">
                <Palette size={17} /> Open design studio
              </button>
              {hasPin && (
                <button className="inline-flex items-center gap-2 rounded-full border border-sage-200 bg-white px-5 py-3 text-sm font-extrabold text-sage-900 shadow-sm transition hover:-translate-y-1 hover:border-sage-300 hover:bg-sage-50" onClick={() => setPinSettingsOpen(true)} type="button">
                  <Shield size={17} /> Privacy settings
                </button>
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-3 text-sm font-semibold text-sage-800">
              <div className="inline-flex items-center gap-2 rounded-full border border-sage-100 bg-white/85 px-4 py-2">
                <ShieldCheck size={16} /> {hasPin ? 'Protected with a private PIN' : 'Add a soft lock any time'}
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-sage-100 bg-white/85 px-4 py-2">
                <BookOpen size={16} /> {entries.length} reflection{entries.length === 1 ? '' : 's'} saved
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-sage-100 bg-white/85 px-4 py-2">
                <Sparkles size={16} /> {user ? cloudStatus : 'Local-first journaling mode'}
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard icon={BookOpen} label="Entries" value={entries.length} tone="bg-sage-100 text-sage-800" />
              <StatCard icon={Sunrise} label="Current streak" value={`${streak} day${streak === 1 ? '' : 's'}`} tone="bg-sand-100 text-sand-500" />
              <StatCard icon={HeartHandshake} label="Average mood" value={averageMood} tone="bg-teal-100 text-teal-700" />
              <StatCard icon={Sparkles} label="Reward level" value={`${rewardLevel.emoji} ${rewardLevel.title}`} tone="bg-rose-50 text-rose-700" />
            </div>
          </div>
        </div>

        <aside className="flex flex-col gap-4 lg:col-span-4">
          <div className="rounded-[1.75rem] border border-white/80 bg-white/72 p-4 shadow-soft backdrop-blur-xl">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-sage-500">Move around gently</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {[
                { id: 'write', label: 'Write', detail: 'Start with one line', icon: PenLine, tone: 'bg-sage-100 text-sage-800' },
                { id: 'memories', label: 'Memories', detail: 'Open past pages', icon: BookOpen, tone: 'bg-sand-100 text-sand-600' },
                { id: 'insights', label: 'Insights', detail: 'See your patterns', icon: Sparkles, tone: 'bg-teal-100 text-teal-700' }
              ].map((tab) => (
                <button key={tab.id} className="flex items-center gap-3 rounded-2xl border border-sage-100 bg-white/90 px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-sage-200 hover:bg-white" onClick={() => navigateToTab(tab.id)} type="button">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl shadow-sm ${tab.tone}`}>
                    <tab.icon size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-sage-950">{tab.label}</p>
                    <p className="text-xs text-sage-600">{tab.detail}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="quote-card quote-card-premium quote-card-compact flex flex-col rounded-3xl border border-white/70 p-6 shadow-soft lg:p-7">
            <Quote className="mb-6 opacity-80" size={30} />
            <p className="quote-main-text font-bold leading-tight" style={{ fontFamily: activeQuoteFont, fontSize: Math.max(activeQuoteSize - 4, 28), color: quoteStyle.textColor, lineHeight: 1.4 }}>“{quoteLibrary[quoteIndex % quoteLibrary.length]}”</p>
            <button className="quote-button mt-6 rounded-full bg-white px-5 py-3 text-sm font-extrabold shadow-lift transition hover:-translate-y-1 hover:bg-sage-50" onClick={() => setQuoteIndex((quoteIndex + 1) % quoteLibrary.length)}>
              Another calming quote
            </button>

            <div className="totoro-container totoro-container-compact group">
              {companion.rainEnabled && (
                <>
                  <div className="rain-drop" style={{ left: '10%', animationDelay: '0s' }}></div>
                  <div className="rain-drop" style={{ left: '25%', animationDelay: '0.4s' }}></div>
                  <div className="rain-drop" style={{ left: '40%', animationDelay: '0.2s' }}></div>
                  <div className="rain-drop" style={{ left: '60%', animationDelay: '0.8s' }}></div>
                  <div className="rain-drop" style={{ left: '75%', animationDelay: '0.6s' }}></div>
                  <div className="rain-drop" style={{ left: '90%', animationDelay: '1s' }}></div>
                </>
              )}
              
              {companion.sootSpritesEnabled && (
                <>
                  <div className="soot-sprite" style={{ left: '15%', animationDelay: '0s' }}>●</div>
                  <div className="soot-sprite" style={{ right: '20%', animationDelay: '0.7s' }}>●</div>
                </>
              )}
              
              <div className="totoro-companion-wrap relative" style={{ fontSize: `${companion.size}px`, lineHeight: 1 }}>
                {companion.leaf && !companionIsUploadedMedia && <div className="totoro-leaf pointer-events-none" style={{ fontSize: `${companion.size * 0.5}px` }}>{companion.leaf}</div>}
                <div
                  ref={companionMediaRef}
                  className={`companion-media-frame cursor-pointer ${companionSelected ? 'is-selected' : ''}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    setCompanionSelected(true);
                  }}
                  style={{
                    width: `${companionFrameWidth}px`,
                    height: `${companionFrameHeight}px`,
                    transform: `translate3d(${companion.x || 0}px, ${companion.y || 0}px, 0)`
                  }}
                >
                  <div className={`companion-visual companion-${companion.animation}`}>
                    {companionIsVideo ? (
                      <video
                        autoPlay
                        className="companion-video"
                        loop
                        muted
                        playsInline
                        src={companion.character}
                        style={{ width: '100%', height: '100%' }}
                      />
                    ) : companion.character?.startsWith('data:') || companion.character?.startsWith('http') ? (
                      <img src={companion.character} alt="Companion" className="companion-img" style={{ width: '100%', height: '100%' }} draggable="false" />
                    ) : (
                      <div className={`totoro companion-${companion.animation}`}>{companion.character}</div>
                    )}
                  </div>
                  {companionSelected && (
                    <>
                      <span className="companion-selection-border" />
                      <span className="companion-handle companion-handle-tl" data-resize-handle="tl" />
                      <span className="companion-handle companion-handle-tm" data-resize-handle="tm" />
                      <span className="companion-handle companion-handle-tr" data-resize-handle="tr" />
                      <span className="companion-handle companion-handle-ml" data-resize-handle="ml" />
                      <span className="companion-handle companion-handle-mr" data-resize-handle="mr" />
                      <span className="companion-handle companion-handle-bl" data-resize-handle="bl" />
                      <span className="companion-handle companion-handle-bm" data-resize-handle="bm" />
                      <span className="companion-handle companion-handle-br" data-resize-handle="br" />
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </aside>
      </section>
      )}

      {activeTab === 'home' && (
      <section className="mx-auto max-w-7xl px-6 py-4">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1">
            <div className="rounded-[2.5rem] border border-sage-100 bg-white p-8 shadow-soft backdrop-blur lg:p-10">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h2 className="font-display text-4xl font-bold leading-tight text-ink lg:text-5xl">{homeSections.find((s) => s.id === activeHomeSection)?.label || 'Overview'}</h2>
                  <p className="mt-4 max-w-2xl text-lg leading-relaxed text-sage-800">{activeHomeSection === 'overview' ? (latestEntry ? `Your last page is still here. ${rewardLevel.next}` : 'This is your quiet corner. One page at a time is enough.') : 'Browse gently. Only one section stays open to keep your screen calm.'}</p>
                </div>
                <a className="inline-flex shrink-0 items-center gap-2 rounded-full bg-sage-900 px-6 py-4 text-sm font-extrabold text-white shadow-lift transition hover:-translate-y-1 hover:bg-sage-800" href="#journal" onClick={() => navigateToTab('write')}>
                  <PenLine size={18} /> Open today’s page
                </a>
              </div>

              <div className="mt-10 grid gap-3 rounded-[2rem] bg-sage-50/70 p-3 sm:grid-cols-2 lg:grid-cols-5">
                {homeSections.map((section) => (
                  <button
                    key={section.id}
                    className={`rounded-[1.5rem] px-5 py-4 text-left transition ${activeHomeSection === section.id ? 'bg-white text-sage-950 shadow-md' : 'text-sage-500 hover:bg-white/60 hover:text-sage-800'}`}
                    onClick={() => openHomeSection(section.id)}
                    type="button"
                  >
                    <div className="flex items-center gap-2 text-sm font-extrabold"><section.icon size={16} /> {section.label}</div>
                  </button>
                ))}
              </div>

              {activeHomeSection === 'overview' && (
              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                <div className="rounded-3xl bg-sage-50/50 p-6 text-center ring-1 ring-sage-100/50">
                  <p className="text-xs font-extrabold uppercase tracking-widest text-sage-500">Streak</p>
                  <p className="mt-2 text-3xl font-extrabold text-ink">{streak} day{streak === 1 ? '' : 's'}</p>
                </div>
                <div className="rounded-3xl bg-rose-50/50 p-6 text-center ring-1 ring-rose-100/50">
                  <p className="text-xs font-extrabold uppercase tracking-widest text-rose-500">This week</p>
                  <p className="mt-2 text-3xl font-extrabold text-ink">{weeklyCheckIns}/{weeklyGoal}</p>
                </div>
                <div className="rounded-3xl bg-sand-50/50 p-6 text-center ring-1 ring-sand-100/50">
                  <p className="text-xs font-extrabold uppercase tracking-widest text-sand-500">Reward</p>
                  <p className="mt-2 text-3xl font-extrabold text-ink">{rewardLevel.emoji}</p>
                </div>
              </div>
              )}
            </div>
          </div>

          <aside className="lg:w-[320px] xl:w-[360px] lg:sticky lg:top-28">
            <div className="rounded-[2.5rem] border border-white/80 bg-white/70 p-6 shadow-soft backdrop-blur-xl">
              <div className="flex items-center gap-4 border-b border-sage-100 pb-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sage-100 text-sage-800 shadow-sm">
                  <WeatherGlyph mood={weatherOptions.find((item) => item.label === selectedMood) || moods[2]} size="text-xl" />
                </div>
                <div>
                  <p className="text-sm font-extrabold text-ink">Today’s focus</p>
                  <p className="text-xs font-semibold text-sage-600">{selectedMood} mood</p>
                </div>
              </div>
              
              <div className="py-6">
                <p className="text-lg font-bold leading-relaxed text-ink italic opacity-90">“You do not need to finish the whole story today.”</p>
                <p className="mt-4 text-sm leading-7 text-sage-800">Keep a detail, a feeling, or one tiny memory. The rest can wait for you another day.</p>
              </div>

              <div className="grid gap-2 border-t border-sage-100 pt-5">
                <button className="flex items-center justify-between rounded-2xl bg-white/80 px-5 py-4 text-sm font-extrabold text-sage-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-white" onClick={() => navigateToTab('memories')} type="button">
                  <span className="inline-flex items-center gap-2"><BookOpen size={16} /> Memories</span>
                  <span className="opacity-50">{entries.length}</span>
                </button>
                <button className="flex items-center justify-between rounded-2xl bg-white/80 px-5 py-4 text-sm font-extrabold text-sage-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-white" onClick={() => navigateToTab('insights')} type="button">
                  <span className="inline-flex items-center gap-2"><CalendarDays size={16} /> Insights</span>
                  <span className="opacity-50">{weeklyCheckIns}/{weeklyGoal}</span>
                </button>
              </div>
            </div>
          </aside>
        </div>
      </section>
      )}

      <ThemeStudio
        companion={companion}
        customColor={customColor}
        customWeatherEmoji={customWeatherEmoji}
        customWeatherImage={customWeatherImage}
        customWeatherName={customWeatherName}
        customWeathers={customWeathers}
        isOpen={customizerOpen}
        journalStyle={journalStyle}
        onAtmosphereApply={applyJournalAtmosphere}
        onAddCustomWeather={addCustomWeather}
        onClose={() => setCustomizerOpen(false)}
        onCompanionChange={setCompanion}
        onCustomColorChange={setCustomColor}
        onCustomWeatherEmojiChange={setCustomWeatherEmoji}
        onCustomWeatherImageUpload={handleWeatherImageUpload}
        onCustomWeatherNameChange={setCustomWeatherName}
        onDeleteCustomWeather={deleteCustomWeather}
        onDesignChange={setSelectedDesign}
        onQuoteBgChange={setQuoteBg}
        onThemeChange={setSelectedTheme}
        quoteBg={quoteBg}
        quoteStyle={quoteStyle}
        selectedDesign={selectedDesign}
        selectedTheme={selectedTheme}
      />

      <PinSettingsDialog
        isOpen={pinSettingsOpen}
        onChangePin={changePin}
        onClose={() => setPinSettingsOpen(false)}
        onRemovePin={removePin}
      />

      <section id="journal" className="relative z-10 mx-auto -mt-2 max-w-7xl px-6 py-8 lg:-mt-6">
        <div className="mb-6 rounded-[2rem] border border-white/85 bg-white/82 p-3 shadow-soft backdrop-blur xl:p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-sage-600">Choose a space</p>
              <h2 className="mt-2 text-2xl font-extrabold text-ink">Keep writing, memories, and insights separate.</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-sage-700">Only one main page stays open at a time, so the screen feels calmer on mobile.</p>
            </div>
            <div className="grid gap-2 rounded-[1.5rem] bg-sage-50/90 p-2 sm:grid-cols-3">
              {[
                { id: 'write', label: 'Write', detail: 'Start here', icon: PenLine },
                { id: 'memories', label: 'Memories', detail: `${entries.length} saved`, icon: BookOpen },
                { id: 'insights', label: 'Insights', detail: 'Patterns', icon: Sparkles }
              ].map((tab) => (
                <button
                  key={tab.id}
                  className={`rounded-[1.2rem] px-4 py-3 text-left transition ${activeTab === tab.id ? 'bg-white text-sage-950 shadow-sm' : 'text-sage-500 hover:bg-white/75 hover:text-sage-800'}`}
                  onClick={() => navigateToTab(tab.id)}
                  type="button"
                >
                  <div className="flex items-center gap-2 text-sm font-extrabold"><tab.icon size={15} /> {tab.label}</div>
                  <p className="mt-1 text-xs font-semibold">{tab.detail}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {activeTab === 'write' && (
        <form className="rounded-[2rem] border border-white/85 bg-white/90 p-6 shadow-soft backdrop-blur xl:p-8" onSubmit={saveEntry}>
          <div className="mb-5 rounded-[1.75rem] border border-sage-100 bg-gradient-to-r from-white via-sage-50/60 to-sand-50/70 p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-sm font-extrabold uppercase tracking-[0.22em] text-sage-600">Your safe page</p>
                <h2 className="mt-2 text-3xl font-extrabold text-ink">Write only what feels ready.</h2>
                <p className="mt-2 text-sm leading-7 text-sage-700">There is no right amount here. Start with a title, one feeling, or a single honest line.</p>
              </div>
              <div className="inline-flex items-center gap-2 self-start rounded-full border border-sage-100 bg-white px-4 py-2 text-sm font-bold text-sage-700 shadow-sm">
                <CalendarDays size={16} /> {formatDate(new Date().toISOString())}
              </div>
            </div>
          </div>

          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <label className="block text-sm font-bold text-sage-800" htmlFor="entry-title">A name for this page</label>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-sage-500">Optional — even a few words is enough</p>
          </div>
          <input
            className="journal-title-input mb-5 w-full rounded-[1.75rem] px-5 py-4 text-lg font-semibold outline-none"
            id="entry-title"
            onChange={(event) => setTitle(event.target.value)}
            placeholder="A quiet name for this moment"
            value={title}
          />

          <div className="mb-4 rounded-[1.6rem] border border-amber-100/80 bg-white/70 p-3 shadow-sm backdrop-blur-sm">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[31rem]">
                <label className="block text-xs font-extrabold uppercase tracking-[0.22em] text-sage-600">
                  Mood
                  <select className="mt-2 w-full rounded-2xl border border-amber-100 bg-white/90 px-3 py-2.5 text-sm font-semibold text-ink outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100/70" onChange={(event) => setSelectedMood(event.target.value)} value={selectedMood}>
                    {weatherOptions.map((mood) => (
                      <option key={mood.label} value={mood.label}>{mood.label}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-extrabold uppercase tracking-[0.22em] text-sage-600">
                  Font
                  <select className="mt-2 w-full rounded-2xl border border-amber-100 bg-white/90 px-3 py-2.5 text-sm font-semibold text-ink outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100/70" onChange={(event) => setJournalStyle({ ...journalStyle, fontId: event.target.value })} value={journalStyle.fontId}>
                    {journalFontOptions.map((font) => (
                      <option key={font.id} value={font.id}>{font.label}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-extrabold uppercase tracking-[0.22em] text-sage-600">
                  Size
                  <select className="mt-2 w-full rounded-2xl border border-amber-100 bg-white/90 px-3 py-2.5 text-sm font-semibold text-ink outline-none transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100/70" onChange={(event) => setJournalStyle({ ...journalStyle, sizeId: event.target.value })} value={journalStyle.sizeId}>
                    {journalSizeOptions.map((size) => (
                      <option key={size.id} value={size.id}>{size.label}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                <button className="rounded-full bg-white px-3.5 py-2 text-sm font-bold text-sage-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-sage-50" onClick={() => toggleBulletList(entryBodyRef, setBody)} title="Bullet points" type="button">List</button>
                {quickEmojis.slice(0, 6).map((emoji) => (
                  <button key={emoji} className="rounded-full bg-white px-3 py-1.5 text-base shadow-sm transition hover:-translate-y-0.5 hover:bg-sage-50" onClick={() => insertQuickEmoji(emoji)} type="button">
                    {emoji}
                  </button>
                ))}
                <label className="flex cursor-pointer items-center gap-2 rounded-full bg-sage-800 px-3.5 py-2 text-sm font-extrabold text-white shadow-lift transition hover:-translate-y-0.5 hover:bg-sage-700">
                  <ImagePlus size={14} /> Photo
                  <input accept="image/*" className="hidden" onChange={handleEntryImageUpload} type="file" />
                </label>
              </div>
            </div>
          </div>

          <div className="journal-editor-shell mt-2 rounded-[2rem] p-3 md:p-4">
            <div className="journal-editor-ribbon">quiet diary</div>
            <div className="journal-editor-meta mb-3 flex flex-wrap items-center justify-end gap-2 px-3 text-xs font-bold uppercase tracking-[0.24em] text-sage-500">
              <span>{selectedMood} mood · {formatDate(new Date().toISOString())}</span>
            </div>
            <div
              ref={entryBodyRef}
              className="journal-editor journal-editor-soft min-h-[30rem] w-full overflow-auto rounded-[1.75rem] px-6 py-6 outline-none"
              contentEditable
              suppressContentEditableWarning
              style={{ fontFamily: activeJournalFont, fontSize: activeJournalSize, lineHeight: 1.95, color: '#24312e', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
              onInput={(e) => setBody(e.currentTarget.innerHTML)}
              data-placeholder=""
            />
          </div>
          <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="rounded-full border border-sage-100 bg-white px-4 py-2 text-sm font-semibold text-sage-700 shadow-sm">
              Start anywhere — the page is ready when you are.
            </div>
            <button className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-7 py-4 font-bold text-white shadow-lift transition hover:-translate-y-1 hover:bg-sage-800" type="submit">
              <Plus size={19} /> Keep this page
            </button>
          </div>

          <div className="mt-6 rounded-[1.75rem] bg-gradient-to-r from-sage-50 via-white to-sand-50 p-6 shadow-inner ring-1 ring-white/70">
            <div className="grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <div className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-sage-700"><Feather size={16} /> Gentle prompt</div>
                <p className="max-w-2xl font-display text-2xl font-bold leading-relaxed text-sage-950">{activePrompt}</p>
                <p className="mt-3 text-sm font-semibold text-sage-700">Take what helps, skip the rest, and answer only the part that feels kind to say.</p>
                <button className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-extrabold text-sage-900 shadow-lift transition hover:-translate-y-1 hover:bg-sage-50" onClick={() => setActivePrompt(prompts[(prompts.indexOf(activePrompt) + 1) % prompts.length])} type="button">
                  <Sparkles size={15} /> New prompt
                </button>
              </div>

              <div className="flex flex-col gap-4 lg:col-span-5">
                <div className="rounded-3xl bg-white/75 p-4 shadow-sm ring-1 ring-sage-100/70">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-sage-500">Today's little joys</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {quickEmojis.slice(0, 8).map((emoji) => (
                      <button
                        key={emoji}
                        className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-xl shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:ring-2 hover:ring-sage-200"
                        onClick={() => addStarterLine(emoji)}
                        type="button"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  <p className="mt-3 text-[11px] font-bold text-sage-600">Tap to add a small spark to your entry.</p>
                </div>

                <div className="rounded-3xl bg-white/75 p-4 shadow-sm ring-1 ring-sage-100/70">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-sage-500">Small ways to begin</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {['What happened today', 'One good thing'].map((starter) => (
                      <button key={starter} className="rounded-full border border-sage-100 bg-white px-3.5 py-2 text-sm font-bold text-sage-700 transition hover:-translate-y-0.5 hover:border-sage-200 hover:bg-sage-50" onClick={() => addStarterLine(starter)} type="button">
                        {starter}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-[1.75rem] bg-gradient-to-br from-sage-900 via-sage-800 to-sage-700 p-5 text-white shadow-soft">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-white/70">Quiet snapshot</p>
                      <h3 className="mt-2 text-xl font-extrabold leading-tight">Your page is already becoming a little archive.</h3>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-2xl shadow-inner">{rewardLevel.emoji}</div>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-white/10 p-3 backdrop-blur">
                      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/60">Pages kept</p>
                      <p className="mt-2 text-2xl font-extrabold">{entries.length}</p>
                    </div>
                    <div className="rounded-2xl bg-white/10 p-3 backdrop-blur">
                      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/60">Soft streak</p>
                      <p className="mt-2 text-2xl font-extrabold">{streak}</p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-white/80">{weeklyCheckIns >= weeklyGoal ? 'This week already has enough gentle attention in it.' : `${weeklyGoal - weeklyCheckIns} more check-in${weeklyGoal - weeklyCheckIns === 1 ? '' : 's'} if you want to fill this week softly.`}</p>
                  <button className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-extrabold text-sage-900 shadow-lift transition hover:-translate-y-0.5 hover:bg-sage-50" onClick={() => navigateToTab('memories')} type="button">
                    <BookOpen size={15} /> Visit your memories
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(260px,0.85fr)] xl:grid-cols-[1.3fr_0.9fr]">
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-3xl border border-sage-100 bg-white p-5 shadow-sm lg:col-span-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-widest text-sage-600">Soft landing</p>
                    <h3 className="mt-2 text-xl font-extrabold text-ink">Three gentle ways in</h3>
                  </div>
                  <div className="rounded-full bg-sage-100 px-3 py-2 text-sm font-extrabold text-sage-800">{completedQuestCount}/3 felt natural</div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {journalQuest.map((step) => (
                    <div key={step.label} className={`rounded-full px-4 py-2 text-sm font-bold transition ${step.done ? 'bg-sage-900 text-white shadow-lift' : 'border border-sage-100 bg-sage-50 text-sage-700'}`}>
                      {step.done ? '✓' : '○'} {step.label}
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-sm font-semibold leading-7 text-sage-800">{journalNudge}</p>
              </div>
              <div className="rounded-3xl border border-sage-100 bg-gradient-to-br from-sand-50 to-white p-5 shadow-sm">
                <p className="text-xs font-extrabold uppercase tracking-widest text-sand-500">This week so far</p>
                <p className="mt-2 text-3xl font-extrabold text-sage-950">{weeklyCheckIns}/{weeklyGoal}</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-sage-700">{weeklyCheckIns >= weeklyGoal ? 'You already gave yourself enough room this week.' : `${weeklyGoal - weeklyCheckIns} more soft check-in${weeklyGoal - weeklyCheckIns === 1 ? '' : 's'} if you want to fill this week.`}</p>
              </div>
              <div className="rounded-3xl border border-sage-100 bg-gradient-to-br from-rose-50 to-white p-5 shadow-sm">
                <p className="text-xs font-extrabold uppercase tracking-widest text-rose-500">Keepsake path</p>
                <p className="mt-2 text-3xl font-extrabold text-sage-950">{rewardLevel.emoji}</p>
                <p className="mt-2 text-base font-extrabold text-sage-900">{entriesToNextReward === 0 ? 'Your next bloom is already here.' : `${entriesToNextReward} more ${entriesToNextReward === 1 ? 'page' : 'pages'} until the next bloom.`}</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-sage-700">A few honest pages slowly turn into a quiet little collection.</p>
              </div>
              <div className="rounded-3xl border border-sage-100 bg-gradient-to-br from-sage-50 to-white p-5 shadow-sm">
                <p className="text-xs font-extrabold uppercase tracking-widest text-sage-500">{returnRitual.eyebrow}</p>
                <p className="mt-2 text-xl font-extrabold text-sage-950">{returnRitual.title}</p>
                <p className="mt-3 text-sm leading-7 text-sage-700">{returnRitual.text}</p>
                <p className="mt-3 text-xs font-bold uppercase tracking-[0.24em] text-sage-500">{latestEntry ? `${latestEntry.mood} mood kept nearby` : 'A gentle habit can start today'}</p>
              </div>
              <div className="rounded-3xl border border-sage-100 bg-white p-5 shadow-sm lg:col-span-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-widest text-sage-600">Keepsake shelf</p>
                    <h3 className="mt-2 text-xl font-extrabold text-ink">{unlockedAchievementCount}/{achievementBadges.length} keepsakes collected</h3>
                    <p className="mt-2 text-sm leading-6 text-sage-700">Little keepsakes make the page feel alive without turning your writing into homework.</p>
                  </div>
                  <div className="rounded-full bg-sage-100 px-4 py-2 text-sm font-extrabold text-sage-800">Next: {nextAchievement.emoji} {nextAchievement.title}</div>
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {achievementBadges.map((badge) => (
                    <div key={badge.id} className={`rounded-[1.5rem] border p-4 transition ${badge.unlocked ? 'border-sage-200 bg-sage-50 shadow-sm' : 'border-sage-100 bg-white'}`}>
                      <div className="flex items-start gap-3">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ${badge.unlocked ? 'bg-white shadow-sm' : 'bg-sage-50 opacity-70'}`}>{badge.emoji}</div>
                        <div>
                          <p className="text-base font-extrabold text-ink">{badge.title}</p>
                          <p className="mt-1 text-sm leading-6 text-sage-700">{badge.hint}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <aside className="flex flex-col gap-6 lg:sticky lg:top-28 lg:self-start">
              <div className="group relative overflow-hidden rounded-[2rem] border border-white/80 bg-gradient-to-br from-white/95 to-white/75 p-6 shadow-lift backdrop-blur transition duration-300 hover:shadow-soft">
                <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-sage-50/50 blur-2xl group-hover:bg-sage-100/60"></div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-sage-600">Atmosphere</p>
                <div className="mt-5 flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-white text-3xl shadow-soft transition group-hover:scale-110">
                    <WeatherGlyph mood={weatherOptions.find((item) => item.label === selectedMood) || moods[2]} size="text-2xl" />
                  </div>
                  <div>
                    <p className="text-xl font-extrabold text-ink">{selectedMood}</p>
                    <p className="text-sm font-semibold text-sage-700">Matching your energy today.</p>
                  </div>
                </div>
                <p className="mt-5 text-sm leading-7 text-sage-700">{latestEntry ? `Continuing "${latestEntry.title}".` : 'Ready for your first detail.'}</p>
              </div>

              <div className="rounded-[2rem] border border-white/80 bg-white/78 p-6 shadow-soft backdrop-blur-xl">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-rose-600">Journey progress</p>
                <div className="mt-5 flex items-start gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.5rem] bg-rose-50 text-3xl shadow-sm ring-4 ring-rose-50/50">{nextAchievement.emoji}</div>
                  <div>
                    <p className="text-lg font-extrabold text-ink">{nextAchievement.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-sage-700">{nextAchievement.hint}</p>
                  </div>
                </div>
                <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-rose-100/50">
                  <div className="h-full bg-rose-400 transition-all duration-700" style={{ width: `${(unlockedAchievementCount / achievementBadges.length) * 100}%` }}></div>
                </div>
                <p className="mt-4 text-[13px] font-bold text-rose-800">{rewardLevel.next}</p>
              </div>

              <div className="rounded-[2rem] border border-white/80 bg-white/95 p-6 shadow-soft">
                <div className="mb-5 flex items-center justify-between">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-sage-600">Soft actions</p>
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sage-50 text-sage-600 shadow-inner">
                    <Compass size={14} />
                  </div>
                </div>
                <div className="grid gap-3">
                  {[
                    { label: 'Name the feeling', icon: Feather, onClick: () => addStarterLine('Today feels'), color: 'text-sage-700' },
                    { label: 'Keep one detail', icon: Sparkles, onClick: () => addStarterLine('A small thing I want to remember'), color: 'text-amber-700' },
                    { label: 'View check-ins', icon: CalendarDays, onClick: () => navigateToTab('insights'), count: importantDateCount, color: 'text-rose-700' }
                  ].map((btn) => (
                    <button key={btn.label} className="group flex items-center justify-between rounded-2xl bg-sage-50/50 px-5 py-3.5 text-left text-sm font-extrabold text-sage-800 ring-1 ring-sage-100/50 transition duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-soft hover:ring-white" onClick={btn.onClick} type="button">
                      <span className={`inline-flex items-center gap-3 ${btn.color}`}><btn.icon size={17} /> {btn.label}</span>
                      {btn.count !== undefined && <span className="rounded-full bg-white px-2 py-0.5 text-[10px] shadow-inner">{btn.count}</span>}
                    </button>
                  ))}
                </div>
                <p className="mt-5 border-t border-sage-100 pt-5 text-sm leading-relaxed text-sage-700 italic">"You do not need to finish the whole story today."</p>
              </div>
            </aside>
          </div>
          {saveReward && (
            <div className="reward-toast mt-5 rounded-3xl border border-sage-100 bg-sage-900 p-5 font-extrabold leading-7 text-white shadow-soft">
              {saveReward}
            </div>
          )}
        </form>
        )}

        {activeTab === 'insights' && (
        <div className="mt-6 grid gap-6 xl:grid-cols-3">
          <div className="rounded-3xl border border-white/70 bg-white/82 p-5 shadow-soft backdrop-blur sm:p-6 lg:col-span-3 lg:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-sage-600 sm:text-sm sm:tracking-widest">Reflection pattern</p>
                <h2 className="mt-2 text-2xl font-extrabold leading-tight text-ink sm:text-3xl">Your recent journal check-ins</h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-sage-700">This page now keeps the title in its own block first, so the chart starts lower and feels easier to read on mobile.</p>
              </div>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sage-100 text-sage-700">
                <Moon size={18} />
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-white/70 bg-white/80 p-5 shadow-soft backdrop-blur sm:p-6 lg:col-span-2 lg:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-sage-600 sm:text-sm sm:tracking-widest">Mood garden</p>
            <div className="mt-5">
              <MoodChart entries={entries} weatherOptions={weatherOptions} />
            </div>
            <div className="mt-4 rounded-3xl bg-white p-4 text-sm font-bold leading-6 text-sage-900 shadow-inner sm:mt-5 sm:p-5">
              {weeklySummary}
            </div>
          </div>

          <div className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-soft backdrop-blur sm:p-6 lg:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-sand-500 sm:text-sm sm:tracking-widest">This week so far</p>
            <p className="mt-2 text-3xl font-extrabold text-sage-950">{weeklyCheckIns}/{weeklyGoal}</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-sage-700">{weeklyCheckIns >= weeklyGoal ? 'You already gave yourself enough room this week.' : `${weeklyGoal - weeklyCheckIns} more soft check-ins if you want to fill this week.`}</p>
            <div className="mt-6 rounded-3xl bg-white p-4 shadow-inner">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-rose-500 sm:text-sm sm:tracking-widest">Keepsake path</p>
              <div className="mt-3 flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-rose-50 text-3xl shadow-sm">{rewardLevel.emoji}</div>
                <div>
                  <p className="text-lg font-extrabold text-sage-950">{rewardLevel.title}</p>
                  <p className="text-sm font-semibold text-sage-700">{entriesToNextReward === 0 ? 'Your next bloom is here.' : `${entriesToNextReward} pages until the next bloom.`}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-soft backdrop-blur sm:p-6 lg:col-span-3 lg:p-8">
            <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-teal-600 sm:text-sm sm:tracking-widest">{returnRitual.eyebrow}</p>
                <p className="mt-2 text-xl font-extrabold leading-tight text-sage-950">{returnRitual.title}</p>
                <p className="mt-3 text-sm font-semibold leading-relaxed text-sage-700">{returnRitual.text}</p>
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-sage-600">Keepsake shelf</p>
                  <div className="rounded-full bg-sage-100 px-3 py-1 text-[10px] font-extrabold text-sage-800">{unlockedAchievementCount}/{achievementBadges.length}</div>
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {achievementBadges.map((badge) => (
                    <div key={badge.id} className={`flex aspect-square items-center justify-center rounded-2xl text-xl shadow-sm transition-all ${badge.unlocked ? 'bg-white grayscale-0' : 'bg-sage-50/50 opacity-40 grayscale'}`} title={`${badge.title}: ${badge.hint}`}>
                      {badge.emoji}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        )}

        {activeTab === 'memories' && (
        <div className="mt-8 grid gap-6 xl:grid-cols-2">

          <div className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-soft backdrop-blur sm:p-6 lg:p-8">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-sage-600 sm:text-sm sm:tracking-widest">Journal calendar</p>
                <h2 className="mt-1 text-xl font-extrabold text-ink sm:text-2xl">Track your writing days</h2>
              </div>
              <CalendarDays className="text-sage-700" size={18} />
            </div>
            <div className="mb-4 flex items-center justify-between rounded-3xl bg-sage-50 p-3">
              <button className="rounded-full bg-white px-3 py-2 text-sm font-extrabold text-sage-800 shadow-sm" onClick={() => setCalendarMonth(shiftMonthKey(calendarMonth, -1))} type="button">‹</button>
              <p className="font-extrabold text-sage-950">{formatMonthLabel(calendarMonth)}</p>
              <button className="rounded-full bg-white px-3 py-2 text-sm font-extrabold text-sage-800 shadow-sm" onClick={() => setCalendarMonth(shiftMonthKey(calendarMonth, 1))} type="button">›</button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-extrabold uppercase tracking-wider text-sage-500">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <div key={day}>{day}</div>)}
            </div>
            <div className="mt-2 grid grid-cols-7 gap-1">
              {calendarDays.map((day, index) => {
                const dayEntries = day ? entriesByDate[day.dateKey] || [] : [];
                const hasImportantDate = day ? Boolean(importantDates[day.dateKey]) : false;
                const isSelected = day?.dateKey === selectedCalendarDate;
                const isToday = day?.dateKey === todayISO();
                return day ? (
                  <button
                    className={`relative aspect-square rounded-2xl border text-sm font-extrabold transition hover:-translate-y-0.5 ${isSelected ? 'border-sage-800 bg-sage-900 text-white shadow-lift' : isToday ? 'border-sage-300 bg-sage-100 text-sage-900' : 'border-sage-100 bg-white text-sage-800 hover:bg-sage-50'}`}
                    key={day.dateKey}
                    onClick={() => {
                      setSelectedCalendarDate(day.dateKey);
                      setImportanceModalOpen(false);
                    }}
                    type="button"
                  >
                    {day.day}
                    {hasImportantDate && <span className={`absolute right-1.5 top-1.5 text-[10px] ${isSelected ? 'text-sand-100' : 'text-rose-500'}`}>✦</span>}
                    {dayEntries.length > 0 && <span className={`absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${isSelected ? 'bg-white' : 'bg-sage-700'}`} />}
                  </button>
                ) : <div key={`blank-${index}`} />;
              })}
            </div>
            <div className="mt-5 rounded-3xl bg-white p-4 shadow-inner">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-widest text-sage-600">{selectedCalendarDate}</p>
                  <p className="mt-1 text-sm font-semibold text-sage-700">Mark meaningful days and keep one small note with them.</p>
                </div>
                <button className={`rounded-full px-4 py-2 text-sm font-extrabold transition ${selectedImportantDate ? 'bg-rose-100 text-rose-700 hover:bg-rose-200' : 'bg-sage-900 text-white hover:bg-sage-800'}`} onClick={() => toggleImportantDate(selectedCalendarDate)} type="button">
                  {selectedImportantDate ? 'Remove important date' : 'Mark as important'}
                </button>
              </div>
              {selectedImportantDate && (
                <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50/80 p-4">
                  <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-rose-600">Important note</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-sage-800">{selectedImportantDate.note}</p>
                </div>
              )}
              {importanceModalOpen && (
                <div className="mt-4 rounded-2xl border border-sage-100 bg-sage-50/90 p-4">
                  <label className="block text-sm font-bold text-sage-800">
                    Why does this day matter?
                    <textarea
                      className="mt-3 min-h-[96px] w-full rounded-2xl border border-sage-100 bg-white px-4 py-3 font-semibold leading-6 text-sage-900 outline-none transition focus:border-sage-300"
                      maxLength={180}
                      onChange={(event) => setImportanceDraft(event.target.value)}
                      placeholder="Birthday, milestone, hard day, sweet memory..."
                      value={importanceDraft}
                    />
                  </label>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="rounded-full bg-sage-900 px-4 py-2 text-sm font-extrabold text-white transition hover:bg-sage-800" onClick={saveImportantDate} type="button">Save note</button>
                    <button className="rounded-full border border-sage-200 bg-white px-4 py-2 text-sm font-extrabold text-sage-700 transition hover:bg-sage-50" onClick={() => setImportanceModalOpen(false)} type="button">Cancel</button>
                  </div>
                </div>
              )}
              {selectedDateEntries.length ? (
                <div className="mt-4 space-y-3">
                  {selectedDateEntries.map((entry) => (
                    <button className="w-full rounded-2xl border border-sage-100 bg-sage-50 p-3 text-left transition hover:bg-white" key={entry.id} onClick={() => setSelectedEntry(entry)} type="button">
                      <p className="font-extrabold text-sage-950">{entry.title}</p>
                      <p className="mt-1 line-clamp-2 text-sm font-semibold leading-6 text-sage-700">{getPlainTextFromHtml(entry.body || entry.prompt || '') || 'Photo entry'}</p>
                    </button>
                  ))}
                </div>
              ) : <p className="mt-4 text-sm font-semibold leading-6 text-sage-700">No entry for this date yet. Pick this day as your next little check-in.</p>}
            </div>
          </div>

          <div className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-soft backdrop-blur sm:p-6 lg:p-8">
            <div className="mb-5 flex items-center gap-3">
              <CalendarDays className="text-sage-700" size={18} />
              <h2 className="text-xl font-extrabold text-ink sm:text-2xl">Your positivity archive</h2>
            </div>
            <div className="max-h-96 space-y-4 overflow-y-auto pr-2">
              {!entries.length && <p className="rounded-3xl bg-white p-5 font-semibold leading-7 text-sage-900 shadow-inner">No entries yet. Start with one sentence if that is all you have today.</p>}
              {entries.map((entry) => {
                const effectiveMoodLabel = { 'Grounded': 'Happy', 'Soft': 'Calm', 'Okay': 'Neutral', 'Heavy': 'Sad', 'Stormy': 'Anxious' }[entry.mood] || entry.mood;
                const mood = weatherOptions.find((item) => item.label === effectiveMoodLabel) || weatherOptions.find(m => m.label === entry.mood) || moods[2];
                return (
                  <article
                    className="group w-full cursor-pointer rounded-3xl border border-sage-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lift"
                    key={entry.id}
                    onClick={() => setSelectedEntry(entry)}
                  >
                    <div className="flex flex-col gap-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2 text-sm font-bold text-sage-700"><WeatherGlyph mood={mood} size="text-base" />{entry.mood} · {formatDate(entry.createdAt)}</div>
                      <h3 className="text-xl font-extrabold leading-tight text-ink">{entry.title}</h3>
                      <p className="mt-3 whitespace-pre-line leading-7 text-sage-800">
                        {(() => {
                          const tempDiv = document.createElement('div');
                          tempDiv.innerHTML = entry.body || entry.prompt || '';
                          const images = tempDiv.querySelectorAll('img');
                          let preview = tempDiv.textContent || tempDiv.innerText || '';
                          if (images.length > 0) preview = '📷 ' + preview;
                          return preview.trim();
                        })()}
                      </p>
                      <div className="mt-5 flex items-center justify-between gap-4 border-t border-sage-50 pt-4">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-sage-500">
                          <span className="rounded-full bg-sage-50 px-3 py-1">Open full page</span>
                          {entry.image && <span className="rounded-full bg-sand-50 px-3 py-1 text-sand-700">Photo saved</span>}
                        </div>
                        <button className="shrink-0 rounded-full p-2 text-sage-300 opacity-60 transition hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100" onClick={(event) => { event.stopPropagation(); deleteEntry(entry.id); }} type="button" aria-label="Delete entry">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
        )}
      </section>

      {activeTab === 'home' && (
      <>
      {activeHomeSection === 'overview' && (
      <section className="mx-auto max-w-7xl px-6 py-4">
        <div className="quote-card quote-card-premium rounded-3xl border border-white/70 p-8 shadow-soft">
          <Quote className="mb-8 opacity-80" size={34} />
          <p className="quote-main-text font-bold leading-tight" style={{ fontFamily: activeQuoteFont, fontSize: activeQuoteSize, color: quoteStyle.textColor, lineHeight: 1.45 }}>“{quoteLibrary[quoteIndex % quoteLibrary.length]}”</p>
          <button className="quote-button mt-8 rounded-full bg-white px-5 py-3 text-sm font-extrabold shadow-lift transition hover:-translate-y-1 hover:bg-sage-50" onClick={() => setQuoteIndex((quoteIndex + 1) % quoteLibrary.length)}>
            Another calming quote
          </button>
        </div>
      </section>
      )}

      {activeHomeSection === 'about' && (
      <section id="about" className="mx-auto max-w-7xl px-6 py-14">
        <SectionHeader
          eyebrow="About Quiet Journal Journey"
          title="A private online diary and mood journal for gentle daily reflection."
          text="Quiet Journal Journey is a private online diary built to make journaling feel light, repeatable, and encouraging — one honest entry, mood check-in, or reflection prompt at a time."
        />
        <div className="grid gap-5 md:grid-cols-3">
          <InfoCard icon={Lock} title="Private by design">
            Your entries are saved to your Google-linked account when you sign in, or only in your browser when you do not. Other visitors opening the site will see their own journal, not yours.
          </InfoCard>
          <InfoCard icon={Leaf} title="Calm, minimal rhythm">
            The interface uses soft colors, spacious cards, and tiny prompts so the experience feels more like exhaling than checking off a task.
          </InfoCard>
          <InfoCard icon={Compass} title="Built for daily understanding">
            Mood tracking and prompts help you notice patterns over time, without turning emotions into a scorecard.
          </InfoCard>
          <InfoCard icon={ImagePlus} title="Custom emotions">
            Create custom moods with your own words, emoji, or uploaded images so your check-ins feel personal and expressive.
          </InfoCard>
          <InfoCard icon={Palette} title="A look that fits you">
            Choose color themes, card styles, and quote-card colors. Each visitor can make the space feel like their own.
          </InfoCard>
          <InfoCard icon={HeartHandshake} title="Positive self-awareness">
            The site offers journaling guidance and reflection tools for everyday self-understanding, small wins, and clearer personal direction.
          </InfoCard>
        </div>
      </section>
      )}

      {activeHomeSection === 'guides' && (
      <section id="seo-landing" className="mx-auto max-w-7xl px-6 py-10">
        <SectionHeader
          eyebrow="Gentle journaling guides"
          title="Find the kind of journaling support that fits what you need today."
          text="Some people want a private diary, some want mood tracking, prompts, or a softer daily reflection rhythm. These guides help people choose where to begin."
        />
        <div className="grid gap-5 lg:grid-cols-3">
          {seoLandingBlocks.map((item) => (
            <article className="customizable-card rounded-3xl border border-white/70 bg-white/80 p-6 shadow-lift backdrop-blur transition hover:-translate-y-1 hover:bg-white/95" key={item.title}>
              <div className="rounded-full bg-sage-100 px-3 py-1 text-xs font-extrabold uppercase tracking-widest text-sage-800">Reader guide</div>
              <h3 className="mt-4 text-2xl font-extrabold leading-tight text-ink">{item.title}</h3>
              <p className="mt-4 leading-8 text-sage-800">{item.text}</p>
            </article>
          ))}
        </div>
        <div className="mt-8 rounded-[2rem] border border-white/75 bg-white/80 p-6 shadow-lift backdrop-blur lg:p-8">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-extrabold uppercase tracking-[0.3em] text-sage-700">Keep exploring</p>
              <h3 className="mt-3 text-3xl font-extrabold text-ink">Read the guide that matches the way you want to journal.</h3>
              <p className="mt-3 max-w-3xl leading-8 text-sage-800">Whether you want privacy, mood check-ins, prompts, or a calmer evening reflection, these pages give visitors something useful to read before they begin.</p>
            </div>
            <a className="inline-flex items-center justify-center rounded-full bg-sage-900 px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-sage-800" href="/private-online-diary.html">
              Browse guides
            </a>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {seoGuidePages.map((page) => (
              <article className="rounded-3xl border border-sage-100/80 bg-sand-50/70 p-5" key={page.href}>
                <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-sage-700">{page.label}</p>
                <h4 className="mt-3 text-xl font-extrabold leading-tight text-ink">{page.title}</h4>
                <p className="mt-3 text-sm leading-7 text-sage-800">{page.text}</p>
                <a className="mt-5 inline-flex text-sm font-bold text-sage-900 underline decoration-sage-300 underline-offset-4" href={page.href}>
                  Read page
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>
      )}

      {activeHomeSection === 'resources' && (
      <section id="resources" className="mx-auto max-w-7xl px-6 py-14">
        <SectionHeader
          eyebrow="Positive reflection tools"
          title="Small practices that make journaling easier."
          text="Use these when you want a softer entry, a little gratitude, or a calmer way to close the day."
        />
        <div className="mb-6 grid gap-5 md:grid-cols-2">
          <InfoCard icon={ShieldCheck} title="A clear mind moment">
            Pause before you write: take one slow breath, notice your current state, and choose one word that describes what you want more of today.
          </InfoCard>
          <InfoCard icon={Mail} title="Share the good when you want">
            If a journal entry helps you understand yourself, you can choose to share a positive insight with someone you trust — only if it feels right.
          </InfoCard>
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          {resources.map((resource) => (
            <InfoCard icon={HeartHandshake} title={resource.title} key={resource.title}>
              {resource.text}
            </InfoCard>
          ))}
        </div>
      </section>
      )}

      {activeHomeSection === 'articles' && (
      <section id="articles" className="mx-auto max-w-7xl px-6 py-14">
        <SectionHeader
          eyebrow="Wellness Library"
          title="Original short articles for gentler self-reflection."
          text="These short reflections help visitors begin private journaling with more clarity, kindness, and curiosity."
        />
        <div className="grid gap-5 md:grid-cols-2">
          {wellnessArticles.map((article, index) => (
            <article className="customizable-card rounded-3xl border border-white/70 bg-white/80 p-6 shadow-lift backdrop-blur transition hover:-translate-y-1 hover:bg-white/95" key={article.title}>
              <div className="mb-4 flex items-center justify-between gap-4">
                <span className="rounded-full bg-sage-100 px-3 py-1 text-xs font-extrabold uppercase tracking-widest text-sage-800">Article {index + 1}</span>
                <span className="text-sm font-bold text-sage-600">{article.read}</span>
              </div>
              <h3 className="text-2xl font-extrabold leading-tight text-ink">{article.title}</h3>
              <p className="mt-4 leading-8 text-sage-800">{article.body}</p>
            </article>
          ))}
        </div>
      </section>
      )}

      {activeHomeSection === 'faq' && (
      <section id="faq" className="mx-auto max-w-7xl px-6 py-14">
        <SectionHeader
          eyebrow="Journal FAQ"
          title="Common questions about using a private online diary and mood journal."
          text="This FAQ answers the things people usually want to know before they begin journaling here."
        />
        <div className="grid gap-4 lg:grid-cols-2">
          {seoFaqs.map((item) => (
            <article className="rounded-3xl border border-white/80 bg-white/80 p-6 shadow-lift backdrop-blur" key={item.question}>
              <h3 className="text-xl font-extrabold text-ink">{item.question}</h3>
              <p className="mt-3 leading-7 text-sage-800">{item.answer}</p>
            </article>
          ))}
        </div>
      </section>
      )}

      {activeHomeSection === 'tips' && (
      <section id="tips" className="mx-auto grid max-w-7xl gap-8 px-6 py-14 lg:grid-cols-12">
        <div className="rounded-3xl border border-white/70 bg-gradient-to-br from-sand-100 to-sage-100 p-8 shadow-soft lg:col-span-5 lg:p-10">
          <Newspaper className="mb-7 text-sage-700" size={36} />
          <p className="text-sm font-bold uppercase tracking-widest text-sage-700">Journaling tips</p>
          <h2 className="mt-3 font-display text-5xl font-bold leading-tight text-sage-950">A softer way to start writing.</h2>
          <p className="mt-5 leading-8 text-sage-800">Think of journaling as a conversation with yourself. The goal is not to be profound; it is to be present.</p>
        </div>
        <div className="grid gap-4 lg:col-span-7">
          {tips.map((tip, index) => (
            <div className="flex items-start gap-4 rounded-3xl border border-white/70 bg-white/75 p-5 shadow-lift backdrop-blur" key={tip}>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sage-700 font-bold text-white">{index + 1}</div>
              <p className="pt-2 text-lg font-semibold leading-7 text-sage-900">{tip}</p>
            </div>
          ))}
        </div>
      </section>
      )}

      {activeHomeSection === 'privacy' && (
      <section id="privacy" className="mx-auto max-w-7xl px-6 py-14">
        <SectionHeader
          eyebrow="Privacy Policy"
          title="Your reflections belong to you."
        />
        <div className="grid gap-5 md:grid-cols-2">
          <InfoCard icon={Shield} title="What is stored">
            Journal entries are saved to your Google-linked cloud account when you sign in. If you use the site without signing in, entries, mood choices, custom emotion labels/images, and your optional PIN stay in this browser using local storage.
          </InfoCard>
          <InfoCard icon={Lock} title="What visitors can see">
            Other people who open the website do not see your entries. Their browser creates a separate journal space, and signed-in entries are separated by Google account.
          </InfoCard>
          <InfoCard icon={ShieldCheck} title="Google sign-in">
            Google sign-in is used so your journal can follow you across devices. Your email is used to identify your account and sync your entries.
          </InfoCard>
          <InfoCard icon={FileText} title="Advertising and Google AdSense">
            This site may use Google AdSense to show ads. Google and its partners may use cookies or similar technologies to serve and measure ads based on visits to this and other websites. Visitors can manage ad personalization through Google Ads Settings.
          </InfoCard>
          <InfoCard icon={Mail} title="Contact for privacy questions">
            For privacy questions, feedback, or requests, contact the site owner at atastymealy@gmail.com.
          </InfoCard>
        </div>
      </section>
      )}

      {activeHomeSection === 'terms' && (
      <section id="terms" className="mx-auto grid max-w-7xl gap-8 px-6 py-14 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <div className="sticky top-28 rounded-3xl border border-white/70 bg-white/75 p-8 shadow-soft backdrop-blur">
            <Scale className="mb-7 text-sage-700" size={36} />
            <p className="text-sm font-bold uppercase tracking-widest text-sage-600">Helpful notes</p>
            <h2 className="mt-3 font-display text-5xl font-bold leading-tight text-sage-950">A simple space for personal writing.</h2>
          </div>
        </div>
        <div className="space-y-5 lg:col-span-7">
          <InfoCard icon={HeartHandshake} title="For personal reflection">
            Quiet Journal Journey is made for private journaling, positivity, and everyday self-understanding. Use it as a space to notice your thoughts and what matters to you.
          </InfoCard>
          <InfoCard icon={Sunrise} title="Choose your own pace">
            There is no perfect streak and no pressure to write a lot. A tiny note, a good thing, or one honest sentence is enough.
          </InfoCard>
          <InfoCard icon={PenLine} title="Write what feels useful">
            You can use prompts, skip prompts, write a long entry, or keep it short. The journal is here to help you understand your current state and what you want next.
          </InfoCard>
          <InfoCard icon={Shield} title="Content ownership">
            Your writing remains yours. Signed-in entries are stored under your Google-linked account, while signed-out entries stay in your browser storage.
          </InfoCard>
          <InfoCard icon={FileText} title="Advertising disclosure">
            The site may show third-party ads to support free access. Ad providers may set cookies or use similar technologies according to their own policies.
          </InfoCard>
          <InfoCard icon={Mail} title="Questions about these terms">
            Contact atastymealy@gmail.com if you have questions about the site, privacy, or these terms.
          </InfoCard>
        </div>
      </section>
      )}

      {activeHomeSection === 'contact' && (
      <>
      <section id="contact" className="mx-auto max-w-7xl px-6 py-14">
        <div className="overflow-hidden rounded-3xl border border-white/70 bg-sage-900 text-white shadow-soft">
          <div className="grid lg:grid-cols-2">
            <div className="p-8 lg:p-10">
              <Mail className="mb-7 text-sage-100" size={36} />
              <p className="text-sm font-bold uppercase tracking-widest text-sage-200">Contact</p>
              <h2 className="mt-3 font-display text-5xl font-bold leading-tight">Questions, feedback, or partnership ideas?</h2>
              <p className="mt-5 leading-8 text-sage-100">Send questions, feedback, collaboration ideas, or privacy requests to the site owner. This helps visitors, advertisers, and review teams understand who runs the site.</p>
            </div>
            <div className="bg-white/10 p-8 lg:p-10">
              <div className="rounded-3xl bg-white/95 p-6 text-ink shadow-lift">
                <p className="text-sm font-bold uppercase tracking-widest text-sage-600">Site owner email</p>
                <a className="mt-3 block break-words text-2xl font-extrabold text-sage-900 underline decoration-sage-300 underline-offset-4" href="mailto:atastymealy@gmail.com">
                  atastymealy@gmail.com
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="rounded-3xl border border-dashed border-sage-300 bg-white/60 p-8 text-center shadow-lift backdrop-blur">
          <p className="text-sm font-bold uppercase tracking-widest text-sage-600">Support this project</p>
          <h2 className="mt-3 text-2xl font-extrabold text-ink">Help keep Quiet Journal Journey free and peaceful</h2>
          <p className="mx-auto mt-3 max-w-2xl leading-7 text-sage-700">This space may be supported by gentle, non-intrusive advertising after approval. Ads will stay outside the private writing area so journaling remains calm.</p>
        </div>
      </section>
      </>
      )}

      <footer className="mx-auto max-w-7xl px-6 pb-10 pt-6">
        <div className="rounded-3xl border border-white/70 bg-white/60 p-6 text-center text-sm leading-7 text-sage-700 shadow-lift backdrop-blur">
          <div className="mb-3 flex flex-wrap justify-center gap-4 font-bold text-sage-800">
            <a href="#home" onClick={() => openHomeSection('home')}>Home</a>
            <button onClick={() => setCustomizerOpen(true)} type="button">Design</button>
            <a href="#about" onClick={() => openHomeSection('about')}>About</a>
            <a href="#resources" onClick={() => openHomeSection('resources')}>Resources</a>
            <a href="#articles" onClick={() => openHomeSection('articles')}>Articles</a>
            <a href="#tips" onClick={() => openHomeSection('tips')}>Tips</a>
            <a href="#privacy" onClick={() => openHomeSection('privacy')}>Privacy</a>
            <a href="#terms" onClick={() => openHomeSection('terms')}>Terms</a>
            <a href="#contact" onClick={() => openHomeSection('contact')}>Contact</a>
          </div>
          Quiet Journal Journey is a private positivity journal for noticing your thoughts, collecting small good moments, and understanding what you want next.
        </div>
      </footer>
      </>
      )}

      <div className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-5 gap-2 rounded-3xl border border-sage-100 bg-white/95 p-2 text-xs font-extrabold shadow-soft backdrop-blur lg:hidden">
        {[
          { id: 'home', label: 'Home', icon: Waves },
          { id: 'write', label: 'Write', icon: PenLine },
          { id: 'memories', label: 'Memory', icon: BookOpen },
          { id: 'insights', label: 'Insight', icon: Sparkles },
          { id: 'design', label: 'Design', icon: Palette }
        ].map((tab) => (
          <button
            key={tab.id}
            className={`flex min-w-0 flex-col items-center gap-1 rounded-2xl px-1 py-2 transition ${activeTab === tab.id ? 'bg-sage-900 text-white' : 'text-sage-500 hover:bg-sage-50 hover:text-sage-800'}`}
            onClick={() => {
              if (tab.id === 'design') {
                setCustomizerOpen(true);
              } else if (tab.id === 'home') {
                openHomeSection('home');
              } else {
                navigateToTab(tab.id);
              }
            }}
            type="button"
          >
            <tab.icon size={18} />
            <span className="text-[10px] uppercase tracking-[0.18em]">{tab.label}</span>
          </button>
        ))}
      </div>

      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4 backdrop-blur-sm" onClick={() => { if (!isEditingEntry) setSelectedEntry(null); }}>
          <div className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-7 shadow-soft lg:p-9" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                {isEditingEntry ? (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {weatherOptions.map((mood) => (
                      <button
                        className={`rounded-full px-3 py-1.5 text-sm font-bold transition ${editMood === mood.label ? 'bg-sage-900 text-white' : 'bg-sage-100 text-sage-800 hover:bg-sage-200'}`}
                        key={mood.label}
                        onClick={() => setEditMood(mood.label)}
                        type="button"
                      >
                        <WeatherGlyph mood={mood} size="text-base" /> {mood.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm font-bold uppercase tracking-widest text-sage-600">{selectedEntry.mood} · {formatDate(selectedEntry.createdAt)}</div>
                )}
                {isEditingEntry ? (
                  <input
                    className="w-full rounded-2xl border border-sage-100 bg-sage-50/80 px-4 py-3 text-2xl font-extrabold text-ink outline-none focus:border-sage-400"
                    onChange={(event) => setEditTitle(event.target.value)}
                    value={editTitle}
                  />
                ) : (
                  <h3 className="mt-2 text-3xl font-extrabold text-ink">{selectedEntry.title}</h3>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {!isEditingEntry ? (
                  <button className="rounded-full bg-sage-100 px-4 py-2 text-sm font-extrabold text-sage-900 transition hover:bg-sage-200" onClick={startEditingEntry} type="button">Edit</button>
                ) : (
                  <>
                    <button className="rounded-full bg-sage-100 px-4 py-2 text-sm font-extrabold text-sage-900 transition hover:bg-sage-200" onClick={() => setIsEditingEntry(false)} type="button">Cancel</button>
                    <button className="rounded-full bg-sage-900 px-4 py-2 text-sm font-extrabold text-white transition hover:bg-sage-800" onClick={saveEditedEntry} type="button">Save</button>
                  </>
                )}
                <button className="rounded-full bg-sage-100 px-4 py-2 text-sm font-extrabold text-sage-900 transition hover:bg-sage-200" onClick={() => { setSelectedEntry(null); setIsEditingEntry(false); }} type="button">Close</button>
              </div>
            </div>
            {selectedEntry.prompt && !isEditingEntry && (
              <div className="mb-5 rounded-2xl bg-sage-50 p-4 text-sm font-bold leading-7 text-sage-900">
                Reflection prompt: {selectedEntry.prompt}
              </div>
            )}
            {isEditingEntry ? (
              <>
                <div className="mb-3 flex flex-wrap items-center gap-2 rounded-[1.4rem] border border-amber-100/80 bg-white/75 p-3 shadow-sm backdrop-blur-sm">
                  <button className="rounded-full bg-white px-3.5 py-2 text-sm font-bold text-sage-800 shadow-sm transition hover:bg-sage-50" onClick={() => toggleBulletList(editBodyRef, setEditBody)} title="Bullet points" type="button">List</button>
                  {quickEmojis.slice(0, 6).map((emoji) => (
                    <button key={emoji} className="rounded-full bg-white px-2.5 py-1 text-base shadow-sm transition hover:-translate-y-0.5 hover:bg-sage-50" onClick={() => insertEditQuickEmoji(emoji)} type="button">
                      {emoji}
                    </button>
                  ))}
                  <label className="ml-auto flex cursor-pointer items-center gap-2 rounded-full bg-sage-800 px-3.5 py-2 text-xs font-extrabold text-white shadow-lift transition hover:-translate-y-0.5 hover:bg-sage-700">
                    <ImagePlus size={14} /> Photo
                    <input accept="image/*" className="hidden" onChange={handleEditEntryImageUpload} type="file" />
                  </label>
                </div>
                <div className="journal-editor-shell rounded-[2rem] p-3 md:p-4">
                  <div className="journal-editor-ribbon">quiet diary</div>
                  <div className="journal-editor-meta mb-3 flex flex-wrap items-center justify-end gap-2 px-3 text-xs font-bold uppercase tracking-[0.24em] text-sage-500">
                    <span>{editMood} mood · revisit gently</span>
                  </div>
                  <div
                    ref={editBodyRef}
                    className="journal-editor journal-editor-soft min-h-72 w-full overflow-auto rounded-[1.75rem] px-6 py-6 outline-none"
                    contentEditable
                    suppressContentEditableWarning
                    style={{ fontFamily: activeJournalFont, fontSize: activeJournalSize, lineHeight: 1.95, color: '#24312e', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                    onInput={(e) => setEditBody(e.currentTarget.innerHTML)}
                    data-placeholder=""
                  />
                </div>
              </>
            ) : (
              <div className="text-lg leading-8 text-sage-900">{renderJournalContent(selectedEntry.body || 'No body text was saved for this entry.')}</div>
            )}
          </div>
        </div>
      )}

      <button
        className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-sage-900 text-white shadow-lift transition hover:-translate-y-1 hover:bg-sage-800"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        type="button"
        aria-label="Back to top"
      >
        <ArrowUp size={20} />
      </button>
    </main>
  );
}

export default App;
