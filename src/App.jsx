import React, { useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, setDoc } from 'firebase/firestore';
import { getToken, onMessage } from 'firebase/messaging';
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
import { auth, db, getMessagingIfSupported, googleProvider } from './firebase';

const STORAGE_KEY = 'quiet-harbor-journal-v1';
const PIN_KEY = 'quiet-harbor-pin-v1';
const CUSTOM_WEATHER_STORAGE_KEY = 'quiet-journal-custom-weather-v1';
const CUSTOM_QUOTES_STORAGE_KEY = 'quiet-journal-custom-quotes-v1';
const QUOTE_STYLE_STORAGE_KEY = 'quiet-journal-quote-style-v1';
const JOURNAL_STYLE_STORAGE_KEY = 'quiet-journal-style-v1';
const COMPANION_STORAGE_KEY = 'quiet-journal-companion-v1';
const PLANNER_STORAGE_KEY = 'quiet-journal-planner-v1';
const IMPORTANT_DATES_STORAGE_KEY = 'quiet-journal-important-dates';
const IMPORTANT_DATES_REMINDER_LOG_KEY = 'quiet-journal-important-date-reminder-log-v1';
const CLOUD_PLANNER_DOC_ID = 'plannerBoard';
const CLOUD_IMPORTANT_DATES_DOC_ID = 'importantDates';
const CLOUD_PUSH_NOTIFICATIONS_DOC_ID = 'pushNotifications';
const WEB_PUSH_STATUS_STORAGE_KEY = 'quiet-journal-web-push-status-v1';
const MASTER_ADMIN_EMAIL = 'ngtzewei96@gmail.com';
const SEO_STUDIO_API_KEY_STORAGE_KEY = 'quiet-journal-seo-studio-api-key-v1';
const SEO_STUDIO_PROMPT_STORAGE_KEY = 'quiet-journal-seo-studio-prompt-v1';
const SEO_STUDIO_REPORT_STORAGE_KEY = 'quiet-journal-seo-studio-report-v1';
const SEO_STUDIO_LAST_RUN_STORAGE_KEY = 'quiet-journal-seo-studio-last-run-v1';
const ADMIN_VIEW_MODE_STORAGE_KEY = 'quiet-journal-admin-view-mode-v1';
const DEFAULT_SEO_STUDIO_PROMPT = 'Review the website and suggest the next calm, high-impact SEO improvements for diary, journal, mood journal, and beginner writing searches without harming the user experience.';

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
  { label: 'Happy', emoji: '☀️', value: 6, color: 'bg-amber-300' },
  { label: 'Calm', emoji: '🏖️', value: 5, color: 'bg-sage-300' },
  { label: 'Neutral', emoji: '⛅', value: 4, color: 'bg-slate-200' },
  { label: 'Sad', emoji: '🌧️', value: 3, color: 'bg-blue-200' },
  { label: 'Anxious', emoji: '🌪️', value: 2, color: 'bg-rose-200' },
  { label: 'Angry', emoji: '🔥', value: 1, color: 'bg-orange-300' }
];

const prompts = [
  'What made you smile today?',
  'Name one thing you are grateful for right now.',
  'How are you really feeling in this moment?',
  'What do you need to hear from yourself today?',
  'What is one thing you can let go of?',
  'What small win did you have today?',
  'How would you describe your mood to a friend?',
  'If anger is here, what is it trying to protect?'
];

const writingInvitations = [
  {
    title: 'What stayed with me today',
    mood: 'Calm',
    opener: 'Today stayed with me because',
    detail: 'Begin with the moment you keep replaying, even if it seems small.'
  },
  {
    title: 'The honest version',
    mood: 'Neutral',
    opener: 'The honest version is',
    detail: 'No polished story needed — just what happened, what it meant, or what it changed.'
  },
  {
    title: 'Something I want to remember',
    mood: 'Happy',
    opener: 'I want to remember',
    detail: 'Save a tiny scene, a sentence someone said, or one ordinary detail future you may love.'
  }
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
    title: 'How to start a journaling habit for anxiety',
    read: 'Article • 4 min read',
    body: 'Writing down your thoughts can be a powerful tool for managing anxiety. However, starting a journaling habit often feels overwhelming. This comprehensive guide will help you build a journaling routine that feels gentle, sustainable, and truly helpful for your mental health.',
    href: '/article-how-to-start-journaling-habit.html'
  },
  {
    title: 'The unexpected benefits of a private online diary',
    read: 'Article • 4 min read',
    body: 'For centuries, people have kept written records of their lives. Today, transitioning that practice to a private online diary offers profound psychological benefits. From enhanced emotional regulation to unparalleled convenience, digital journaling is a modern tool for mindfulness.',
    href: '/article-benefits-of-private-online-diary.html'
  },
  {
    title: 'Why daily reflection is essential for mental health',
    read: 'Article • 5 min read',
    body: 'We live in a culture that prioritizes forward momentum. In this relentless pace, taking time for daily reflection is not just a luxury; it is a fundamental requirement for maintaining long-term mental health and building deep self-awareness.',
    href: '/article-daily-reflection-mental-health.html'
  },
  {
    title: 'Journaling prompts for deep self-discovery',
    read: 'Article • 4 min read',
    body: 'Staring at a blank page can be intimidating. When you want to journal but don\'t know where to start, these carefully curated journaling prompts act as a gentle guide, leading you toward profound self-discovery and emotional clarity without the pressure.',
    href: '/article-journaling-prompts-self-discovery.html'
  },
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
    text: 'Use Quiet Journal Journey as a private online diary when you want a calm place to write daily thoughts, check in with yourself, and keep reflections personal.',
    href: '/private-online-diary.html'
  },
  {
    title: 'Online diary',
    text: 'Explore an online diary that feels gentle, private, and easy to return to when you want a softer daily writing habit.',
    href: '/online-diary.html'
  },
  {
    title: 'Diary app',
    text: 'See how a diary app can stay calm, beginner-friendly, and private enough for quick check-ins or longer reflection.',
    href: '/diary-app.html'
  },
  {
    title: 'Best diary app',
    text: 'Compare what makes the best diary app feel quieter, easier to keep, and more supportive of honest daily reflection.',
    href: '/best-diary-app.html'
  },
  {
    title: 'Where to write a diary online',
    text: 'A practical guide for people comparing where to write a diary online, what to look for, and how to choose a softer digital diary space.',
    href: '/where-to-write-a-diary-online.html'
  },
  {
    title: 'Online journal',
    text: 'Explore a calmer online journal flow for daily writing, emotional clarity, and private reflection that feels lighter to return to.',
    href: '/online-journal.html'
  },
  {
    title: 'Journal app',
    text: 'Find a journal app that feels calmer to use, easier to revisit, and more supportive of real daily reflection.',
    href: '/journal-app.html'
  },
  {
    title: 'Digital diary',
    text: 'See how a digital diary can feel lighter to keep, easier to revisit, and more natural to use for honest everyday reflection.',
    href: '/digital-diary.html'
  },
  {
    title: 'Mood journal',
    text: 'Track feelings over time with a mood journal flow that makes it easier to notice patterns, save gentle notes, and reflect without turning the process into pressure.',
    href: '/mood-journal.html'
  },
  {
    title: 'Online diary with lock',
    text: 'If you want an online diary with lock protection, you can add a soft PIN for the browser while still keeping the journaling experience simple and welcoming.',
    href: '/online-diary-with-lock.html'
  },
  {
    title: 'How to write a diary',
    text: 'Read a calmer beginner guide for how to write a diary when you want simple steps, softer prompts, and an easier way to start.',
    href: '/how-to-write-a-diary.html'
  },
  {
    title: 'Journal prompts',
    text: 'Use prompt-based journaling when the blank page feels too open and you want softer ways to begin writing.',
    href: '/journal-prompts.html'
  },
  {
    title: 'Daily reflection journal',
    text: 'Build a calmer evening journaling habit with short check-ins, gentle review questions, and quieter end-of-day notes.',
    href: '/daily-reflection-journal.html'
  },
  {
    title: 'Free online diary',
    text: 'Explore a free online diary option that still feels calm, personal, and supportive enough for everyday writing.',
    href: '/free-online-diary.html'
  },
  {
    title: 'Daily journal app',
    text: 'Find a daily journal app that helps you come back to one honest check-in, short note, or reflection at a time.',
    href: '/daily-journal-app.html'
  },
  {
    title: 'Gratitude journal',
    text: 'Use gratitude journaling in a softer way, with room for small wins, ordinary moments, and grounded daily appreciation.',
    href: '/gratitude-journal.html'
  },
  {
    title: 'Private journal app',
    text: 'Find a private journal app that feels personal, uncluttered, and easier to trust with honest everyday writing.',
    href: '/private-journal-app.html'
  },
  {
    title: 'Secure online journal',
    text: 'Explore a secure online journal approach that keeps privacy cues clear while still feeling calm and welcoming to use.',
    href: '/secure-online-journal.html'
  },
  {
    title: 'Self care journal',
    text: 'Use a self care journal for gentler check-ins, steadier reflection, and small daily ways to notice what helps.',
    href: '/self-care-journal.html'
  },
  {
    title: 'Personal diary online',
    text: 'Keep a personal diary online when you want a softer place for private thoughts, everyday life notes, and honest reflection.',
    href: '/personal-diary-online.html'
  },
  {
    title: 'Online diary for adults',
    text: 'Find an online diary for adults that feels calm, personal, and realistic enough for busy everyday life.',
    href: '/online-diary-for-adults.html'
  },
  {
    title: 'Daily check in journal',
    text: 'Use a daily check in journal for short emotional check-ins, small reminders, and steadier self-awareness over time.',
    href: '/daily-check-in-journal.html'
  },
  {
    title: 'Morning journal prompts',
    text: 'Start the day with morning journal prompts that feel soft, useful, and realistic before life gets noisy.',
    href: '/morning-journal-prompts.html'
  },
  {
    title: 'Evening journal prompts',
    text: 'Use evening journal prompts to slow the day down, clear your head, and keep a calmer end-of-day habit.',
    href: '/evening-journal-prompts.html'
  },
  {
    title: 'Reflection prompts for adults',
    text: 'Explore reflection prompts for adults that feel grounded, private, and helpful for real everyday life.',
    href: '/reflection-prompts-for-adults.html'
  },
  {
    title: 'Journaling routine',
    text: 'Build a journaling routine that feels realistic, calm, and easy to repeat even during busy weeks.',
    href: '/journaling-routine.html'
  },
  {
    title: 'Daily writing habit',
    text: 'Create a daily writing habit with small check-ins, flexible prompts, and a private place to return to.',
    href: '/daily-writing-habit.html'
  },
  {
    title: 'Habit tracker journal',
    text: 'Use a habit tracker journal to connect practical routines with gentle reflection and personal notes.',
    href: '/habit-tracker-journal.html'
  },
  {
    title: 'Online journal with lock',
    text: 'Choose an online journal with lock when you want private writing, calmer reflection, and clearer browser-based protection.',
    href: '/online-journal-with-lock.html'
  },
  {
    title: 'Daily journaling app',
    text: 'Find a daily journaling app that makes quick check-ins, prompts, and repeatable writing habits easier to keep.',
    href: '/daily-journaling-app.html'
  },
  {
    title: 'Journal for overthinking',
    text: 'Use a journal for overthinking to slow spirals down, name what feels loud, and return to calmer thoughts.',
    href: '/journal-for-overthinking.html'
  },
  {
    title: 'Self reflection journal',
    text: 'Keep a self reflection journal for private questions, calmer self-awareness, and grounded end-of-day insight.',
    href: '/self-reflection-journal.html'
  },
  {
    title: 'Best online diary',
    text: 'Compare what makes the best online diary feel private, easy to keep, and gentle enough for honest daily writing.',
    href: '/best-online-diary.html'
  },
  {
    title: 'Private diary app for adults',
    text: 'Choose a private diary app for adults when you want calmer writing, privacy, and a more grown-up journaling rhythm.',
    href: '/private-diary-app-for-adults.html'
  },
  {
    title: 'Digital journal with prompts',
    text: 'Use a digital journal with prompts when you want help starting, reflecting, and keeping a steadier writing habit.',
    href: '/digital-journal-with-prompts.html'
  },
  {
    title: 'Daily mental health journal',
    text: 'Keep a daily mental health journal for mood check-ins, reflection, and softer emotional awareness through everyday writing.',
    href: '/daily-mental-health-journal.html'
  },
  {
    title: 'Online diary app',
    text: 'Find an online diary app that makes private writing, quick check-ins, and calmer daily journaling easier to keep.',
    href: '/online-diary-app.html'
  },
  {
    title: 'Diary website',
    text: 'Choose a diary website when you want a simple online place for personal writing, prompts, and gentle reflection.',
    href: '/diary-website.html'
  },
  {
    title: 'Personal diary app',
    text: 'Use a personal diary app for private thoughts, mood tracking, and small honest daily writing moments.',
    href: '/personal-diary-app.html'
  },
  {
    title: 'Secure diary app',
    text: 'Pick a secure diary app when you want calmer private journaling with clearer protection and personal boundaries.',
    href: '/secure-diary-app.html'
  },
  {
    title: 'Write diary online',
    text: 'Write diary online when you want a simple private place to keep daily thoughts, small memories, and honest reflection in one browser-based space.',
    href: '/write-diary-online.html'
  },
  {
    title: 'Diary with password',
    text: 'Choose a diary with password protection when you want private writing, a calmer sense of safety, and easier day-to-day journaling.',
    href: '/diary-with-password.html'
  },
  {
    title: 'My online diary',
    text: 'Use my online diary style writing when you want a personal digital space that feels like your own corner of the day.',
    href: '/my-online-diary.html'
  },
  {
    title: 'Journal app for anxiety',
    text: 'Find a journal app for anxiety that helps slow racing thoughts, name feelings gently, and keep private check-ins simple.',
    href: '/journal-app-for-anxiety.html'
  },
  {
    title: 'Online diary for students',
    text: 'Explore an online diary for students that makes private writing, stress check-ins, and daily reflection feel simple and manageable.',
    href: '/online-diary-for-students.html'
  },
  {
    title: 'Private diary online free',
    text: 'Choose a private diary online free option when you want personal writing space, calm design, and easy daily access without extra friction.',
    href: '/private-diary-online-free.html'
  },
  {
    title: 'Daily self care journal',
    text: 'Use a daily self care journal to notice what you need, reflect gently, and keep supportive habits in a calmer writing space.',
    href: '/daily-self-care-journal.html'
  },
  {
    title: 'Online diary with password',
    text: 'Pick an online diary with password protection when you want a private digital diary that feels both safe and easy to return to.',
    href: '/online-diary-with-password.html'
  },
  {
    title: 'Diary app for teens',
    text: 'Explore a diary app for teens that offers a private place for feelings, school stress, identity, and daily reflection without extra pressure.',
    href: '/diary-app-for-teens.html'
  },
  {
    title: 'Free online journal with lock',
    text: 'Choose a free online journal with lock support when you want privacy, simple writing, and a calmer digital journal you can return to easily.',
    href: '/free-online-journal-with-lock.html'
  },
  {
    title: 'Private journal for stress',
    text: 'Use a private journal for stress to unload pressure, name what feels heavy, and keep personal reflection in a quiet writing space.',
    href: '/private-journal-for-stress.html'
  },
  {
    title: 'Daily reflection app',
    text: 'Find a daily reflection app that helps you slow down, notice patterns, and keep honest check-ins simple enough to sustain.',
    href: '/daily-reflection-app.html'
  }
];

const seoFaqs = [
  {
    question: 'What is Quiet Journal Journey?',
    answer: 'Quiet Journal Journey is an online diary, private online diary, diary app, and journal app for daily reflection, guided prompts, customizable journaling, and optional lock protection.'
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
  },
  {
    question: 'Where can I write a diary online?',
    answer: 'Quiet Journal Journey gives you a calm place to write a diary online, save private entries, track moods, and return to your thoughts gently from any browser.'
  },
  {
    question: 'How do I start writing a diary?',
    answer: 'Start small. Pick one honest detail from the day, one feeling, or one thing you want to remember. Quiet Journal Journey also includes prompts and beginner-friendly diary pages to help you start.'
  },
  {
    question: 'Where can I write a journal online?',
    answer: 'If you want a softer online journal, Quiet Journal Journey works as a digital journal for daily writing, private reflection, prompts, and optional lock protection.'
  },
  {
    question: 'Can Quiet Journal Journey work like a diary app or journal app?',
    answer: 'Yes. You can use it like a diary app or journal app for quick entries, mood check-ins, photos, and private reflection that stays easy to revisit over time.'
  },
  {
    question: 'Does Quiet Journal Journey also have guides for prompts and daily reflection?',
    answer: 'Yes. There are dedicated reading pages for digital diary use, journal prompts, daily reflection, free online diary use, gratitude journaling, secure online journaling, self care journaling, personal diary online use, online diary for adults, daily check-in journaling, morning prompts, evening prompts, habit journaling, privacy-focused journaling, journaling through overthinking, self reflection, prompt-based journaling, adult diary use, and mental health check-ins.'
  },
  {
    question: 'Can I use Quiet Journal Journey for notes, reminders, and recurring tasks too?',
    answer: 'Yes. Alongside the diary, Quiet Journal Journey includes a notes space with to-dos, due dates, reminders, and recurring tasks so practical planning can stay separate from reflective writing.'
  },
  {
    question: 'Is Quiet Journal Journey good for building a journaling habit?',
    answer: 'Yes. The app is built for small repeatable check-ins, starter prompts, mood tracking, and habit-friendly notes so journaling feels easier to keep returning to.'
  }
];

const seoGuidePages = [
  {
    label: 'Popular guide',
    title: 'Web based diary',
    text: 'Access your personal writing from anywhere, requiring no downloads.',
    href: '/web-based-diary.html'
  },
  {
    label: 'Helpful read',
    title: 'Browser based journal',
    text: 'A fast, beautiful journal for writing thoughts instantly without installing apps.',
    href: '/browser-based-journal.html'
  },
  {
    label: 'Popular guide',
    title: 'Cozy journal app',
    text: 'A warm, comforting space designed to feel like a safe haven for your thoughts.',
    href: '/cozy-journal-app.html'
  },
  {
    label: 'Helpful read',
    title: 'Calm diary app',
    text: 'A quiet, distraction-free environment to reflect and find peace.',
    href: '/calm-diary-app.html'
  },
  {
    label: 'Popular guide',
    title: 'Self discovery journal',
    text: 'Explore your inner thoughts with online prompts and reflection guides.',
    href: '/self-discovery-journal.html'
  },
  {
    label: 'Helpful read',
    title: 'Morning pages app',
    text: 'Start your day with clarity through stream-of-consciousness writing.',
    href: '/morning-pages-app.html'
  },
  {
    label: 'Popular guide',
    title: 'CBT journal app',
    text: 'Track moods and reframe thoughts to support your mental health journey.',
    href: '/cbt-journal-app.html'
  },
  {
    label: 'Helpful read',
    title: 'Therapy journal online',
    text: 'Keep track of breakthroughs, session notes, and emotional patterns securely.',
    href: '/therapy-journal-online.html'
  },

  {
    label: 'Helpful read',
    title: 'Aesthetic journal app',
    text: 'For writers who appreciate a beautiful, calming space with elegant typography and minimalistic design.',
    href: '/aesthetic-journal-app.html'
  },
  {
    label: 'Popular guide',
    title: 'Mood tracker diary',
    text: 'Combine your daily feelings and thoughts in a private online space to track emotions.',
    href: '/mood-tracker-diary.html'
  },
  {
    label: 'Helpful read',
    title: 'Gratitude journal online',
    text: 'A positive journaling practice for quiet reflection, appreciation, and stress relief.',
    href: '/gratitude-journal-online.html'
  },
  {
    label: 'Helpful read',
    title: 'Minimalist diary app',
    text: 'A clutter-free, minimalist diary app for those who want a focused, distraction-free environment.',
    href: '/minimalist-diary-app.html'
  },
  {
    label: 'Popular guide',
    title: 'Private diary for overthinkers',
    text: 'Clear your mind safely in a secure diary that helps process anxiety and organize racing thoughts.',
    href: '/private-diary-for-overthinkers.html'
  },
  {
    label: 'Popular guide',
    title: 'Online diary for mental health',
    text: 'A gentle, private, and secure space for daily therapeutic journaling.',
    href: '/online-diary-for-mental-health.html'
  },
  {
    label: 'Helpful read',
    title: 'Digital bullet journal',
    text: 'A flexible way to organize thoughts, tasks, and daily reflections in a clean format.',
    href: '/digital-bullet-journal.html'
  },
  {
    label: 'Popular guide',
    title: 'Secure online journal',
    text: 'Keep your personal writing completely private with encrypted login and a safe environment.',
    href: '/secure-online-journal.html'
  },

  {
    label: 'Popular guide',
    title: 'Private online diary guide',
    text: 'A calm starting page for people who want a private place to journal online.',
    href: '/private-online-diary.html'
  },
  {
    label: 'Popular guide',
    title: 'Online diary guide',
    text: 'A direct page for people searching for an online diary that feels soft, personal, and easy to keep.',
    href: '/online-diary.html'
  },
  {
    label: 'Popular guide',
    title: 'Diary app guide',
    text: 'A softer guide for people comparing diary apps and looking for a calmer writing experience.',
    href: '/diary-app.html'
  },
  {
    label: 'Helpful read',
    title: 'Best diary app guide',
    text: 'A practical comparison page for people trying to decide what makes the best diary app worth returning to.',
    href: '/best-diary-app.html'
  },
  {
    label: 'Search guide',
    title: 'Where to write a diary online',
    text: 'A reader-friendly page for people choosing where to write a diary online without adding noise or pressure.',
    href: '/where-to-write-a-diary-online.html'
  },
  {
    label: 'Search guide',
    title: 'Online journal guide',
    text: 'A broader guide for people who want an online journal for gentle writing and reflection.',
    href: '/online-journal.html'
  },
  {
    label: 'Search guide',
    title: 'Journal app guide',
    text: 'A clearer guide for people searching for a journal app that supports reflection without pressure.',
    href: '/journal-app.html'
  },
  {
    label: 'Search guide',
    title: 'Digital diary guide',
    text: 'A gentle overview of what makes a digital diary easier to keep, revisit, and trust day after day.',
    href: '/digital-diary.html'
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
    title: 'How to write a diary',
    text: 'A beginner-friendly guide for starting a diary with softer prompts, simple structure, and less pressure.',
    href: '/how-to-write-a-diary.html'
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
  },
  {
    label: 'Popular guide',
    title: 'Free online diary guide',
    text: 'A calm guide for people who want a free online diary without losing privacy, softness, or daily writing ease.',
    href: '/free-online-diary.html'
  },
  {
    label: 'Popular guide',
    title: 'Daily journal app guide',
    text: 'A steady guide for people searching for a daily journal app that supports short returns and consistent reflection.',
    href: '/daily-journal-app.html'
  },
  {
    label: 'Helpful read',
    title: 'Gratitude journal guide',
    text: 'A gentle gratitude journaling page for noticing small wins, grounded moments, and everyday appreciation.',
    href: '/gratitude-journal.html'
  },
  {
    label: 'Popular guide',
    title: 'Private journal app guide',
    text: 'A privacy-first page for people searching for a journal app that feels personal, calm, and easier to trust.',
    href: '/private-journal-app.html'
  },
  {
    label: 'Popular guide',
    title: 'Secure online journal guide',
    text: 'A calmer guide for people comparing secure online journal options and wanting privacy without a cold experience.',
    href: '/secure-online-journal.html'
  },
  {
    label: 'Helpful read',
    title: 'Self care journal guide',
    text: 'A softer self care journaling page for steady check-ins, gentle reflection, and realistic daily support.',
    href: '/self-care-journal.html'
  },
  {
    label: 'Popular guide',
    title: 'Personal diary online guide',
    text: 'A calm page for people who want a personal diary online that feels private, gentle, and easy to return to.',
    href: '/personal-diary-online.html'
  },
  {
    label: 'Popular guide',
    title: 'Online diary for adults guide',
    text: 'A more grown-up online diary page for adults who want a calmer writing space for real everyday life.',
    href: '/online-diary-for-adults.html'
  },
  {
    label: 'Helpful read',
    title: 'Daily check in journal guide',
    text: 'A gentle daily check-in page for short reflections, emotional clarity, and steadier self-awareness.',
    href: '/daily-check-in-journal.html'
  },
  {
    label: 'Helpful read',
    title: 'Morning journal prompts',
    text: 'A softer prompt page for starting the day with a little clarity, intention, and self-kindness.',
    href: '/morning-journal-prompts.html'
  },
  {
    label: 'Helpful read',
    title: 'Evening journal prompts',
    text: 'A calmer end-of-day prompt page for reflection, release, and small notes before rest.',
    href: '/evening-journal-prompts.html'
  },
  {
    label: 'Helpful read',
    title: 'Reflection prompts for adults',
    text: 'A grounded prompt page for adults who want private reflection that fits real life.',
    href: '/reflection-prompts-for-adults.html'
  },
  {
    label: 'Habit guide',
    title: 'Journaling routine',
    text: 'A calm routine-building page for people who want journaling to feel repeatable instead of demanding.',
    href: '/journaling-routine.html'
  },
  {
    label: 'Habit guide',
    title: 'Daily writing habit',
    text: 'A small-step guide for building a daily writing habit with lower pressure and more consistency.',
    href: '/daily-writing-habit.html'
  },
  {
    label: 'Habit guide',
    title: 'Habit tracker journal',
    text: 'A practical guide to combining habit tracking, private notes, and reflective journaling in one calm place.',
    href: '/habit-tracker-journal.html'
  },
  {
    label: 'Privacy guide',
    title: 'Online journal with lock',
    text: 'A reassuring guide for people who want an online journal with lock-style privacy and calmer digital writing.',
    href: '/online-journal-with-lock.html'
  },
  {
    label: 'Habit guide',
    title: 'Daily journaling app',
    text: 'A softer guide for people comparing daily journaling apps and looking for an easier repeatable writing rhythm.',
    href: '/daily-journaling-app.html'
  },
  {
    label: 'Mindset guide',
    title: 'Journal for overthinking',
    text: 'A supportive guide for people who want to journal through spirals, racing thoughts, and mental clutter.',
    href: '/journal-for-overthinking.html'
  },
  {
    label: 'Reflection guide',
    title: 'Self reflection journal',
    text: 'A grounded guide for keeping a self reflection journal with prompts, calmer check-ins, and end-of-day perspective.',
    href: '/self-reflection-journal.html'
  },
  {
    label: 'Popular guide',
    title: 'Best online diary',
    text: 'A calmer comparison page for people looking for the best online diary for privacy, ease, and repeatable daily use.',
    href: '/best-online-diary.html'
  },
  {
    label: 'Adults guide',
    title: 'Private diary app for adults',
    text: 'A grown-up diary guide for adults who want privacy, calmer design, and a softer place to keep personal writing.',
    href: '/private-diary-app-for-adults.html'
  },
  {
    label: 'Prompt guide',
    title: 'Digital journal with prompts',
    text: 'A helpful guide for people who want a digital journal with prompts that make blank pages feel less intimidating.',
    href: '/digital-journal-with-prompts.html'
  },
  {
    label: 'Wellbeing guide',
    title: 'Daily mental health journal',
    text: 'A gentle daily journaling guide for mood awareness, emotional check-ins, and steadier mental wellbeing support.',
    href: '/daily-mental-health-journal.html'
  },
  {
    label: 'Popular guide',
    title: 'Online diary app',
    text: 'A direct guide for people searching for an online diary app that feels private, calm, and easy to keep using.',
    href: '/online-diary-app.html'
  },
  {
    label: 'Popular guide',
    title: 'Diary website',
    text: 'A straightforward guide for choosing a diary website with personal writing space, prompts, and a gentler layout.',
    href: '/diary-website.html'
  },
  {
    label: 'Personal guide',
    title: 'Personal diary app',
    text: 'A softer guide for people who want a personal diary app for private notes, moods, and reflective daily writing.',
    href: '/personal-diary-app.html'
  },
  {
    label: 'Privacy guide',
    title: 'Secure diary app',
    text: 'A practical privacy guide for people comparing secure diary apps and calmer ways to protect personal writing.',
    href: '/secure-diary-app.html'
  },
  {
    label: 'Search guide',
    title: 'Write diary online',
    text: 'A direct guide for people searching where and how to write diary online without losing privacy or calm.',
    href: '/write-diary-online.html'
  },
  {
    label: 'Privacy guide',
    title: 'Diary with password',
    text: 'A reassuring guide for people who want a diary with password protection and a softer private writing flow.',
    href: '/diary-with-password.html'
  },
  {
    label: 'Personal guide',
    title: 'My online diary',
    text: 'A personal writing guide for people looking for an online diary that feels like their own quiet everyday space.',
    href: '/my-online-diary.html'
  },
  {
    label: 'Wellbeing guide',
    title: 'Journal app for anxiety',
    text: 'A supportive guide for people comparing journal apps for anxiety, calmer reflection, and steady private check-ins.',
    href: '/journal-app-for-anxiety.html'
  },
  {
    label: 'Student guide',
    title: 'Online diary for students',
    text: 'A practical guide for students who want a quiet online diary for stress, study life, and private daily reflection.',
    href: '/online-diary-for-students.html'
  },
  {
    label: 'Free guide',
    title: 'Private diary online free',
    text: 'A simple guide for people looking for a private diary online free option that still feels calm and personal.',
    href: '/private-diary-online-free.html'
  },
  {
    label: 'Wellbeing guide',
    title: 'Daily self care journal',
    text: 'A gentle guide for building a daily self care journal around feelings, needs, small rituals, and easier reflection.',
    href: '/daily-self-care-journal.html'
  },
  {
    label: 'Privacy guide',
    title: 'Online diary with password',
    text: 'A privacy guide for people comparing online diary options with password protection and calmer personal writing space.',
    href: '/online-diary-with-password.html'
  },
  {
    label: 'Teen guide',
    title: 'Diary app for teens',
    text: 'A supportive guide for teens who want a private diary app for stress, feelings, and everyday life without making writing feel formal.',
    href: '/diary-app-for-teens.html'
  },
  {
    label: 'Free guide',
    title: 'Free online journal with lock',
    text: 'A practical guide for people looking for a free online journal with lock support and a calmer private writing flow.',
    href: '/free-online-journal-with-lock.html'
  },
  {
    label: 'Stress guide',
    title: 'Private journal for stress',
    text: 'A gentle guide for using a private journal to process stress, reduce mental clutter, and reflect without being watched.',
    href: '/private-journal-for-stress.html'
  },
  {
    label: 'Reflection guide',
    title: 'Daily reflection app',
    text: 'A clear guide for people comparing daily reflection apps that help turn small check-ins into a meaningful habit.',
    href: '/daily-reflection-app.html'
  }
];

const seoGuideGroups = [
  {
    title: 'Start a private diary',
    description: 'Best for visitors comparing private diary, online diary, and secure journal options.',
    links: seoGuidePages.filter((page) => ['Private online diary guide', 'Online diary guide', 'Best online diary', 'Online diary app', 'Diary website', 'Write diary online', 'My online diary', 'Online diary for students', 'Online diary with lock guide', 'Online diary with password', 'Free online journal with lock', 'Online journal with lock', 'Private journal app guide', 'Private diary app for adults', 'Private diary online free', 'Personal diary app', 'Secure diary app', 'Diary with password', 'Secure online journal guide', 'Personal diary online guide', 'Online diary for adults guide', 'Diary app for teens', 'Secure online journal', 'Cozy journal app', 'Therapy journal online'].includes(page.title))
  },
  {
    title: 'Build a writing habit',
    description: 'Best for people who want a repeatable routine, daily check-ins, and a softer habit tracker.',
    links: seoGuidePages.filter((page) => ['Daily journal app guide', 'Daily check in journal guide', 'Daily journaling app', 'Journaling routine', 'Daily writing habit', 'Habit tracker journal', 'Daily mental health journal', 'Online diary for mental health', 'Digital bullet journal', 'Morning pages app', 'CBT journal app'].includes(page.title))
  },
  {
    title: 'Find prompts and reflection ideas',
    description: 'Best for visitors who need help starting, reflecting, or writing without pressure.',
    links: seoGuidePages.filter((page) => ['How to write a diary', 'Journal prompts', 'Digital journal with prompts', 'Daily reflection journal', 'Self reflection journal', 'Morning journal prompts', 'Evening journal prompts', 'Reflection prompts for adults', 'Gratitude journal guide', 'Self care journal guide', 'Daily self care journal', 'Journal app for anxiety', 'Private journal for stress', 'Daily reflection app', 'Gratitude journal online', 'Private diary for overthinkers', 'Calm diary app', 'Self discovery journal'].includes(page.title))
  },
  {
    title: 'Compare diary and journal tools',
    description: 'Best for searchers evaluating apps, online journals, digital diaries, mood journals, and calmer writing support.',
    links: seoGuidePages.filter((page) => ['Diary app guide', 'Best diary app guide', 'Best online diary', 'Online diary app', 'Diary website', 'Write diary online', 'Diary with password', 'Online diary for students', 'Private diary online free', 'My online diary', 'Online diary with password', 'Diary app for teens', 'Free online journal with lock', 'Where to write a diary online', 'Online journal guide', 'Journal app guide', 'Journal app for anxiety', 'Private journal for stress', 'Daily reflection app', 'Journal for overthinking', 'Digital diary guide', 'Mood journal guide', 'Free online diary guide', 'Aesthetic journal app', 'Mood tracker diary', 'Minimalist diary app', 'Web based diary', 'Browser based journal'].includes(page.title))
  }
];

const seoPopularSearches = [
  { label: 'Web based diary', href: '/web-based-diary.html' },
  { label: 'Browser based journal', href: '/browser-based-journal.html' },
  { label: 'Cozy journal app', href: '/cozy-journal-app.html' },
  { label: 'Calm diary app', href: '/calm-diary-app.html' },
  { label: 'Self discovery journal', href: '/self-discovery-journal.html' },
  { label: 'Morning pages app', href: '/morning-pages-app.html' },
  { label: 'CBT journal app', href: '/cbt-journal-app.html' },
  { label: 'Therapy journal online', href: '/therapy-journal-online.html' },

  { label: 'Aesthetic journal app', href: '/aesthetic-journal-app.html' },
  { label: 'Mood tracker diary', href: '/mood-tracker-diary.html' },
  { label: 'Gratitude journal online', href: '/gratitude-journal-online.html' },
  { label: 'Minimalist diary app', href: '/minimalist-diary-app.html' },
  { label: 'Private diary for overthinkers', href: '/private-diary-for-overthinkers.html' },
  { label: 'Online diary for mental health', href: '/online-diary-for-mental-health.html' },
  { label: 'Digital bullet journal', href: '/digital-bullet-journal.html' },
  { label: 'Secure online journal', href: '/secure-online-journal.html' },

  { label: 'Private online diary', href: '/private-online-diary.html' },
  { label: 'Best online diary', href: '/best-online-diary.html' },
  { label: 'Online diary app', href: '/online-diary-app.html' },
  { label: 'Diary website', href: '/diary-website.html' },
  { label: 'Private diary app for adults', href: '/private-diary-app-for-adults.html' },
  { label: 'Personal diary app', href: '/personal-diary-app.html' },
  { label: 'Secure diary app', href: '/secure-diary-app.html' },
  { label: 'Write diary online', href: '/write-diary-online.html' },
  { label: 'Diary with password', href: '/diary-with-password.html' },
  { label: 'My online diary', href: '/my-online-diary.html' },
  { label: 'Journal app for anxiety', href: '/journal-app-for-anxiety.html' },
  { label: 'Online diary for students', href: '/online-diary-for-students.html' },
  { label: 'Private diary online free', href: '/private-diary-online-free.html' },
  { label: 'Daily self care journal', href: '/daily-self-care-journal.html' },
  { label: 'Online diary with password', href: '/online-diary-with-password.html' },
  { label: 'Diary app for teens', href: '/diary-app-for-teens.html' },
  { label: 'Free online journal with lock', href: '/free-online-journal-with-lock.html' },
  { label: 'Private journal for stress', href: '/private-journal-for-stress.html' },
  { label: 'Daily reflection app', href: '/daily-reflection-app.html' },
  { label: 'Journal app for adults', href: '/journal-app-for-adults.html' },
  { label: 'Private online notebook', href: '/private-online-notebook.html' },
  { label: 'Mental wellness journal app', href: '/mental-wellness-journal-app.html' },
  { label: 'Simple online diary', href: '/simple-online-diary.html' },
  { label: 'Journal prompts', href: '/journal-prompts.html' },
  { label: 'Digital journal with prompts', href: '/digital-journal-with-prompts.html' },
  { label: 'Daily reflection journal', href: '/daily-reflection-journal.html' },
  { label: 'Daily mental health journal', href: '/daily-mental-health-journal.html' },
  { label: 'Online journal with lock', href: '/online-journal-with-lock.html' },
  { label: 'Daily journaling app', href: '/daily-journaling-app.html' },
  { label: 'Journal for overthinking', href: '/journal-for-overthinking.html' },
  { label: 'Self reflection journal', href: '/self-reflection-journal.html' }
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

function getInitialSelectedCalendarDate() {
  if (typeof window === 'undefined') return todayISO();
  const dateValue = new URLSearchParams(window.location.search).get('date') || '';
  return /^\d{4}-\d{2}-\d{2}$/.test(dateValue) ? dateValue : todayISO();
}

function getInitialActiveTab() {
  if (typeof window === 'undefined') return 'home';
  const params = new URLSearchParams(window.location.search);
  const requestedTab = params.get('tab') || '';
  const allowedTabs = new Set(['home', 'write', 'notes', 'memories', 'insights', 'design']);
  if (allowedTabs.has(requestedTab)) return requestedTab;
  if (/^\d{4}-\d{2}-\d{2}$/.test(params.get('date') || '')) return 'memories';
  return 'home';
}

function getInitialHomeSection() {
  if (typeof window === 'undefined') return 'overview';
  const hash = window.location.hash.replace('#', '');
  const allowedSections = new Set(['home', 'overview', 'about', 'guides', 'seo-landing', 'resources', 'articles', 'faq', 'contact']);
  if (!allowedSections.has(hash)) return 'overview';
  if (hash === 'home') return 'overview';
  if (hash === 'seo-landing') return 'guides';
  return hash;
}

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

function normalizeImportantDatesRecord(value) {
  if (!value || typeof value !== 'object') return {};
  return Object.fromEntries(
    Object.entries(value).map(([dateKey, item]) => {
      if (typeof item === 'string') {
        return [dateKey, { note: item, time: '', remindersEnabled: true, createdAt: new Date().toISOString() }];
      }
      return [dateKey, {
        note: typeof item?.note === 'string' ? item.note : '',
        time: typeof item?.time === 'string' ? item.time : '',
        remindersEnabled: item?.remindersEnabled !== false,
        createdAt: item?.createdAt || new Date().toISOString()
      }];
    }).filter(([, item]) => item.note)
  );
}

function getInitialImportantDates() {
  try {
    const saved = localStorage.getItem(IMPORTANT_DATES_STORAGE_KEY);
    if (!saved) return {};
    return normalizeImportantDatesRecord(JSON.parse(saved));
  } catch {
    return {};
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

function normalizePlannerTodo(todo) {
  const status = todo?.status === 'doing' || todo?.status === 'done' || todo?.status === 'todo'
    ? todo.status
    : (todo?.done ? 'done' : 'todo');
  const priority = todo?.priority === 'low' || todo?.priority === 'high' ? todo.priority : 'medium';
  const recurrence = todo?.recurrence === 'daily' || todo?.recurrence === 'weekly' || todo?.recurrence === 'monthly' ? todo.recurrence : 'none';
  const dueDate = typeof todo?.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(todo.dueDate) ? todo.dueDate : '';
  return {
    id: typeof todo?.id === 'string' ? todo.id : crypto.randomUUID(),
    text: typeof todo?.text === 'string' ? todo.text.trim() : '',
    status,
    priority,
    recurrence,
    dueDate,
    done: status === 'done'
  };
}

function normalizePlannerBoard(value) {
  return {
    text: typeof value?.text === 'string' ? value.text : '',
    todos: Array.isArray(value?.todos)
      ? value.todos
        .map(normalizePlannerTodo)
        .filter((todo) => todo.text)
      : []
  };
}

function getInitialPlannerBoard() {
  try {
    const saved = localStorage.getItem(PLANNER_STORAGE_KEY);
    if (saved) {
      return normalizePlannerBoard(JSON.parse(saved));
    }
  } catch {}
  return {
    text: '',
    todos: []
  };
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(dateString));
}

function formatReminderTime(timeValue) {
  if (!timeValue) return '';
  const [hoursString, minutesString] = timeValue.split(':');
  const hours = Number(hoursString);
  const minutes = Number(minutesString);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return timeValue;
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return new Intl.DateTimeFormat('en', {
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
}

function formatShortDate(dateString) {
  if (!dateString) return '';
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric'
  }).format(new Date(`${dateString}T00:00:00`));
}

function getPlannerStatusLabel(status) {
  if (status === 'doing') return 'In progress';
  if (status === 'done') return 'Done';
  return 'To do';
}

function getPlannerPriorityLabel(priority) {
  if (priority === 'high') return 'High';
  if (priority === 'low') return 'Low';
  return 'Medium';
}

function getPlannerRecurrenceLabel(recurrence) {
  if (recurrence === 'daily') return 'Daily';
  if (recurrence === 'weekly') return 'Weekly';
  if (recurrence === 'monthly') return 'Monthly';
  return 'One-time';
}

function getNextPlannerDueDate(dueDate, recurrence) {
  if (!dueDate || recurrence === 'none') return '';
  const nextDate = new Date(`${dueDate}T00:00:00`);
  if (Number.isNaN(nextDate.getTime())) return '';
  if (recurrence === 'daily') nextDate.setDate(nextDate.getDate() + 1);
  if (recurrence === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
  if (recurrence === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
  return nextDate.toISOString().slice(0, 10);
}

function isPlannerTodoOverdue(todo) {
  return Boolean(todo?.dueDate) && todo.status !== 'done' && todo.dueDate < todayISO();
}

function getReminderDate(dateKey, timeValue = '') {
  const fallbackTime = timeValue || '09:00';
  const parsed = new Date(`${dateKey}T${fallbackTime}:00`);
  return Number.isNaN(parsed.getTime()) ? new Date(dateKey) : parsed;
}

function getRelativeReminderLabel(dateKey) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const target = new Date(`${dateKey}T00:00:00`);
  const diffDays = Math.round((target.getTime() - startOfToday.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays < 0) return `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} ago`;
  return `In ${diffDays} day${diffDays === 1 ? '' : 's'}`;
}

function showImportantReminderNotification({ title, body, dateKey, reminderType, note, time }) {
  if (typeof window === 'undefined') return Promise.resolve();
  if ('serviceWorker' in navigator) {
    return navigator.serviceWorker.ready
      .then((registration) => registration.showNotification(title, {
        body,
        tag: `important-reminder:${dateKey}:${reminderType}`,
        renotify: false,
        requireInteraction: reminderType === 'today',
        data: {
          dateKey,
          reminderType,
          note,
          time,
          tab: 'memories'
        }
      }))
      .catch((error) => {
        console.error('Service worker reminder failed', error);
        if ('Notification' in window) {
          new window.Notification(title, { body });
        }
      });
  }
  if ('Notification' in window) {
    new window.Notification(title, { body });
  }
  return Promise.resolve();
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
    <div className="group rounded-[1.75rem] border border-white/80 bg-gradient-to-br from-white/95 to-white/75 p-5 text-center shadow-lift backdrop-blur transition duration-300 hover:-translate-y-1 hover:shadow-soft">
      <div className="flex flex-col items-center gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-sm ${tone}`}>
          <Icon size={21} />
        </div>
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-sage-800">{label}</p>
      </div>
      <p className="mt-4 break-words text-2xl font-extrabold leading-tight tracking-tight text-ink">{value}</p>
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
          const heightClass = ['h-9 sm:h-12', 'h-12 sm:h-16', 'h-16 sm:h-24', 'h-24 sm:h-32', 'h-32 sm:h-44', 'h-36 sm:h-52'][mood.value - 1] || 'h-20 sm:h-28';
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
              <p className="mt-5 text-lg leading-8 text-sage-800">A calm space for private diary writing, daily reflection, and gentle mood check-ins you can keep returning to.</p>
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
  const initialActiveTab = getInitialActiveTab();
  const initialCalendarDate = getInitialSelectedCalendarDate();
  const [activeTab, setActiveTab] = useState(initialActiveTab);
  const [activeHomeSection, setActiveHomeSection] = useState(getInitialHomeSection);
  const [entries, setEntries] = useState(getInitialEntries);
  const [selectedMood, setSelectedMood] = useState('Calm');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [plannerBoard, setPlannerBoard] = useState(getInitialPlannerBoard);
  const [plannerTodoDraft, setPlannerTodoDraft] = useState('');
  const [plannerTodoPriorityDraft, setPlannerTodoPriorityDraft] = useState('medium');
  const [plannerTodoDueDateDraft, setPlannerTodoDueDateDraft] = useState('');
  const [plannerTodoRecurrenceDraft, setPlannerTodoRecurrenceDraft] = useState('none');
  const [plannerTodoFilter, setPlannerTodoFilter] = useState('all');
  const [editingPlannerTodoId, setEditingPlannerTodoId] = useState(null);
  const [editingPlannerTodoText, setEditingPlannerTodoText] = useState('');
  const [editingPlannerTodoPriority, setEditingPlannerTodoPriority] = useState('medium');
  const [editingPlannerTodoDueDate, setEditingPlannerTodoDueDate] = useState('');
  const [editingPlannerTodoRecurrence, setEditingPlannerTodoRecurrence] = useState('none');
  const [draggedPlannerTodoId, setDraggedPlannerTodoId] = useState(null);
  const [saveReward, setSaveReward] = useState('');
  const [customQuotes, setCustomQuotes] = useState(getInitialCustomQuotes);
  const [customQuoteDraft, setCustomQuoteDraft] = useState('');
  const [quoteStyle, setQuoteStyle] = useState(getInitialQuoteStyle);
  const [journalStyle, setJournalStyle] = useState(getInitialJournalStyle);
  const [petHappiness, setPetHappiness] = useState(60);
  const [petTreats, setPetTreats] = useState(0);
  const [petMood, setPetMood] = useState('walking');
  const [importantDates, setImportantDates] = useState(getInitialImportantDates);
  const [importanceModalOpen, setImportanceModalOpen] = useState(false);
  const [importanceDraft, setImportanceDraft] = useState('');
  const [importanceTimeDraft, setImportanceTimeDraft] = useState('');
  const [importanceReminderEnabled, setImportanceReminderEnabled] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return window.Notification.permission;
  });
  const [notificationStatusMessage, setNotificationStatusMessage] = useState('');
  const [webPushStatus, setWebPushStatus] = useState(() => {
    if (typeof window === 'undefined') return 'Push setup not started.';
    return localStorage.getItem(WEB_PUSH_STATUS_STORAGE_KEY) || 'Push setup not started.';
  });
  const [webPushTokenReady, setWebPushTokenReady] = useState(false);
  const [serviceWorkerReady, setServiceWorkerReady] = useState(false);
  const [petPosition, setPetPosition] = useState({ x: 20, y: 40 });
  const [petDirection, setPetDirection] = useState(1);
  const [petBubble, setPetBubble] = useState('');
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(() => initialCalendarDate.slice(0, 7));
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(initialCalendarDate);
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
  const [selectedDesign, setSelectedDesign] = useState(() => localStorage.getItem(DESIGN_STORAGE_KEY) || 'editorial');
  const [customColor, setCustomColor] = useState(() => localStorage.getItem(CUSTOM_COLOR_STORAGE_KEY) || '#587f49');
  const [quoteBg, setQuoteBg] = useState(() => localStorage.getItem(QUOTE_BG_STORAGE_KEY) || '#45643b');
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [comfortMode, setComfortMode] = useState(() => localStorage.getItem(COMFORT_MODE_STORAGE_KEY) === 'true');
  const [companion, setCompanion] = useState(getInitialCompanion);
  const [companionSelected, setCompanionSelected] = useState(false);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [cloudStatus, setCloudStatus] = useState('Local mode');
  const [plannerCloudReady, setPlannerCloudReady] = useState(false);
  const [importantDatesCloudReady, setImportantDatesCloudReady] = useState(false);
  const [seoStudioApiKey, setSeoStudioApiKey] = useState(() => localStorage.getItem(SEO_STUDIO_API_KEY_STORAGE_KEY) || '');
  const [seoStudioPrompt, setSeoStudioPrompt] = useState(() => localStorage.getItem(SEO_STUDIO_PROMPT_STORAGE_KEY) || DEFAULT_SEO_STUDIO_PROMPT);
  const [seoStudioReport, setSeoStudioReport] = useState(() => localStorage.getItem(SEO_STUDIO_REPORT_STORAGE_KEY) || '');
  const [seoStudioLastRun, setSeoStudioLastRun] = useState(() => localStorage.getItem(SEO_STUDIO_LAST_RUN_STORAGE_KEY) || '');
  const [seoStudioLoading, setSeoStudioLoading] = useState(false);
  const [seoStudioError, setSeoStudioError] = useState('');
  const [seoStudioCopied, setSeoStudioCopied] = useState(false);
  const [cookieConsentAccepted, setCookieConsentAccepted] = useState(() => localStorage.getItem('quiet-journal-cookie-consent') === 'true');
  const [showSeoStudioKey, setShowSeoStudioKey] = useState(false);
  const [adminViewMode, setAdminViewMode] = useState(() => localStorage.getItem(ADMIN_VIEW_MODE_STORAGE_KEY) || 'master');
  const [seoStudioModelUsed, setSeoStudioModelUsed] = useState('');
  const [showAllSearches, setShowAllSearches] = useState(false);
  const entryBodyRef = useRef(null);
  const companionMediaRef = useRef(null);
  const plannerBoardRef = useRef(plannerBoard);
  const importantDatesRef = useRef(importantDates);

  const isMasterAdmin = user?.email?.toLowerCase() === MASTER_ADMIN_EMAIL;
  const showAdminTools = isMasterAdmin && adminViewMode === 'master';

  const quickEmojis = ['✨', '🌸', '🍃', '☕', '🌙', '💛', '🌿', '☀️', '🧸', '🫧', '🍂', '🫶'];
  const homeSections = useMemo(() => {
    const sections = [
      { id: 'overview', label: 'Overview', icon: Waves, detail: 'Progress + shortcuts' },
      { id: 'about', label: 'About', icon: Compass, detail: 'How the journal works' },
      { id: 'guides', label: 'Guides', icon: BookOpen, detail: 'Reader guides + helpful pages' },
      { id: 'resources', label: 'Resources', icon: HeartHandshake, detail: 'Gentle practices' },
      { id: 'articles', label: 'Articles', icon: Newspaper, detail: 'Short reflections' },
      { id: 'faq', label: 'FAQ', icon: Sparkles, detail: 'Common questions' },
      { id: 'tips', label: 'Tips', icon: Leaf, detail: 'Ways to begin' },
      { id: 'privacy', label: 'Privacy', icon: Shield, detail: 'What stays private' },
      { id: 'terms', label: 'Terms', icon: Scale, detail: 'Helpful notes' },
      { id: 'contact', label: 'Contact', icon: Mail, detail: 'Reach the owner' }
    ];
    if (showAdminTools) {
      sections.push({ id: 'seo-studio', label: 'SEO Studio', icon: ShieldCheck, detail: 'Admin-only AI tools' });
    }
    return sections;
  }, [showAdminTools]);
  const primaryHomeSections = useMemo(
    () => homeSections.filter((section) => ['overview', 'about', 'guides', 'resources', 'faq', 'contact', 'seo-studio'].includes(section.id)),
    [homeSections]
  );
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
    contact: 'contact',
    'seo-studio': 'seo-studio'
  };

  const activeTheme = colorThemes.find((theme) => theme.id === selectedTheme) || colorThemes[0];
  const activeDesign = designStyles.find((style) => style.id === selectedDesign) || designStyles[0];
  const weatherOptions = useMemo(() => [...moods, ...customWeathers], [customWeathers]);
  const selectedMoodOption = useMemo(() => weatherOptions.find((item) => item.label === selectedMood) || moods[2], [selectedMood, weatherOptions]);
  const selectedMoodGuide = useMemo(() => {
    if (selectedMood === 'Angry') {
      return {
        title: 'Give the heat somewhere safe to land',
        detail: 'Write the sharp truth first, then the need, hurt, or boundary sitting underneath it.',
        summary: 'Anger can point to pressure, hurt, or a line that mattered to you.',
        shellClass: 'border-orange-100 bg-gradient-to-br from-orange-50/95 via-white to-rose-50/85',
        panelClass: 'bg-orange-50/85 ring-orange-100/90',
        chipClass: 'border-orange-200 bg-white/95 text-orange-700'
      };
    }
    if (selectedMood === 'Anxious') {
      return {
        title: 'Let the page slow the spiral',
        detail: 'Keep the sentence small and concrete. Start with what feels true right now instead of solving everything at once.',
        summary: 'A short check-in can turn anxious noise into something more nameable.',
        shellClass: 'border-rose-100 bg-gradient-to-br from-rose-50/90 via-white to-sage-50/80',
        panelClass: 'bg-rose-50/85 ring-rose-100/90',
        chipClass: 'border-rose-200 bg-white/95 text-rose-700'
      };
    }
    if (selectedMood === 'Sad') {
      return {
        title: 'Keep this page gentle',
        detail: 'You can write in fragments, pauses, or one honest line. The page does not need a polished version of the feeling.',
        summary: 'A quieter mood can still leave a clear and meaningful page behind.',
        shellClass: 'border-blue-100 bg-gradient-to-br from-blue-50/90 via-white to-sage-50/80',
        panelClass: 'bg-blue-50/85 ring-blue-100/90',
        chipClass: 'border-blue-200 bg-white/95 text-blue-700'
      };
    }
    return {
      title: 'A quick mood marker for today',
      detail: 'A simple mood label helps you return later and remember what the day actually felt like.',
      summary: 'Mood check-ins keep the writing flow softer and easier to revisit over time.',
      shellClass: 'border-sage-100 bg-white/88',
      panelClass: 'bg-sage-50/85 ring-sage-100/80',
      chipClass: 'border-sage-100 bg-white/95 text-sage-700'
    };
  }, [selectedMood]);
  const moodStarterPrompts = useMemo(() => {
    if (selectedMood === 'Angry') return ['What crossed a line today', 'What felt unfair', 'What I need to protect now'];
    if (selectedMood === 'Anxious') return ['What feels uncertain', 'What would steady me', 'One thing that is true right now'];
    if (selectedMood === 'Sad') return ['What felt heavy today', 'What I wish someone knew', 'What would feel kind right now'];
    return ['Today felt like', 'What I keep coming back to', 'Right now I need'];
  }, [selectedMood]);
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
    const nextSection = homeSectionMap[sectionId] || 'overview';
    setActiveTab('home');
    setActiveHomeSection(nextSection);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.hash = nextSection === 'overview' ? 'home' : nextSection;
      window.history.replaceState({}, '', url.toString());
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  useEffect(() => {
    if (user) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries, user]);

  useEffect(() => {
    if (user) return;
    localStorage.setItem(PLANNER_STORAGE_KEY, JSON.stringify(plannerBoard));
  }, [plannerBoard, user]);

  useEffect(() => {
    plannerBoardRef.current = plannerBoard;
  }, [plannerBoard]);

  useEffect(() => {
    importantDatesRef.current = importantDates;
  }, [importantDates]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const currentUrl = new URL(window.location.href);
    if (!currentUrl.searchParams.has('tab') && !currentUrl.searchParams.has('date')) return;
    currentUrl.searchParams.delete('tab');
    currentUrl.searchParams.delete('date');
    window.history.replaceState({}, '', currentUrl.toString());
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      setWebPushStatus('This browser does not support service workers for richer push handling.');
      return undefined;
    }
    let cancelled = false;

    const registerReminderWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}reminder-sw.js`);
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        await navigator.serviceWorker.ready;
        if (!cancelled) {
          setServiceWorkerReady(true);
          setWebPushStatus((current) => (current === 'Push setup not started.' ? 'Service worker is ready for richer reminder delivery.' : current));
        }
      } catch (error) {
        console.error('Reminder service worker registration failed', error);
        if (!cancelled) {
          setWebPushStatus('Service worker registration failed, so richer push delivery is not available yet.');
        }
      }
    };

    void registerReminderWorker();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || notificationPermission !== 'granted') return undefined;
    let unsubscribe = () => {};

    const connectForegroundPush = async () => {
      const messaging = await getMessagingIfSupported();
      if (!messaging) {
        setWebPushStatus('Notifications are allowed, but this browser does not support Firebase web messaging.');
        return;
      }
      unsubscribe = onMessage(messaging, (payload) => {
        const reminderPayload = payload?.data || {};
        const notificationTitle = payload?.notification?.title || reminderPayload.title || 'Quiet Journal Journey reminder';
        const notificationBody = payload?.notification?.body || reminderPayload.body || 'You have an important reminder waiting.';
        void showImportantReminderNotification({
          title: notificationTitle,
          body: notificationBody,
          dateKey: reminderPayload.dateKey || todayISO(),
          reminderType: reminderPayload.reminderType || 'push',
          note: reminderPayload.note || notificationBody,
          time: reminderPayload.time || ''
        });
      });
    };

    void connectForegroundPush();
    return () => unsubscribe();
  }, [notificationPermission]);

  useEffect(() => {
    if (!user || notificationPermission !== 'granted' || !serviceWorkerReady) {
      if (!user) {
        setWebPushTokenReady(false);
      }
      return undefined;
    }
    let cancelled = false;

    const registerWebPushToken = async () => {
      try {
        const messaging = await getMessagingIfSupported();
        if (!messaging) {
          if (!cancelled) {
            setWebPushTokenReady(false);
            setWebPushStatus('Notifications are allowed, but Firebase web messaging is not supported in this browser.');
          }
          return;
        }
        const registration = await navigator.serviceWorker.ready;
        const token = await getToken(messaging, { serviceWorkerRegistration: registration });
        if (!token) {
          if (!cancelled) {
            setWebPushTokenReady(false);
            setWebPushStatus('Push delivery needs a configured Firebase web push certificate before fully closed-browser alerts can be sent.');
          }
          return;
        }
        await setDoc(doc(db, 'users', user.uid, 'meta', CLOUD_PUSH_NOTIFICATIONS_DOC_ID), {
          token,
          permission: notificationPermission,
          serviceWorkerReady: true,
          status: 'connected',
          updatedAt: new Date().toISOString()
        });
        if (!cancelled) {
          setWebPushTokenReady(true);
          setWebPushStatus('Real push delivery is connected for this browser. Background messages can now target this journal session.');
        }
      } catch (error) {
        console.error('Web push token registration failed', error);
        await setDoc(doc(db, 'users', user.uid, 'meta', CLOUD_PUSH_NOTIFICATIONS_DOC_ID), {
          permission: notificationPermission,
          serviceWorkerReady,
          status: 'needs_configuration',
          error: error?.message || 'Unknown push setup error',
          updatedAt: new Date().toISOString()
        }).catch(() => {});
        if (!cancelled) {
          setWebPushTokenReady(false);
          setWebPushStatus('Push infrastructure is wired up, but Firebase web push still needs final project configuration before closed-browser delivery will work everywhere.');
        }
      }
    };

    void registerWebPushToken();
    return () => {
      cancelled = true;
    };
  }, [notificationPermission, serviceWorkerReady, user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      setPlannerCloudReady(false);
      setImportantDatesCloudReady(false);
      setCloudStatus(currentUser ? 'Cloud sync on' : 'Local mode');
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (authLoading || user) return;
    setEntries(getInitialEntries());
    setPlannerBoard(getInitialPlannerBoard());
    setImportantDates(getInitialImportantDates());
    setCloudStatus('Local mode');
  }, [authLoading, user]);

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
    if (!user) return undefined;
    const plannerDocRef = doc(db, 'users', user.uid, 'meta', CLOUD_PLANNER_DOC_ID);
    const unsubscribe = onSnapshot(
      plannerDocRef,
      async (snapshot) => {
        try {
          if (snapshot.exists()) {
            setPlannerBoard(normalizePlannerBoard(snapshot.data()));
          } else {
            const localPlanner = normalizePlannerBoard(plannerBoardRef.current);
            if (localPlanner.text || localPlanner.todos.length) {
              await setDoc(plannerDocRef, { ...localPlanner, updatedAt: new Date().toISOString() });
            }
          }
          setPlannerCloudReady(true);
        } catch (error) {
          console.error('Planner snapshot hydration failed', error);
          setPlannerCloudReady(true);
        }
      },
      (error) => {
        console.error('Planner sync failed', error);
        setPlannerCloudReady(true);
      }
    );
    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!user || !plannerCloudReady) return;
    const plannerDocRef = doc(db, 'users', user.uid, 'meta', CLOUD_PLANNER_DOC_ID);
    setDoc(plannerDocRef, { ...normalizePlannerBoard(plannerBoard), updatedAt: new Date().toISOString() }).catch((error) => {
      console.error('Could not save planner board', error);
    });
  }, [plannerBoard, plannerCloudReady, user]);

  useEffect(() => {
    if (!user) return undefined;
    const importantDatesDocRef = doc(db, 'users', user.uid, 'meta', CLOUD_IMPORTANT_DATES_DOC_ID);
    const unsubscribe = onSnapshot(
      importantDatesDocRef,
      async (snapshot) => {
        try {
          if (snapshot.exists()) {
            setImportantDates(normalizeImportantDatesRecord(snapshot.data()?.items || snapshot.data()));
          } else {
            const localImportantDates = normalizeImportantDatesRecord(importantDatesRef.current);
            if (Object.keys(localImportantDates).length) {
              await setDoc(importantDatesDocRef, { items: localImportantDates, updatedAt: new Date().toISOString() });
            }
          }
          setImportantDatesCloudReady(true);
        } catch (error) {
          console.error('Important dates snapshot hydration failed', error);
          setImportantDatesCloudReady(true);
        }
      },
      (error) => {
        console.error('Important dates sync failed', error);
        setImportantDatesCloudReady(true);
      }
    );
    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!user || !importantDatesCloudReady) return;
    const importantDatesDocRef = doc(db, 'users', user.uid, 'meta', CLOUD_IMPORTANT_DATES_DOC_ID);
    setDoc(importantDatesDocRef, { items: normalizeImportantDatesRecord(importantDates), updatedAt: new Date().toISOString() }).catch((error) => {
      console.error('Could not save important dates', error);
    });
  }, [importantDates, importantDatesCloudReady, user]);

  useEffect(() => {
    localStorage.setItem(SEO_STUDIO_API_KEY_STORAGE_KEY, seoStudioApiKey);
  }, [seoStudioApiKey]);

  useEffect(() => {
    localStorage.setItem(SEO_STUDIO_PROMPT_STORAGE_KEY, seoStudioPrompt);
  }, [seoStudioPrompt]);

  useEffect(() => {
    localStorage.setItem(SEO_STUDIO_REPORT_STORAGE_KEY, seoStudioReport);
  }, [seoStudioReport]);

  useEffect(() => {
    localStorage.setItem(SEO_STUDIO_LAST_RUN_STORAGE_KEY, seoStudioLastRun);
  }, [seoStudioLastRun]);

  useEffect(() => {
    localStorage.setItem(ADMIN_VIEW_MODE_STORAGE_KEY, adminViewMode);
  }, [adminViewMode]);

  useEffect(() => {
    localStorage.setItem(WEB_PUSH_STATUS_STORAGE_KEY, webPushStatus);
  }, [webPushStatus]);

  useEffect(() => {
    if (notificationPermission !== 'granted') return;
    if (!user) {
      setWebPushTokenReady(false);
      setWebPushStatus((current) => (current === 'Real push delivery is connected for this browser. Background messages can now target this journal session.' ? current : 'Allow notifications, then sign in to connect true push delivery to your synced journal.'));
    }
  }, [notificationPermission, user]);

  useEffect(() => {
    if (notificationPermission !== 'granted') return;
    setNotificationStatusMessage((current) => {
      if (serviceWorkerReady) {
        return 'Service worker-backed reminders are on. Alerts can surface more like an app, and tapping one will reopen the saved date.';
      }
      if (!current) {
        return 'Browser reminders are on. We will notify for important days today and tomorrow while the journal is open.';
      }
      return current;
    });
  }, [notificationPermission, serviceWorkerReady]);

  useEffect(() => {
    if (!showAdminTools && activeHomeSection === 'seo-studio') {
      setActiveHomeSection('overview');
    }
  }, [activeHomeSection, showAdminTools]);

  useEffect(() => {
    if (!isMasterAdmin) {
      setShowSeoStudioKey(false);
      setSeoStudioCopied(false);
      setSeoStudioModelUsed('');
      setAdminViewMode('master');
    }
  }, [isMasterAdmin]);

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
    if (user) return;
    localStorage.setItem(IMPORTANT_DATES_STORAGE_KEY, JSON.stringify(importantDates));
  }, [importantDates, user]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return undefined;
    const checkImportantDateReminders = async () => {
      if (window.Notification.permission !== 'granted') {
        setNotificationPermission(window.Notification.permission);
        return;
      }
      setNotificationPermission('granted');
      const todayKey = todayISO();
      const tomorrowDate = new Date();
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);
      const tomorrowKey = tomorrowDate.toISOString().slice(0, 10);
      const nextLog = (() => {
        try {
          const saved = JSON.parse(localStorage.getItem(IMPORTANT_DATES_REMINDER_LOG_KEY) || '{}');
          return typeof saved === 'object' && saved ? saved : {};
        } catch {
          return {};
        }
      })();
      let logChanged = false;
      for (const [dateKey, item] of Object.entries(importantDates)) {
        if (!item?.note || item.remindersEnabled === false) continue;
        let reminderType = '';
        if (dateKey === todayKey) reminderType = 'today';
        if (dateKey === tomorrowKey) reminderType = 'tomorrow';
        if (!reminderType) continue;
        const reminderKey = `${dateKey}:${reminderType}:${item.note}:${item.time || ''}`;
        if (nextLog[reminderKey]) continue;
        const title = reminderType === 'today' ? 'Important event today' : 'Important event tomorrow';
        const timeLabel = item.time ? ` at ${formatReminderTime(item.time)}` : '';
        const body = `${item.note}${timeLabel}${reminderType === 'tomorrow' ? '. Tomorrow is worth planning for.' : '. It is on your schedule today.'}`;
        await showImportantReminderNotification({
          title,
          body,
          dateKey,
          reminderType,
          note: item.note,
          time: item.time || ''
        });
        nextLog[reminderKey] = new Date().toISOString();
        logChanged = true;
      }
      if (logChanged) {
        const prunedLog = Object.fromEntries(
          Object.entries(nextLog).filter(([key]) => {
            const [loggedDate] = key.split(':');
            return loggedDate >= todayKey;
          })
        );
        localStorage.setItem(IMPORTANT_DATES_REMINDER_LOG_KEY, JSON.stringify(prunedLog));
      }
    };
    void checkImportantDateReminders();
    const interval = window.setInterval(() => {
      void checkImportantDateReminders();
    }, 60000);
    return () => window.clearInterval(interval);
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
    if (activeTab !== 'write' || !entryBodyRef.current || !body) return;
    const currentHtml = entryBodyRef.current.innerHTML.trim();
    if (!currentHtml || currentHtml === '<br>') entryBodyRef.current.innerHTML = body;
  }, [activeTab, body]);

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
    if (score >= 5.5) return 'Happy';
    if (score >= 4.5) return 'Calm';
    if (score >= 3.5) return 'Neutral';
    if (score >= 2.5) return 'Sad';
    if (score >= 1.5) return 'Anxious';
    return 'Angry';
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

  const seoStudioContext = useMemo(() => ([
    'Brand: Quiet Journal Journey',
    'Canonical: https://quietjournaljourney.vercel.app/',
    'Core positioning: private online diary, private diary, online diary, diary app, best diary app, journal app, online journal app, digital diary, online journal, mood journal, daily reflection, beginner-friendly diary writing.',
    'Hero title: Your quiet corner for honest pages.',
    'Hero summary: Quiet Journal Journey helps you keep an online diary, private diary, diary app, journal app, and mood journal space that feels softer to return to.',
    'Hero support line: If you are wondering where to write a diary online, how to write a diary, which diary app feels calmer, or what makes the best diary app worth keeping, this softer journal space gives you private entries, gentle prompts, and a place to notice what the day actually felt like.',
    'Current guide paths: /private-online-diary.html, /online-diary.html, /diary-app.html, /best-diary-app.html, /where-to-write-a-diary-online.html, /online-journal.html, /journal-app.html, /digital-diary.html, /mood-journal.html, /online-diary-with-lock.html, /how-to-write-a-diary.html, /journal-prompts.html, /daily-reflection-journal.html, /free-online-diary.html, /daily-journal-app.html, /gratitude-journal.html, /private-journal-app.html, /secure-online-journal.html, /self-care-journal.html, /personal-diary-online.html, /online-diary-for-adults.html, /daily-check-in-journal.html, /morning-journal-prompts.html, /evening-journal-prompts.html, /reflection-prompts-for-adults.html.',
    'Write view framing: A page for your diary. Write today\'s diary page in your own words.',
    'Privacy cues: optional PIN lock, local-first journaling, Google sign-in for sync, entries saved privately per user.',
    `Live product signals: ${entries.length} total entries in this session, ${streak} day streak, average mood ${averageMood}, cloud status ${cloudStatus}.`,
    `Weekly summary: ${weeklySummary}`,
    'Important constraints: suggestions should stay calm, premium, human, non-spammy, and should never disrupt the normal journaling flow for visitors.',
    'Desired output: prioritize high-impact improvements, natural keyword coverage, internal linking ideas, FAQ/schema ideas, and safe homepage or guide-page refinements.'
  ].join('\n')), [averageMood, cloudStatus, entries.length, streak, weeklySummary]);

  const entriesByDate = useMemo(() => entries.reduce((acc, entry) => {
    const key = entry.createdAt.slice(0, 10);
    return { ...acc, [key]: [...(acc[key] || []), entry] };
  }, {}), [entries]);
  const calendarDays = useMemo(() => buildCalendarDays(calendarMonth), [calendarMonth]);
  const selectedDateEntries = entriesByDate[selectedCalendarDate] || [];
  const selectedImportantDate = importantDates[selectedCalendarDate] || null;
  const importantDateCount = useMemo(() => Object.keys(importantDates).length, [importantDates]);
  const upcomingImportantDates = useMemo(() => Object.entries(importantDates)
    .map(([dateKey, item]) => ({
      dateKey,
      note: item?.note || '',
      time: item?.time || '',
      remindersEnabled: item?.remindersEnabled !== false,
      createdAt: item?.createdAt || '',
      date: getReminderDate(dateKey, item?.time || ''),
      relativeLabel: getRelativeReminderLabel(dateKey)
    }))
    .filter((item) => item.note && item.date.getTime() >= getReminderDate(todayISO()).getTime())
    .sort((a, b) => a.date.getTime() - b.date.getTime()), [importantDates]);
  const upcomingReminderPreview = upcomingImportantDates.slice(0, 4);
  const upcomingReminderCount = upcomingImportantDates.length;
  const nextUpcomingReminder = upcomingImportantDates[0] || null;
  const plannerStorageLabel = user ? (plannerCloudReady ? 'Synced with your account' : 'Syncing notes to your account') : 'Auto-saved on this device';
  const reminderStorageLabel = user ? (importantDatesCloudReady ? 'Synced with your account' : 'Syncing reminders to your account') : 'Stored on this device';
  const reminderDeliveryLabel = webPushTokenReady ? 'True push connected' : serviceWorkerReady ? 'Push-ready worker' : 'Browser alerts only';
  const reminderBehaviorLabel = webPushTokenReady ? 'Can target closed-browser messages' : serviceWorkerReady ? 'Tap opens the saved date' : 'Best while the journal stays open';

  const rewardLevel = useMemo(() => {
    if (entries.length >= 30) return { title: 'Moon Keeper', emoji: '🌙', next: 'Your quiet archive is glowing.' };
    if (entries.length >= 14) return { title: 'Kindness', emoji: '🌷', next: `${30 - entries.length} more pages until Moon Keeper.` };
    if (entries.length >= 7) return { title: 'Weekly Spark', emoji: '✨', next: `${14 - entries.length} more pages until Kindness.` };
    if (entries.length >= 3) return { title: 'Seedling', emoji: '🌱', next: `${7 - entries.length} more pages until Weekly Spark.` };
    return { title: 'Starter', emoji: '☁️', next: `${Math.max(3 - entries.length, 1)} more pages until Seedling.` };
  }, [entries.length]);

  const draftText = useMemo(() => getPlainTextFromHtml(body), [body]);
  const draftWordCount = useMemo(() => {
    const trimmed = draftText.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }, [draftText]);
  const plannerTodoCount = plannerBoard.todos.length;
  const completedPlannerTodoCount = plannerBoard.todos.filter((todo) => todo.status === 'done').length;
  const inProgressPlannerTodoCount = plannerBoard.todos.filter((todo) => todo.status === 'doing').length;
  const openPlannerTodoCount = plannerBoard.todos.filter((todo) => todo.status !== 'done').length;
  const overduePlannerTodoCount = plannerBoard.todos.filter((todo) => isPlannerTodoOverdue(todo)).length;
  const filteredPlannerTodos = useMemo(() => plannerBoard.todos.filter((todo) => {
    if (plannerTodoFilter === 'open') return todo.status !== 'done';
    if (plannerTodoFilter === 'doing') return todo.status === 'doing';
    if (plannerTodoFilter === 'done') return todo.status === 'done';
    if (plannerTodoFilter === 'high') return todo.priority === 'high';
    return true;
  }), [plannerBoard.todos, plannerTodoFilter]);
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
    { label: 'Give today\'s page a simple title', done: Boolean(title.trim() || draftText) },
    { label: 'Keep one honest detail', done: draftText.length >= 40 }
  ]), [draftText, selectedMood, title]);
  const completedQuestCount = journalQuest.filter((step) => step.done).length;
  const journalNudge = useMemo(() => {
    if (streak >= 7) return 'You have made this space feel familiar now. Let your diary stay warm and steady, never pressured.';
    if (weeklyCheckIns >= weeklyGoal) return 'You have already given yourself enough attention this week. Anything extra can simply be a small diary note for yourself.';
    if (selectedMood === 'Angry') return 'Anger belongs here too. Try naming what felt unfair, crossed a line, or asked for more care than you had to give.';
    if (selectedMood === 'Anxious' || selectedMood === 'Sad') return 'Let this page stay soft. A short diary entry can help you release a feeling without needing to explain everything.';
    if (draftText.length >= 40) return 'There is already something worth keeping here. Add one more detail only if it feels right.';
    return 'You do not need to write a lot. A title, one line, or one honest sentence is already enough for today\'s diary page.';
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

  async function runSeoStudioReview() {
    if (!isMasterAdmin) {
      setSeoStudioError('Sign in with the master email to open the admin SEO studio.');
      return;
    }
    if (!seoStudioApiKey.trim()) {
      setSeoStudioError('Add a Gemini API key first. It stays only in this browser.');
      return;
    }

    setSeoStudioLoading(true);
    setSeoStudioError('');
    setSeoStudioCopied(false);
    setSeoStudioModelUsed('');

    try {
      const prompt = [
        'You are helping improve Quiet Journal Journey, a calm private online diary website.',
        'Return a concise markdown report with these sections:',
        '1. Quick verdict',
        '2. Highest-impact next actions',
        '3. Homepage copy improvements',
        '4. Meta/schema/internal-link ideas',
        '5. New guide page opportunities',
        '6. What not to change too often',
        'Keep the advice practical, calm in tone, and non-disruptive to users.',
        '',
        `Owner request: ${seoStudioPrompt.trim() || DEFAULT_SEO_STUDIO_PROMPT}`,
        '',
        'Website context:',
        seoStudioContext
      ].join('\n');

      const modelCandidates = [
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-1.5-flash-latest',
        'gemini-1.5-flash',
        'gemini-1.5-pro-latest',
        'gemini-3.8-flash'
      ];

      let lastErrorMessage = 'The AI review could not be completed.';
      let reportText = '';

      for (const modelName of modelCandidates) {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(seoStudioApiKey.trim())}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: prompt }]
              }
            ],
            generationConfig: {
              temperature: 0.6,
              topP: 0.9,
              maxOutputTokens: 1400
            }
          })
        });

        const data = await response.json();
        if (!response.ok) {
          lastErrorMessage = data?.error?.message || `The AI request failed for ${modelName}.`;
          continue;
        }

        reportText = data?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('\n').trim();
        if (reportText) {
          setSeoStudioModelUsed(modelName);
          break;
        }

        lastErrorMessage = `The AI returned an empty report for ${modelName}.`;
      }

      if (!reportText) {
        throw new Error(lastErrorMessage);
      }

      setSeoStudioReport(reportText);
      setSeoStudioLastRun(new Date().toLocaleString());
    } catch (error) {
      console.error('SEO studio review failed', error);
      setSeoStudioError(error.message || 'The AI review could not be completed.');
    } finally {
      setSeoStudioLoading(false);
    }
  }

  async function copySeoStudioReport() {
    if (!seoStudioReport.trim()) return;
    try {
      await navigator.clipboard.writeText(seoStudioReport);
      setSeoStudioCopied(true);
      window.setTimeout(() => setSeoStudioCopied(false), 2400);
    } catch (error) {
      console.error('Could not copy SEO report', error);
      setSeoStudioError('Could not copy the SEO report from this browser.');
    }
  }

  function clearSeoStudioReport() {
    setSeoStudioReport('');
    setSeoStudioLastRun('');
    setSeoStudioError('');
    setSeoStudioCopied(false);
    setSeoStudioModelUsed('');
  }

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

  function addPlannerTodo(event) {
    event.preventDefault();
    const trimmed = plannerTodoDraft.trim();
    if (!trimmed) return;
    setPlannerBoard((current) => ({
      ...current,
      todos: [normalizePlannerTodo({
        id: crypto.randomUUID(),
        text: trimmed,
        status: 'todo',
        priority: plannerTodoPriorityDraft,
        dueDate: plannerTodoDueDateDraft,
        recurrence: plannerTodoRecurrenceDraft
      }), ...current.todos]
    }));
    setPlannerTodoDraft('');
    setPlannerTodoPriorityDraft('medium');
    setPlannerTodoDueDateDraft('');
    setPlannerTodoRecurrenceDraft('none');
  }

  function cyclePlannerTodoStatus(id) {
    setPlannerBoard((current) => ({
      ...current,
      todos: current.todos.flatMap((todo) => {
        if (todo.id !== id) return [todo];
        const nextStatus = todo.status === 'todo' ? 'doing' : todo.status === 'doing' ? 'done' : 'todo';
        const updatedTodo = normalizePlannerTodo({ ...todo, status: nextStatus });
        if (nextStatus !== 'done' || todo.recurrence === 'none') return [updatedTodo];
        const nextDueDate = getNextPlannerDueDate(todo.dueDate || todayISO(), todo.recurrence);
        return [updatedTodo, normalizePlannerTodo({
          ...todo,
          id: crypto.randomUUID(),
          status: 'todo',
          done: false,
          dueDate: nextDueDate
        })];
      })
    }));
  }

  function cyclePlannerTodoPriority(id) {
    setPlannerBoard((current) => ({
      ...current,
      todos: current.todos.map((todo) => {
        if (todo.id !== id) return todo;
        const nextPriority = todo.priority === 'low' ? 'medium' : todo.priority === 'medium' ? 'high' : 'low';
        return normalizePlannerTodo({ ...todo, priority: nextPriority });
      })
    }));
  }

  function startEditingPlannerTodo(todo) {
    setEditingPlannerTodoId(todo.id);
    setEditingPlannerTodoText(todo.text);
    setEditingPlannerTodoPriority(todo.priority);
    setEditingPlannerTodoDueDate(todo.dueDate || '');
    setEditingPlannerTodoRecurrence(todo.recurrence || 'none');
  }

  function cancelEditingPlannerTodo() {
    setEditingPlannerTodoId(null);
    setEditingPlannerTodoText('');
    setEditingPlannerTodoPriority('medium');
    setEditingPlannerTodoDueDate('');
    setEditingPlannerTodoRecurrence('none');
  }

  function savePlannerTodoEdit(id) {
    const trimmed = editingPlannerTodoText.trim();
    if (!trimmed) return;
    setPlannerBoard((current) => ({
      ...current,
      todos: current.todos.map((todo) => todo.id === id
        ? normalizePlannerTodo({
          ...todo,
          text: trimmed,
          priority: editingPlannerTodoPriority,
          dueDate: editingPlannerTodoDueDate,
          recurrence: editingPlannerTodoRecurrence
        })
        : todo)
    }));
    cancelEditingPlannerTodo();
  }

  function reorderPlannerTodo(activeId, targetId) {
    if (!activeId || !targetId || activeId === targetId) return;
    setPlannerBoard((current) => {
      const todos = [...current.todos];
      const activeIndex = todos.findIndex((todo) => todo.id === activeId);
      const targetIndex = todos.findIndex((todo) => todo.id === targetId);
      if (activeIndex < 0 || targetIndex < 0) return current;
      const [movedTodo] = todos.splice(activeIndex, 1);
      todos.splice(targetIndex, 0, movedTodo);
      return { ...current, todos };
    });
  }

  function movePlannerTodo(id, direction) {
    setPlannerBoard((current) => {
      const todos = [...current.todos];
      const currentIndex = todos.findIndex((todo) => todo.id === id);
      const nextIndex = currentIndex + direction;
      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= todos.length) return current;
      const [movedTodo] = todos.splice(currentIndex, 1);
      todos.splice(nextIndex, 0, movedTodo);
      return { ...current, todos };
    });
  }

  function clearCompletedPlannerTodos() {
    setPlannerBoard((current) => ({
      ...current,
      todos: current.todos.filter((todo) => todo.status !== 'done')
    }));
  }

  function deletePlannerTodo(id) {
    if (editingPlannerTodoId === id) cancelEditingPlannerTodo();
    setPlannerBoard((current) => ({
      ...current,
      todos: current.todos.filter((todo) => todo.id !== id)
    }));
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

  function applyEditorCommand(editorRef, updateBody, command) {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || !editor.contains(selection.anchorNode)) return;
    document.execCommand(command);
    updateBody(editor.innerHTML);
  }

  function toggleBulletList(editorRef, updateBody) {
    applyEditorCommand(editorRef, updateBody, 'insertUnorderedList');
  }

  function toggleBoldText(editorRef, updateBody) {
    applyEditorCommand(editorRef, updateBody, 'bold');
  }

  function toggleUnderlineText(editorRef, updateBody) {
    applyEditorCommand(editorRef, updateBody, 'underline');
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

  function openImportantDateEditor(dateKey = selectedCalendarDate) {
    setSelectedCalendarDate(dateKey);
    const existing = importantDates[dateKey];
    setImportanceDraft(existing?.note || '');
    setImportanceTimeDraft(existing?.time || '');
    setImportanceReminderEnabled(existing ? existing.remindersEnabled !== false : true);
    setImportanceModalOpen(true);
  }

  function deleteImportantDate(dateKey) {
    const { [dateKey]: _, ...rest } = importantDates;
    setImportantDates(rest);
    setImportanceModalOpen(false);
    setImportanceDraft('');
    setImportanceTimeDraft('');
    setImportanceReminderEnabled(true);
  }

  async function requestNotificationPermission() {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotificationStatusMessage('This browser does not support notifications.');
      setWebPushStatus('This browser does not support notification permission, so push reminders are unavailable.');
      setNotificationPermission('unsupported');
      return;
    }
    const permission = await window.Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission === 'granted') {
      setNotificationStatusMessage(serviceWorkerReady
        ? 'Service worker-backed reminders are on. Alerts can surface more like an app, and tapping one will reopen the saved date.'
        : 'Browser reminders are on. We will notify for important days today and tomorrow while the journal is open.');
    } else if (permission === 'denied') {
      setNotificationStatusMessage('Notifications are blocked right now. You can re-enable them in your browser settings.');
      setWebPushStatus('Push reminders are blocked until browser notification permission is re-enabled.');
    } else {
      setNotificationStatusMessage('Notification permission was dismissed.');
      setWebPushStatus('Push setup paused because notification permission was dismissed.');
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
        time: importanceTimeDraft,
        remindersEnabled: importanceReminderEnabled,
        createdAt: new Date().toISOString()
      }
    });
    setImportanceModalOpen(false);
    setImportanceDraft('');
    setImportanceTimeDraft('');
    setImportanceReminderEnabled(true);
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

  function startWritingFromInvitation(invitation) {
    const starter = `<p><strong>${invitation.opener}</strong></p><p><br></p>`;
    if (!title.trim()) setTitle(invitation.title);
    setSelectedMood(invitation.mood);
    setBody(starter);
    navigateToTab('write');
    window.setTimeout(() => {
      if (entryBodyRef.current) {
        entryBodyRef.current.innerHTML = starter;
        entryBodyRef.current.focus();
      }
    }, 50);
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
        <div className="site-nav-shell mx-auto max-w-7xl rounded-[2rem] border border-white/80 bg-white/78 p-3 shadow-soft backdrop-blur-xl lg:p-4">
          <div className="flex flex-col gap-2.5 lg:gap-3 xl:flex-row xl:items-center xl:justify-between">
            <a className="flex items-center gap-3" href="#home" onClick={() => openHomeSection('home')}>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-3xl bg-white shadow-lift ring-1 ring-sage-100 overflow-hidden">
                <img src="/logo-transparent.png" alt="Quiet Journal Logo" className="h-10 w-10 object-contain" />
              </div>
              <div>
                <p className="font-display text-2xl font-bold text-sage-900">Quiet Journal Journey</p>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sage-700">Private diary, easy to return to</p>
              </div>
            </a>
            <div className="site-nav-links hidden flex-1 items-center justify-center gap-7 xl:gap-9">
              {[
                { id: 'home', label: 'Home', icon: Waves },
                { id: 'write', label: 'Write', icon: PenLine },
                { id: 'notes', label: 'Notes', icon: FileText },
                { id: 'memories', label: 'Memories', icon: BookOpen },
                { id: 'insights', label: 'Insights', icon: Sparkles }
              ].map((tab) => (
                <button
                  key={tab.id}
                  className={`flex items-center gap-2 text-sm font-extrabold uppercase tracking-widest transition ${activeTab === tab.id ? 'text-sage-950' : 'text-sage-700 hover:text-sage-900'}`}
                  onClick={() => navigateToTab(tab.id)}
                >
                  <tab.icon size={16} /> {tab.label}
                </button>
              ))}
            </div>

            <div className="site-nav-actions flex w-full flex-wrap items-center gap-2 lg:justify-end xl:w-auto xl:max-w-[34rem] xl:flex-none xl:flex-nowrap">
              {user ? (
                <div className="flex min-w-[210px] flex-1 items-center justify-between gap-3 rounded-full border border-sage-200 bg-white/92 px-4 py-2.5 shadow-lift xl:flex-none">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold text-sage-950">{user.displayName || user.email}</p>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-sage-600">{cloudStatus}</p>
                  </div>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-sage-100 text-sage-700 shadow-sm">
                    <ShieldCheck size={15} />
                  </div>
                </div>
              ) : (
                <button className="flex min-w-[208px] flex-1 items-center justify-between gap-3 rounded-full border border-sage-200 bg-white/92 px-4 py-2.5 text-left shadow-lift transition hover:-translate-y-0.5 hover:bg-white xl:flex-none" onClick={signInWithGoogle} disabled={authLoading} type="button">
                  <div>
                    <p className="text-sm font-extrabold text-sage-950">{authLoading ? 'Checking login...' : 'Sign in with Google'}</p>
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-sage-600">Sync across devices</p>
                  </div>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-sage-900 text-white shadow-sm">
                    <ShieldCheck size={15} />
                  </div>
                </button>
              )}
              <div className="flex flex-wrap items-center gap-2 rounded-full border border-sage-100 bg-white/82 p-1.5 shadow-sm xl:flex-nowrap">
                {user && (
                  <button className="rounded-full border border-sage-200 bg-white/90 px-3.5 py-2 text-sm font-bold text-sage-800 transition hover:-translate-y-0.5 hover:bg-white" onClick={handleSignOut} type="button">
                    Sign out
                  </button>
                )}
                {isMasterAdmin && (
                  <div className="flex overflow-hidden rounded-full border border-sage-200 bg-white/90 p-1">
                    <button
                      className={`rounded-full px-3.5 py-2 text-sm font-extrabold transition ${adminViewMode === 'master' ? 'bg-sage-900 text-white shadow-sm' : 'text-sage-700 hover:bg-sage-50'}`}
                      onClick={() => setAdminViewMode('master')}
                      type="button"
                    >
                      Master
                    </button>
                    <button
                      className={`rounded-full px-3.5 py-2 text-sm font-extrabold transition ${adminViewMode === 'user' ? 'bg-sage-900 text-white shadow-sm' : 'text-sage-700 hover:bg-sage-50'}`}
                      onClick={() => setAdminViewMode('user')}
                      type="button"
                    >
                      User
                    </button>
                  </div>
                )}
                {showAdminTools && (
                  <button className="rounded-full border border-sage-800 bg-sage-900 px-3.5 py-2 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-sage-800" onClick={() => openHomeSection('seo-studio')} type="button">
                    SEO studio
                  </button>
                )}
                <button className={`rounded-full border px-3.5 py-2 text-sm font-bold transition hover:-translate-y-0.5 ${comfortMode ? 'border-sage-800 bg-sage-900 text-white' : 'border-sage-200 bg-white/90 text-sage-800 hover:bg-white'}`} onClick={() => setComfortMode(!comfortMode)} type="button">
                  Comfort
                </button>
                <button className="rounded-full border border-sage-200 bg-white/90 px-3.5 py-2 text-sm font-bold text-sage-800 transition hover:-translate-y-0.5 hover:bg-white" onClick={() => (hasPin ? setPinSettingsOpen(true) : setLocked(true))} type="button">
                  {hasPin ? 'Privacy' : 'Set lock'}
                </button>
              </div>
            </div>
          </div>
          <div className="site-nav-links mt-2 hidden flex-wrap items-center justify-center gap-2 rounded-[1.5rem] border border-sage-100 bg-white/88 p-1.5 lg:flex">
            <a className="rounded-full border border-sage-200 bg-white/95 px-4 py-2 text-sm font-extrabold text-sage-950 transition hover:-translate-y-0.5 hover:border-sage-300 hover:bg-white" href="#journal" onClick={() => navigateToTab('write')}>Journal</a>
            <button className="rounded-full border border-sage-200 bg-white/95 px-4 py-2 text-sm font-extrabold text-sage-950 transition hover:-translate-y-0.5 hover:border-sage-300 hover:bg-white" onClick={() => setCustomizerOpen(true)} type="button">Design</button>
            <a className="rounded-full border border-sage-200 bg-white/95 px-4 py-2 text-sm font-extrabold text-sage-950 transition hover:-translate-y-0.5 hover:border-sage-300 hover:bg-white" href="#guides" onClick={() => openHomeSection('guides')}>Guides</a>
            <a className="rounded-full border border-sage-200 bg-white/95 px-4 py-2 text-sm font-extrabold text-sage-950 transition hover:-translate-y-0.5 hover:border-sage-300 hover:bg-white" href="#resources" onClick={() => openHomeSection('resources')}>Resources</a>
            <a className="rounded-full border border-sage-200 bg-white/95 px-4 py-2 text-sm font-extrabold text-sage-950 transition hover:-translate-y-0.5 hover:border-sage-300 hover:bg-white" href="#faq" onClick={() => openHomeSection('faq')}>FAQ</a>
            <a className="rounded-full border border-sage-200 bg-white/95 px-4 py-2 text-sm font-extrabold text-sage-950 transition hover:-translate-y-0.5 hover:border-sage-300 hover:bg-white" href="#contact" onClick={() => openHomeSection('contact')}>Contact</a>
          </div>
        </div>
      </nav>

      {activeTab === 'home' && activeHomeSection === 'overview' && (
      <section id="home" className="mx-auto grid max-w-7xl gap-8 px-6 pb-28 pt-8 lg:grid-cols-12 lg:pb-10 lg:pt-10 xl:gap-10">
        <div className="lg:col-span-8">
          <div className="relative overflow-hidden rounded-[2rem] border border-sage-100/80 bg-white/92 p-8 shadow-soft backdrop-blur-xl lg:p-10 xl:p-11">
            <div className="pointer-events-none absolute -left-10 top-12 h-28 w-28 rounded-full bg-sage-100/45 blur-3xl"></div>
            <div className="pointer-events-none absolute right-4 top-4 h-32 w-32 rounded-full bg-sand-100/40 blur-3xl"></div>
            <div className="relative">
              <div className="mb-8 flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-sage-200 bg-white/95 px-4 py-2 text-sm font-bold text-sage-950 shadow-sm">
                  <Sparkles size={16} /> Quiet online diary
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-sage-200 bg-sage-50/75 px-4 py-2 text-sm font-bold text-sage-800 shadow-sm">
                  <Quote size={14} /> Private · minimal · gentle
                </div>
              </div>
              <h1 className="max-w-3xl font-display text-5xl font-bold leading-[0.96] tracking-tight text-sage-950 md:text-6xl">A quiet place for honest writing.</h1>
              <p className="mt-5 max-w-3xl text-[1.28rem] font-semibold leading-9 text-sage-900">Quiet Journal Journey keeps the page light — enough guidance to begin, enough privacy to be real, and enough calm to return tomorrow.</p>
              <p className="mt-4 max-w-[42rem] text-lg leading-8 text-sage-700">Write one sentence, keep a feeling, or leave a small note for yourself. Nothing here needs to be polished before it matters.</p>

              <div className="mt-9 flex flex-wrap gap-3">
                <a className="inline-flex items-center gap-2 rounded-full bg-sage-900 px-5 py-3 text-sm font-extrabold text-white shadow-lift transition hover:-translate-y-1 hover:bg-sage-800" href="#journal" onClick={() => navigateToTab('write')}>
                  <PenLine size={17} /> Write today’s entry
                </a>
                <button className="inline-flex items-center gap-2 rounded-full border border-sage-200 bg-white px-5 py-3 text-sm font-extrabold text-sage-900 shadow-sm transition hover:-translate-y-1 hover:border-sage-300 hover:bg-sage-50" onClick={() => setCustomizerOpen(true)} type="button">
                  <Palette size={17} /> Choose your theme
                </button>
                {hasPin && (
                  <button className="inline-flex items-center gap-2 rounded-full border border-sage-200 bg-white px-5 py-3 text-sm font-extrabold text-sage-900 shadow-sm transition hover:-translate-y-1 hover:border-sage-300 hover:bg-sage-50" onClick={() => setPinSettingsOpen(true)} type="button">
                    <Shield size={17} /> Privacy settings
                  </button>
                )}
              </div>

              <div className="mt-7 grid gap-3 lg:grid-cols-3">
                {writingInvitations.map((invitation) => (
                  <button key={invitation.title} className="group rounded-[1.55rem] border border-sage-100 bg-white/88 p-4 text-left shadow-sm transition hover:-translate-y-1 hover:border-sage-200 hover:bg-white hover:shadow-lift" onClick={() => startWritingFromInvitation(invitation)} type="button">
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-sage-500">Start with</p>
                    <h3 className="mt-2 text-lg font-extrabold leading-tight text-sage-950 group-hover:text-sage-800">{invitation.opener}...</h3>
                    <p className="mt-2 text-sm leading-6 text-sage-700">{invitation.detail}</p>
                  </button>
                ))}
              </div>

              <div className="mt-7 flex flex-wrap gap-3 text-sm font-semibold text-sage-900">
                <div className="inline-flex items-center gap-2 rounded-full border border-sage-200 bg-white/92 px-4 py-2.5 shadow-sm">
                  <ShieldCheck size={16} /> {hasPin ? 'Protected with a private PIN' : 'Add a soft lock any time'}
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-sage-200 bg-white/92 px-4 py-2.5 shadow-sm">
                  <Sparkles size={16} /> {user ? `${entries.length} entries saved · ${cloudStatus}` : `${entries.length} entries saved · Local-first journaling`}
                </div>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3 text-sm">
                <span className="text-xs font-extrabold uppercase tracking-[0.22em] text-sage-600">Popular guides</span>
                <a className="rounded-full border border-sage-200 bg-white/92 px-4 py-2 font-bold text-sage-900 shadow-sm transition hover:-translate-y-0.5 hover:border-sage-300 hover:bg-white" href="/private-online-diary.html">Private online diary</a>
                <a className="rounded-full border border-sage-200 bg-white/92 px-4 py-2 font-bold text-sage-900 shadow-sm transition hover:-translate-y-0.5 hover:border-sage-300 hover:bg-white" href="/online-diary.html">Online diary</a>
                <a className="rounded-full border border-sage-200 bg-white/92 px-4 py-2 font-bold text-sage-900 shadow-sm transition hover:-translate-y-0.5 hover:border-sage-300 hover:bg-white" href="/diary-app.html">Diary app</a>
                <a className="rounded-full border border-sage-200 bg-white/92 px-4 py-2 font-bold text-sage-900 shadow-sm transition hover:-translate-y-0.5 hover:border-sage-300 hover:bg-white" href="/journal-app.html">Journal app</a>
                <a className="rounded-full border border-sage-200 bg-white/92 px-4 py-2 font-bold text-sage-900 shadow-sm transition hover:-translate-y-0.5 hover:border-sage-300 hover:bg-white" href="/best-diary-app.html">Best diary app</a>
                <a className="rounded-full border border-sage-200 bg-white/92 px-4 py-2 font-bold text-sage-900 shadow-sm transition hover:-translate-y-0.5 hover:border-sage-300 hover:bg-white" href="/how-to-write-a-diary.html">How to write a diary</a>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-3 xl:grid-cols-3">
                <StatCard icon={BookOpen} label="Entries" value={entries.length} tone="bg-sage-100 text-sage-800" />
                <StatCard icon={Sunrise} label="Current streak" value={`${streak} day${streak === 1 ? '' : 's'}`} tone="bg-sand-100 text-sand-500" />
                <StatCard icon={HeartHandshake} label="Average mood" value={averageMood} tone="bg-teal-100 text-teal-700" />
              </div>

              <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1.28fr)_minmax(280px,0.72fr)]">
                <div className="flex min-h-[290px] flex-col justify-between rounded-[1.8rem] border border-white/80 bg-gradient-to-br from-white/90 to-sage-50/70 p-5 shadow-lift backdrop-blur">
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-sage-700">How people use it</p>
                    <h3 className="mt-3 text-2xl font-extrabold leading-tight text-ink">Start with the page that matches what you were actually searching for.</h3>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-sage-800">Some visitors want a private online diary, some want an online journal, and some are simply looking for the easiest place to begin. These guide pages help them land in the right mood without making the homepage feel crowded.</p>
                  </div>
                  <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <a className="rounded-[1.35rem] border border-sage-200 bg-white/95 px-5 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-sage-300 hover:bg-sage-50" href="/private-online-diary.html">
                      <span className="block text-sm font-extrabold text-sage-900">Private online diary</span>
                      <span className="mt-2 block text-[13px] leading-5 text-sage-700">Private entries, mood tracking, and a diary that stays personal.</span>
                    </a>
                    <a className="rounded-[1.35rem] border border-sage-200 bg-white/95 px-5 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-sage-300 hover:bg-sage-50" href="/where-to-write-a-diary-online.html">
                      <span className="block text-sm font-extrabold text-sage-900">Where to write online diary</span>
                      <span className="mt-2 block text-[13px] leading-5 text-sage-700">A beginner-friendly path if you are still deciding where to start.</span>
                    </a>
                    <a className="rounded-[1.35rem] border border-sage-200 bg-white/95 px-5 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-sage-300 hover:bg-sage-50" href="/online-journal.html">
                      <span className="block text-sm font-extrabold text-sage-900">Online journal</span>
                      <span className="mt-2 block text-[13px] leading-5 text-sage-700">Reflection writing with gentle structure and a softer rhythm.</span>
                    </a>
                  </div>
                  <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-sage-700">Useful starting points for diary, journal, and reflection searches.</p>
                </div>
                <div className={`flex min-h-[290px] flex-col justify-between rounded-[1.8rem] border p-5 shadow-sm backdrop-blur ${selectedMoodGuide.shellClass}`}>
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-sage-700">Mood check-in</p>
                      <span className={`rounded-full border px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] shadow-sm ${selectedMoodGuide.chipClass}`}>{selectedMood}</span>
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/90 text-sage-800 shadow-sm">
                        <WeatherGlyph mood={selectedMoodOption} size="text-xl" />
                      </div>
                      <div>
                        <p className="text-lg font-extrabold text-ink">{selectedMoodGuide.title}</p>
                        <p className="text-sm font-semibold text-sage-600">{selectedMoodGuide.summary}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2.5 text-xs font-bold text-sage-700">
                    <span className={`rounded-full border px-3.5 py-1.5 shadow-sm ${selectedMoodGuide.chipClass}`}>Mood journal</span>
                    <span className={`rounded-full border px-3.5 py-1.5 shadow-sm ${selectedMoodGuide.chipClass}`}>Private reflection</span>
                    <span className={`rounded-full border px-3.5 py-1.5 shadow-sm ${selectedMoodGuide.chipClass}`}>Easy check-ins</span>
                  </div>
                  <div className={`mt-5 grid gap-3 rounded-2xl px-4 py-4 text-sm text-sage-700 ring-1 ${selectedMoodGuide.panelClass}`}>
                    <div>
                      <p className="font-extrabold text-sage-900">Carried into today’s page</p>
                      <p className="mt-1 leading-6">{selectedMoodGuide.detail}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-sage-700">
                      <Sparkles size={14} /> Gentle pattern-tracking
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <aside className="flex flex-col gap-5 lg:col-span-4">
          <div className="rounded-[1.9rem] border border-white/80 bg-white/72 p-5 shadow-soft backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-sage-700">Start where it helps most</p>
              <span className="rounded-full border border-sage-100 bg-sage-50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-sage-800">Core spaces</span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:gap-4">
              {[
                { id: 'write', label: 'Write', detail: 'Begin with one honest line', icon: PenLine, tone: 'bg-sage-100 text-sage-800' },
                { id: 'notes', label: 'Notes', detail: 'Keep important things nearby', icon: FileText, tone: 'bg-teal-100 text-teal-700' },
                { id: 'memories', label: 'Memories', detail: 'Return to saved pages', icon: BookOpen, tone: 'bg-sand-100 text-sand-600' },
                { id: 'insights', label: 'Insights', detail: 'See moods over time', icon: Sparkles, tone: 'bg-rose-100 text-rose-700' }
              ].map((tab) => (
                <button key={tab.id} className="group flex items-center gap-3 rounded-2xl border border-sage-100 bg-white/92 px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-sage-200 hover:bg-white hover:shadow-lift" onClick={() => navigateToTab(tab.id)} type="button">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl shadow-sm transition group-hover:scale-105 ${tab.tone}`}>
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

          <div className="rounded-[1.9rem] border border-white/80 bg-gradient-to-br from-white/84 to-sand-50/70 p-6 shadow-soft backdrop-blur-xl">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-sage-800">Why it feels good to write here</p>
            <h3 className="mt-3 text-2xl font-extrabold leading-tight text-ink">The page stays quiet enough for real thoughts to arrive.</h3>
            <p className="mt-3 max-w-sm text-sm leading-7 text-sage-800">There is a clear place to begin, soft privacy cues, and just enough support to help a first sentence feel easy instead of exposed.</p>
            <div className="mt-6 grid gap-3.5 text-sm font-semibold text-sage-900">
              <div className="flex items-center gap-3 rounded-2xl border border-sage-200 bg-white/96 px-4 py-3.5 shadow-sm">
                <Sparkles size={15} className="text-sage-700" />
                <span>Starter lines help you begin without filling the page with noise</span>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-sage-200 bg-white/96 px-4 py-3.5 shadow-sm">
                <ShieldCheck size={15} className="text-sage-700" />
                <span>Privacy cues keep the space personal before you write a word</span>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-sage-200 bg-white/96 px-4 py-3.5 shadow-sm">
                <BookOpen size={15} className="text-sage-700" />
                <span>Saved pages stay easy to revisit when you want perspective later</span>
              </div>
            </div>
          </div>

          <div className="quote-card quote-card-premium quote-card-compact flex flex-col rounded-3xl border border-white/70 p-6 shadow-soft lg:p-7">
            <Quote className="mb-6 opacity-80" size={30} />
            <p className="quote-main-text font-bold leading-tight" style={{ fontFamily: activeQuoteFont, fontSize: Math.max(activeQuoteSize - 4, 28), color: quoteStyle.textColor, lineHeight: 1.4 }}>“{quoteLibrary[quoteIndex % quoteLibrary.length]}”</p>
            <button className="quote-button mt-6 rounded-full bg-white px-5 py-3 text-sm font-extrabold shadow-lift transition hover:-translate-y-1 hover:bg-sage-50" onClick={() => setQuoteIndex((quoteIndex + 1) % quoteLibrary.length)}>
              Another calming quote
            </button>

            <div className="mt-8 rounded-[1.6rem] bg-white/12 px-5 py-5 text-center ring-1 ring-white/12">
              <div className="mx-auto max-w-xl">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-white/90">Quiet reminder</p>
                <p className="mt-3 text-sm leading-7 text-white/95">You can leave one small honest note today and return tomorrow. The page will still be here when you are ready.</p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                  <p className="text-sm font-semibold tracking-[0.08em] text-white/90">{streak > 0 ? `${streak} day${streak === 1 ? '' : 's'} of rhythm` : 'Begin with one gentle page'}</p>
                  <a className="inline-flex items-center rounded-full bg-white px-4 py-2 text-xs font-extrabold uppercase tracking-[0.14em] text-sage-900 shadow-sm transition hover:-translate-y-0.5 hover:bg-sage-50" href="#journal" onClick={() => navigateToTab('write')}>
                    Write now
                  </a>
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
            <div className="rounded-[2.5rem] border border-sage-100/90 bg-white/96 p-7 shadow-soft backdrop-blur lg:p-10">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h2 className="font-display text-4xl font-bold leading-tight text-ink lg:text-5xl">{homeSections.find((s) => s.id === activeHomeSection)?.label || 'Overview'}</h2>
                  <p className="mt-4 max-w-2xl text-lg leading-relaxed text-sage-800">{activeHomeSection === 'overview' ? (latestEntry ? `Your last page is still here. ${rewardLevel.next}` : 'Start with the smallest true thing. This space is built to make writing feel safe, simple, and worth returning to.') : 'Browse gently. The layout stays simple so each section feels easier to read.'}</p>
                </div>
                <a className="inline-flex shrink-0 items-center gap-2 rounded-full bg-sage-900 px-6 py-4 text-sm font-extrabold text-white shadow-lift transition hover:-translate-y-1 hover:bg-sage-800" href="#journal" onClick={() => navigateToTab('write')}>
                  <PenLine size={18} /> Open today’s page
                </a>
              </div>

              <div className="mt-10 grid gap-2.5 rounded-[2rem] border border-sage-100/70 bg-sage-50/45 p-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                {primaryHomeSections.map((section) => (
                  <button
                    key={section.id}
                    className={`rounded-[1.4rem] px-4 py-4 text-left transition ${activeHomeSection === section.id ? 'bg-white text-sage-950 shadow-sm ring-1 ring-sage-100' : 'text-sage-700 hover:bg-white/75 hover:text-sage-950'}`}
                    onClick={() => openHomeSection(section.id)}
                    type="button"
                  >
                    <div className="flex items-center gap-2 text-sm font-extrabold"><section.icon size={16} /> {section.label}</div>
                  </button>
                ))}
              </div>

              {activeHomeSection === 'overview' && (
              <div className="mt-10 space-y-5">
                <div className="grid gap-4 sm:grid-cols-3">
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
                <div className="rounded-[2rem] border border-sage-100 bg-gradient-to-r from-sage-50/85 via-white to-sand-50/80 p-5 shadow-inner">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-sage-600">Most useful paths</p>
                      <h3 className="mt-2 text-2xl font-extrabold leading-tight text-ink">Pick what you came here to do.</h3>
                    </div>
                    <p className="max-w-md text-sm font-semibold leading-6 text-sage-700">The homepage now gives first-time visitors a clearer route into writing, notes, memories, or practical guide pages.</p>
                  </div>
                  <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {[
                      { label: 'Write one line', detail: 'Open a calm page with prompts and a visible save action.', action: () => navigateToTab('write'), icon: PenLine },
                      { label: 'Plan important things', detail: 'Keep tasks, recurring habits, and notes away from diary entries.', action: () => navigateToTab('notes'), icon: FileText },
                      { label: 'Revisit memories', detail: 'Browse saved diary pages when you want to reflect.', action: () => navigateToTab('memories'), icon: BookOpen },
                      { label: 'Read guides', detail: 'Find diary, prompt, privacy, and habit guides grouped by need.', action: () => openHomeSection('guides'), icon: Compass }
                    ].map((item) => (
                      <button key={item.label} className="group rounded-[1.5rem] border border-white/85 bg-white/90 p-4 text-left shadow-sm transition hover:-translate-y-1 hover:border-sage-200 hover:bg-white hover:shadow-lift" onClick={item.action} type="button">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sage-100 text-sage-800 transition group-hover:bg-sage-900 group-hover:text-white"><item.icon size={17} /></div>
                        <h4 className="mt-3 text-base font-extrabold text-ink">{item.label}</h4>
                        <p className="mt-2 text-sm leading-6 text-sage-700">{item.detail}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="rounded-[1.8rem] border border-sage-100/80 bg-white/85 p-5 shadow-sm">
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-sage-600">Popular diary searches</p>
                      <h3 className="mt-2 text-xl font-extrabold text-ink">Quick links for the most common journaling questions.</h3>
                    </div>
                    <button className="text-sm font-extrabold text-sage-800 underline decoration-sage-300 underline-offset-4" onClick={() => openHomeSection('guides')} type="button">View all guide collections</button>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2.5">
                    {(showAllSearches ? seoPopularSearches : seoPopularSearches.slice(0, 8)).map((item) => (
                      <a className="rounded-full border border-sage-200 bg-sage-50/70 px-4 py-2 text-sm font-bold text-sage-800 transition hover:-translate-y-0.5 hover:border-sage-300 hover:bg-white" href={item.href} key={item.href}>{item.label}</a>
                    ))}
                    {!showAllSearches && seoPopularSearches.length > 8 && (
                      <button 
                        onClick={() => setShowAllSearches(true)}
                        className="rounded-full border border-sage-200 border-dashed bg-white/50 px-4 py-2 text-sm font-bold text-sage-600 transition hover:bg-white hover:text-sage-900"
                        type="button"
                      >
                        + {seoPopularSearches.length - 8} more
                      </button>
                    )}
                  </div>
                </div>
              </div>
              )}
            </div>
          </div>

          <aside className="lg:w-[320px] xl:w-[360px] lg:sticky lg:top-28">
            <div className="rounded-[2.5rem] border border-white/80 bg-white/70 p-6 shadow-soft backdrop-blur-xl">
              <div className="flex items-center gap-4 border-b border-sage-100 pb-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sage-100 text-sage-800 shadow-sm">
                  <BookOpen size={20} />
                </div>
                <div>
                  <p className="text-sm font-extrabold text-ink">Today’s diary reminder</p>
                  <p className="text-xs font-semibold text-sage-600">{selectedMood} mood</p>
                </div>
              </div>
              
              <div className="py-6">
                <p className="text-lg font-bold leading-relaxed text-ink italic opacity-90">“Start with the smallest honest version.”</p>
                <p className="mt-4 text-sm leading-7 text-sage-800">Write the detail, feeling, or unfinished thought that is easiest to name first. A short diary page is still enough to hold the day.</p>
              </div>

              <div className="grid gap-2 border-t border-sage-100 pt-5">
                <button className="flex items-center justify-between rounded-2xl bg-white/80 px-5 py-4 text-sm font-extrabold text-sage-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-white" onClick={() => navigateToTab('notes')} type="button">
                  <span className="inline-flex items-center gap-2"><FileText size={16} /> Notes</span>
                  <span className="opacity-50">{openPlannerTodoCount}</span>
                </button>
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

      <section id="journal" className="relative z-10 mx-auto -mt-2 max-w-7xl px-6 py-8 pb-28 lg:-mt-6 lg:pb-8">
        <div className="mb-6 overflow-hidden rounded-[2rem] border border-white/85 bg-gradient-to-r from-white/88 via-sage-50/78 to-sand-50/75 p-3 shadow-soft backdrop-blur xl:p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-sage-600">Choose your diary space</p>
              <h2 className="mt-2 text-2xl font-extrabold text-ink">Writing stays central, with notes, memories, and insights waiting nearby.</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-sage-700">The journal is easy to enter, easy to return to, and now has a separate place for important things and to-dos too.</p>
            </div>
            <div className="grid gap-2 rounded-[1.5rem] bg-white/70 p-2 shadow-inner sm:grid-cols-4">
              {[
                { id: 'write', label: 'Write', detail: draftWordCount ? `${draftWordCount} words in progress` : 'Start here', icon: PenLine },
                { id: 'notes', label: 'Notes', detail: plannerTodoCount ? `${openPlannerTodoCount} still open` : 'Keep important things', icon: FileText },
                { id: 'memories', label: 'Memories', detail: `${entries.length} saved`, icon: BookOpen },
                { id: 'insights', label: 'Insights', detail: `${weeklyCheckIns}/${weeklyGoal} this week`, icon: Sparkles }
              ].map((tab) => (
                <button
                  key={tab.id}
                  className={`rounded-[1.2rem] px-4 py-3 text-left transition ${activeTab === tab.id ? 'bg-white text-sage-950 shadow-sm ring-1 ring-white' : 'text-sage-500 hover:bg-white/75 hover:text-sage-800'}`}
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
        <form className="rounded-[2rem] border border-sage-100/80 bg-white/94 p-4 shadow-soft backdrop-blur sm:p-6 xl:p-8" onSubmit={saveEntry}>
          <div className="mb-5 overflow-hidden rounded-[1.75rem] border border-sage-100/90 bg-gradient-to-r from-white via-sage-50/35 to-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-sm font-extrabold uppercase tracking-[0.22em] text-sage-600">Your page for today</p>
                <h2 className="mt-2 text-[2rem] font-extrabold leading-tight text-ink sm:text-3xl">Keep it simple. Write what feels true.</h2>
                <p className="mt-2 text-sm leading-7 text-sage-700">This page does not need a polished story. A sentence, a fragment, or a few plain words are already enough.</p>
              </div>
              <div className="inline-flex items-center gap-2 self-start rounded-full border border-sage-100 bg-white/98 px-4 py-2 text-sm font-bold text-sage-700 shadow-sm">
                <CalendarDays size={16} /> {formatDate(new Date().toISOString())}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-sage-600 sm:text-xs">
              <span className="rounded-full border border-white/80 bg-white/90 px-3 py-2 shadow-sm">{selectedMood} mood</span>
              <span className="rounded-full border border-white/80 bg-white/90 px-3 py-2 shadow-sm">{draftWordCount} words</span>
              <span className="rounded-full border border-white/80 bg-white/90 px-3 py-2 shadow-sm">{completedQuestCount}/{journalQuest.length} ritual steps</span>
            </div>
          </div>

          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
            <label className="block text-sm font-bold text-sage-800" htmlFor="entry-title">Title, if you want one</label>
            <p className="text-sm font-semibold text-sage-500">It can stay short, plain, or even blank.</p>
          </div>
          <input
            className="journal-title-input mb-5 w-full rounded-[1.75rem] px-5 py-4 text-lg font-semibold outline-none"
            id="entry-title"
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. The part of today I want to keep"
            value={title}
          />

          <div className="mb-4 rounded-[1.6rem] border border-sage-100/90 bg-gradient-to-r from-white via-sage-50/45 to-white p-3.5 shadow-sm backdrop-blur-sm sm:p-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-sage-500">Light controls</p>
                  <p className="mt-1 text-sm font-semibold text-sage-600">Keep only what helps, then let the page stay quiet.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[31rem] xl:grid-cols-3">
                  <label className="block text-[11px] font-extrabold uppercase tracking-[0.22em] text-sage-500">
                    Mood
                    <select className="mt-2 w-full rounded-[1.15rem] border border-sage-100 bg-white/95 px-3.5 py-3 text-sm font-semibold text-ink outline-none transition focus:border-sage-300 focus:ring-4 focus:ring-sage-100/70" onChange={(event) => setSelectedMood(event.target.value)} value={selectedMood}>
                      {weatherOptions.map((mood) => (
                        <option key={mood.label} value={mood.label}>{mood.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-[11px] font-extrabold uppercase tracking-[0.22em] text-sage-500">
                    Font
                    <select className="mt-2 w-full rounded-[1.15rem] border border-sage-100 bg-white/95 px-3.5 py-3 text-sm font-semibold text-ink outline-none transition focus:border-sage-300 focus:ring-4 focus:ring-sage-100/70" onChange={(event) => setJournalStyle({ ...journalStyle, fontId: event.target.value })} value={journalStyle.fontId}>
                      {journalFontOptions.map((font) => (
                        <option key={font.id} value={font.id}>{font.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-[11px] font-extrabold uppercase tracking-[0.22em] text-sage-500">
                    Size
                    <select className="mt-2 w-full rounded-[1.15rem] border border-sage-100 bg-white/95 px-3.5 py-3 text-sm font-semibold text-ink outline-none transition focus:border-sage-300 focus:ring-4 focus:ring-sage-100/70" onChange={(event) => setJournalStyle({ ...journalStyle, sizeId: event.target.value })} value={journalStyle.sizeId}>
                      {journalSizeOptions.map((size) => (
                        <option key={size.id} value={size.id}>{size.label}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 xl:max-w-[22rem] xl:justify-end">
                <button className="rounded-full border border-sage-100 bg-white px-3.5 py-2 text-sm font-bold text-sage-800 shadow-sm transition hover:-translate-y-0.5 hover:border-sage-200 hover:bg-sage-50" onClick={() => toggleBoldText(entryBodyRef, setBody)} title="Bold selected text" type="button">Bold</button>
                <button className="rounded-full border border-sage-100 bg-white px-3.5 py-2 text-sm font-bold text-sage-800 shadow-sm transition hover:-translate-y-0.5 hover:border-sage-200 hover:bg-sage-50" onClick={() => toggleUnderlineText(entryBodyRef, setBody)} title="Underline selected text" type="button">Underline</button>
                <button className="rounded-full border border-sage-100 bg-white px-3.5 py-2 text-sm font-bold text-sage-800 shadow-sm transition hover:-translate-y-0.5 hover:border-sage-200 hover:bg-sage-50" onClick={() => toggleBulletList(entryBodyRef, setBody)} title="Bullet points" type="button">List</button>
                {quickEmojis.slice(0, 4).map((emoji) => (
                  <button key={emoji} className="rounded-full border border-sage-100 bg-white px-3 py-1.5 text-base shadow-sm transition hover:-translate-y-0.5 hover:border-sage-200 hover:bg-sage-50" onClick={() => insertQuickEmoji(emoji)} type="button">
                    {emoji}
                  </button>
                ))}
                <label className="flex cursor-pointer items-center gap-2 rounded-full border border-sage-100 bg-white px-3.5 py-2 text-sm font-extrabold text-sage-800 shadow-sm transition hover:-translate-y-0.5 hover:border-sage-200 hover:bg-sage-50">
                  <ImagePlus size={14} /> Photo
                  <input accept="image/*" className="hidden" onChange={handleEntryImageUpload} type="file" />
                </label>
                <button className="rounded-full bg-ink px-4 py-2 text-sm font-extrabold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-sage-800" type="submit">Save page</button>
              </div>
            </div>
          </div>

          <div className="journal-editor-shell mt-2 rounded-[2rem] p-3 md:p-4">
            <div className="journal-editor-ribbon">quiet page</div>
            <div className="journal-editor-meta journal-editor-top mb-3 flex flex-wrap items-center justify-between gap-2 px-3 text-[11px] font-bold uppercase tracking-[0.22em] text-sage-500 sm:text-xs sm:tracking-[0.24em]">
              <span>{selectedMood} mood · today</span>
              <span>{draftWordCount === 0 ? 'slow is still writing' : `${draftWordCount} words so far`}</span>
            </div>
            <div
              ref={entryBodyRef}
              className="journal-editor journal-editor-soft min-h-[24rem] w-full overflow-auto rounded-[1.75rem] px-6 py-6 outline-none sm:min-h-[30rem]"
              contentEditable
              suppressContentEditableWarning
              style={{ fontFamily: activeJournalFont, fontSize: activeJournalSize, lineHeight: 1.95, color: '#24312e', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
              onInput={(e) => setBody(e.currentTarget.innerHTML)}
              data-placeholder="Start with one true sentence."
            />
            <div className="journal-editor-meta journal-editor-bottom mt-4 flex flex-wrap items-center justify-between gap-2 px-3 text-[11px] font-bold uppercase tracking-[0.22em] text-sage-500 sm:text-xs sm:tracking-[0.24em]">
              <span>A few clear lines are enough for today.</span>
              <span>{streak} day{streak === 1 ? '' : 's'} of returning</span>
            </div>
          </div>
          <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="rounded-[1.2rem] border border-sage-100 bg-white/85 px-4 py-3 text-sm font-semibold leading-6 text-sage-700 shadow-sm">
              {journalNudge}
            </div>
            <button className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink px-7 py-4 font-bold text-white shadow-lift transition hover:-translate-y-1 hover:bg-sage-800 sm:w-auto" type="submit">
              <Plus size={19} /> Save page
            </button>
          </div>

          <div className="mt-6 rounded-[1.75rem] border border-white/80 bg-gradient-to-r from-sage-50/60 via-white to-sand-50/40 p-4 shadow-inner ring-1 ring-white/70 sm:p-6">
            <div className="grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <div className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-sage-700"><Feather size={16} /> If you want a starting line</div>
                <p className="max-w-2xl font-display text-2xl font-bold leading-relaxed text-sage-950">{activePrompt}</p>
                <p className="mt-3 text-sm font-semibold text-sage-700">Use the prompt if it helps, or leave it and begin exactly where your mind already is.</p>
                <button className="mt-5 inline-flex items-center gap-2 rounded-full border border-sage-100 bg-white px-4 py-2 text-sm font-extrabold text-sage-900 shadow-sm transition hover:-translate-y-1 hover:border-sage-200 hover:bg-sage-50" onClick={() => setActivePrompt(prompts[(prompts.indexOf(activePrompt) + 1) % prompts.length])} type="button">
                  <Sparkles size={15} /> New prompt
                </button>
              </div>

              <div className="flex flex-col gap-4 lg:col-span-5">
                <div className="rounded-3xl bg-white/82 p-4 shadow-sm ring-1 ring-sage-100/70">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sage-100 text-xl shadow-sm">
                      {companionIsUploadedMedia ? <HeartHandshake size={20} className="text-sage-700" /> : <span>{companion.character || '💛'}</span>}
                    </div>
                    <div>
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-sage-700">Diary start</p>
                      <h3 className="mt-2 text-lg font-extrabold leading-tight text-sage-950">Write it the way it happened, felt, or stayed with you.</h3>
                      <p className="mt-2 text-sm leading-7 text-sage-700">Try “Today felt…”, “I keep coming back to…”, or “Right now I need…”.</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl bg-white/82 p-4 shadow-sm ring-1 ring-sage-100/70">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-sage-700">Little markers</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {quickEmojis.slice(0, 8).map((emoji) => (
                      <button
                        key={emoji}
                        className="flex h-10 w-10 items-center justify-center rounded-2xl border border-sage-100 bg-white text-xl shadow-sm transition hover:-translate-y-0.5 hover:border-sage-200 hover:shadow-md"
                        onClick={() => addStarterLine(emoji)}
                        type="button"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  <p className="mt-3 text-[11px] font-bold text-sage-600">Tap one if you want a tiny bit of texture on the page.</p>
                </div>

                <div className="rounded-3xl bg-white/82 p-4 shadow-sm ring-1 ring-sage-100/70">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-sage-700">Small ways to begin</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {moodStarterPrompts.map((starter) => (
                      <button key={starter} className="rounded-full border border-sage-100 bg-white px-3.5 py-2 text-sm font-bold text-sage-700 transition hover:-translate-y-0.5 hover:border-sage-200 hover:bg-sage-50" onClick={() => addStarterLine(starter)} type="button">
                        {starter}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-[1.75rem] border border-sage-100 bg-white/88 p-5 shadow-sm ring-1 ring-sage-100/70">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-sage-700">Kept gently</p>
                      <h3 className="mt-2 text-xl font-extrabold leading-tight text-sage-950">A quiet record is forming.</h3>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sage-50 text-2xl text-sage-800 shadow-sm">{rewardLevel.emoji}</div>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-sage-100 bg-sage-50/60 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-sage-600">Pages saved</p>
                      <p className="mt-2 text-2xl font-extrabold text-sage-950">{entries.length}</p>
                    </div>
                    <div className="rounded-2xl border border-sage-100 bg-sage-50/60 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-sage-600">Current rhythm</p>
                      <p className="mt-2 text-2xl font-extrabold text-sage-950">{streak}</p>
                    </div>
                  </div>
                  <div className="mt-4 rounded-2xl border border-sage-100 bg-sage-50/55 px-4 py-3 text-sm leading-7 text-sage-700">
                    {weeklyCheckIns >= weeklyGoal ? 'This week already has enough gentle attention in it.' : `${weeklyGoal - weeklyCheckIns} more check-in${weeklyGoal - weeklyCheckIns === 1 ? '' : 's'} if you want to fill this week softly.`}
                  </div>
                  <button className="mt-4 inline-flex items-center gap-2 rounded-full border border-sage-200 bg-white px-4 py-2 text-sm font-extrabold text-sage-900 shadow-sm transition hover:-translate-y-0.5 hover:bg-sage-50" onClick={() => navigateToTab('memories')} type="button">
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
              <div className={`group relative overflow-hidden rounded-[2rem] border p-6 shadow-lift backdrop-blur transition duration-300 hover:shadow-soft ${selectedMoodGuide.shellClass}`}>
                <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-sage-50/50 blur-2xl group-hover:bg-sage-100/60"></div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-sage-600">Atmosphere</p>
                <div className="mt-5 flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-white text-3xl shadow-soft transition group-hover:scale-110">
                    <WeatherGlyph mood={selectedMoodOption} size="text-2xl" />
                  </div>
                  <div>
                    <p className="text-xl font-extrabold text-ink">{selectedMoodGuide.title}</p>
                    <p className="text-sm font-semibold text-sage-700">{selectedMoodGuide.summary}</p>
                  </div>
                </div>
                <p className="mt-5 text-sm leading-7 text-sage-700">{latestEntry ? `Continuing "${latestEntry.title}".` : selectedMoodGuide.detail}</p>
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
                    { label: 'Open notes', icon: FileText, onClick: () => navigateToTab('notes'), count: openPlannerTodoCount, color: 'text-teal-700' },
                    { label: 'View check-ins', icon: CalendarDays, onClick: () => navigateToTab('insights'), count: importantDateCount, color: 'text-rose-700' }
                  ].map((btn) => (
                    <button key={btn.label} className="group flex items-center justify-between rounded-2xl bg-sage-50/50 px-5 py-3.5 text-left text-sm font-extrabold text-sage-800 ring-1 ring-sage-100/50 transition duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-soft hover:ring-white" onClick={btn.onClick} type="button">
                      <span className={`inline-flex items-center gap-3 ${btn.color}`}><btn.icon size={17} /> {btn.label}</span>
                      {btn.count !== undefined && <span className="rounded-full bg-white px-2 py-0.5 text-[10px] shadow-inner">{btn.count}</span>}
                    </button>
                  ))}
                </div>
                <p className="mt-5 border-t border-sage-100 pt-5 text-sm leading-relaxed text-sage-700 italic">&ldquo;You do not need to finish the whole story today.&rdquo;</p>
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

        {activeTab === 'notes' && (
        <div className="mt-6 grid gap-6 pb-28 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] xl:pb-0">
          <div className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/84 p-6 shadow-soft backdrop-blur xl:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-sage-600 sm:text-sm sm:tracking-widest">Important things</p>
                <h2 className="mt-2 text-3xl font-extrabold leading-tight text-ink sm:text-4xl">One cleaner page for reminders, practical notes, and the things you cannot afford to forget.</h2>
                <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-sage-700">Keep your diary reflective, and let this page hold the useful side of life: plans, deadlines, reminders, and little admin details.</p>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-3xl bg-sage-50 text-sage-700 shadow-sm ring-1 ring-sage-100">
                <FileText size={20} />
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-4">
              {[
                { label: 'Open tasks', value: openPlannerTodoCount },
                { label: 'In progress', value: inProgressPlannerTodoCount },
                { label: 'Completed', value: completedPlannerTodoCount },
                { label: 'Overdue', value: overduePlannerTodoCount }
              ].map((stat) => (
                <div key={stat.label} className="rounded-[1.4rem] border border-sage-100 bg-sage-50/55 px-4 py-4 shadow-sm">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-sage-500">{stat.label}</p>
                  <p className="mt-2 text-2xl font-extrabold text-sage-950">{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-[1.8rem] border border-sage-100/80 bg-sage-50/45 p-5 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-sage-500">Important notes</p>
                  <p className="mt-1 text-sm font-semibold text-sage-600">Keep deadlines, reminders, shopping needs, travel details, or anything else you want in one calmer place.</p>
                </div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-sage-400">{plannerStorageLabel}</p>
              </div>
              <textarea
                className="mt-4 min-h-[22rem] w-full rounded-[1.5rem] border border-sage-100 bg-white px-5 py-4 text-sm leading-7 text-sage-900 outline-none transition focus:border-sage-300 focus:ring-4 focus:ring-sage-100/70"
                onChange={(event) => setPlannerBoard((current) => ({ ...current, text: event.target.value }))}
                placeholder="Keep important things here: dates, calls, shopping needs, ideas, and practical details you want nearby."
                value={plannerBoard.text}
              />
            </div>
          </div>

          <aside className="flex flex-col gap-5">
            <div className="rounded-[1.9rem] border border-white/80 bg-white/78 p-5 shadow-soft backdrop-blur-xl">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-sage-700">Task board</p>
                  <p className="mt-1 text-sm font-semibold text-sage-600">Small, clear tasks with priority, status, and optional due dates so the page stays useful without feeling noisy.</p>
                </div>
                <div className="flex flex-wrap gap-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-sage-700">
                  <button className={`rounded-full border px-3 py-1 transition ${plannerTodoFilter === 'all' ? 'border-sage-900 bg-sage-900 text-white' : 'border-sage-100 bg-white text-sage-700 hover:bg-sage-50'}`} onClick={() => setPlannerTodoFilter('all')} type="button">All {plannerTodoCount}</button>
                  <button className={`rounded-full border px-3 py-1 transition ${plannerTodoFilter === 'open' ? 'border-sage-900 bg-sage-900 text-white' : 'border-sage-100 bg-white text-sage-700 hover:bg-sage-50'}`} onClick={() => setPlannerTodoFilter('open')} type="button">Open {openPlannerTodoCount}</button>
                  <button className={`rounded-full border px-3 py-1 transition ${plannerTodoFilter === 'doing' ? 'border-sage-900 bg-sage-900 text-white' : 'border-sage-100 bg-white text-sage-700 hover:bg-sage-50'}`} onClick={() => setPlannerTodoFilter('doing')} type="button">Doing {inProgressPlannerTodoCount}</button>
                  <button className={`rounded-full border px-3 py-1 transition ${plannerTodoFilter === 'done' ? 'border-sage-900 bg-sage-900 text-white' : 'border-sage-100 bg-white text-sage-700 hover:bg-sage-50'}`} onClick={() => setPlannerTodoFilter('done')} type="button">Done {completedPlannerTodoCount}</button>
                  <button className={`rounded-full border px-3 py-1 transition ${plannerTodoFilter === 'high' ? 'border-sage-900 bg-sage-900 text-white' : 'border-sage-100 bg-white text-sage-700 hover:bg-sage-50'}`} onClick={() => setPlannerTodoFilter('high')} type="button">High {plannerBoard.todos.filter((todo) => todo.priority === 'high').length}</button>
                </div>
              </div>

              <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={addPlannerTodo}>
                <input
                  className="flex-1 rounded-[1.15rem] border border-sage-100 bg-white px-4 py-3 text-sm font-semibold text-sage-900 outline-none transition focus:border-sage-300 focus:ring-4 focus:ring-sage-100/70 sm:col-span-2"
                  onChange={(event) => setPlannerTodoDraft(event.target.value)}
                  placeholder="Add a task"
                  value={plannerTodoDraft}
                />
                <select
                  className="rounded-[1.15rem] border border-sage-100 bg-white px-4 py-3 text-sm font-semibold text-sage-800 outline-none transition focus:border-sage-300 focus:ring-4 focus:ring-sage-100/70"
                  onChange={(event) => setPlannerTodoPriorityDraft(event.target.value)}
                  value={plannerTodoPriorityDraft}
                >
                  <option value="low">Low priority</option>
                  <option value="medium">Medium priority</option>
                  <option value="high">High priority</option>
                </select>
                <input
                  className="rounded-[1.15rem] border border-sage-100 bg-white px-4 py-3 text-sm font-semibold text-sage-800 outline-none transition focus:border-sage-300 focus:ring-4 focus:ring-sage-100/70"
                  min={todayISO()}
                  onChange={(event) => setPlannerTodoDueDateDraft(event.target.value)}
                  type="date"
                  value={plannerTodoDueDateDraft}
                />
                <select
                  className="rounded-[1.15rem] border border-sage-100 bg-white px-4 py-3 text-sm font-semibold text-sage-800 outline-none transition focus:border-sage-300 focus:ring-4 focus:ring-sage-100/70"
                  onChange={(event) => setPlannerTodoRecurrenceDraft(event.target.value)}
                  value={plannerTodoRecurrenceDraft}
                >
                  <option value="none">One-time</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
                <button className="inline-flex items-center justify-center rounded-[1.15rem] bg-sage-900 px-4 py-3 text-white shadow-lift transition hover:-translate-y-0.5 hover:bg-sage-800 sm:col-span-2" type="submit">
                  <Plus size={18} />
                </button>
              </form>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-sage-500">
                <span>{filteredPlannerTodos.length} shown · {overduePlannerTodoCount} overdue</span>
                {completedPlannerTodoCount > 0 && (
                  <button className="rounded-full border border-sage-100 bg-white px-3 py-2 text-sage-700 transition hover:bg-sage-50" onClick={clearCompletedPlannerTodos} type="button">
                    Clear done tasks
                  </button>
                )}
              </div>

              <div className="mt-4 space-y-3">
                {filteredPlannerTodos.length ? filteredPlannerTodos.map((todo) => {
                  const statusTone = todo.status === 'done'
                    ? 'border-sage-700 bg-sage-700 text-white'
                    : todo.status === 'doing'
                      ? 'border-teal-200 bg-teal-50 text-teal-700'
                      : 'border-sage-200 bg-white text-sage-500 hover:border-sage-300 hover:text-sage-600';
                  const priorityTone = todo.priority === 'high'
                    ? 'border-rose-200 bg-rose-50 text-rose-700'
                    : todo.priority === 'low'
                      ? 'border-sage-100 bg-sage-50 text-sage-600'
                      : 'border-amber-200 bg-amber-50 text-amber-700';
                  const isEditingTodo = editingPlannerTodoId === todo.id;
                  return (
                    <div
                      key={todo.id}
                      className={`rounded-[1.4rem] border bg-white px-4 py-3 shadow-sm transition ${draggedPlannerTodoId === todo.id ? 'border-teal-200 opacity-60' : 'border-sage-100'}`}
                      draggable={!isEditingTodo}
                      onDragEnd={() => setDraggedPlannerTodoId(null)}
                      onDragOver={(event) => event.preventDefault()}
                      onDragStart={() => setDraggedPlannerTodoId(todo.id)}
                      onDrop={(event) => { event.preventDefault(); reorderPlannerTodo(draggedPlannerTodoId, todo.id); setDraggedPlannerTodoId(null); }}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          className={`mt-0.5 flex min-h-[2.4rem] min-w-[2.4rem] shrink-0 items-center justify-center rounded-full border px-2 text-[10px] font-extrabold uppercase tracking-[0.14em] transition ${statusTone}`}
                          onClick={() => cyclePlannerTodoStatus(todo.id)}
                          type="button"
                        >
                          {todo.status === 'done' ? 'Done' : todo.status === 'doing' ? 'Doing' : 'To do'}
                        </button>
                        <div className="min-w-0 flex-1">
                          {isEditingTodo ? (
                            <div className="space-y-3">
                              <input
                                className="w-full rounded-2xl border border-sage-100 bg-sage-50/60 px-4 py-3 text-sm font-semibold text-sage-900 outline-none transition focus:border-sage-300 focus:ring-4 focus:ring-sage-100/70"
                                onChange={(event) => setEditingPlannerTodoText(event.target.value)}
                                value={editingPlannerTodoText}
                              />
                              <div className="grid gap-2 sm:grid-cols-3">
                                <select className="rounded-2xl border border-sage-100 bg-white px-3 py-2 text-xs font-bold text-sage-700 outline-none" onChange={(event) => setEditingPlannerTodoPriority(event.target.value)} value={editingPlannerTodoPriority}>
                                  <option value="low">Low priority</option>
                                  <option value="medium">Medium priority</option>
                                  <option value="high">High priority</option>
                                </select>
                                <input className="rounded-2xl border border-sage-100 bg-white px-3 py-2 text-xs font-bold text-sage-700 outline-none" min={todayISO()} onChange={(event) => setEditingPlannerTodoDueDate(event.target.value)} type="date" value={editingPlannerTodoDueDate} />
                                <select className="rounded-2xl border border-sage-100 bg-white px-3 py-2 text-xs font-bold text-sage-700 outline-none" onChange={(event) => setEditingPlannerTodoRecurrence(event.target.value)} value={editingPlannerTodoRecurrence}>
                                  <option value="none">One-time</option>
                                  <option value="daily">Daily</option>
                                  <option value="weekly">Weekly</option>
                                  <option value="monthly">Monthly</option>
                                </select>
                              </div>
                              <div className="flex flex-wrap gap-2 text-[10px] font-extrabold uppercase tracking-[0.18em]">
                                <button className="rounded-full bg-sage-900 px-3 py-2 text-white transition hover:bg-sage-800" onClick={() => savePlannerTodoEdit(todo.id)} type="button">Save edit</button>
                                <button className="rounded-full border border-sage-100 bg-white px-3 py-2 text-sage-600 transition hover:bg-sage-50" onClick={cancelEditingPlannerTodo} type="button">Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className={`text-sm font-semibold leading-6 ${todo.status === 'done' ? 'text-sage-400 line-through' : 'text-sage-800'}`}>{todo.text}</p>
                                <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em]">
                                  <span className={`rounded-full border px-2.5 py-1 ${todo.status === 'done' ? 'border-sage-200 bg-white text-sage-500' : 'border-sage-100 bg-white text-sage-600'}`}>{getPlannerStatusLabel(todo.status)}</span>
                                  <button className={`rounded-full border px-2.5 py-1 transition ${priorityTone}`} onClick={() => cyclePlannerTodoPriority(todo.id)} type="button">
                                    {getPlannerPriorityLabel(todo.priority)} priority
                                  </button>
                                  {todo.dueDate ? <span className={`rounded-full border px-2.5 py-1 ${isPlannerTodoOverdue(todo) ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-sage-100 bg-white text-sage-600'}`}>{isPlannerTodoOverdue(todo) ? 'Overdue' : 'Due'} {formatShortDate(todo.dueDate)}</span> : null}
                                  <span className="rounded-full border border-teal-100 bg-teal-50 px-2.5 py-1 text-teal-700">{getPlannerRecurrenceLabel(todo.recurrence)}</span>
                                </div>
                              </div>
                              <div className="flex shrink-0 flex-col gap-2 text-sage-400">
                                <button className="rounded-full border border-sage-100 bg-white p-1.5 transition hover:text-sage-700" onClick={() => startEditingPlannerTodo(todo)} type="button" aria-label="Edit task">
                                  <PenLine size={15} />
                                </button>
                                <button className="rounded-full border border-sage-100 bg-white p-1.5 transition hover:text-sage-700" onClick={() => movePlannerTodo(todo.id, -1)} type="button" aria-label="Move task up">
                                  <ArrowUp size={15} />
                                </button>
                                <button className="rounded-full border border-sage-100 bg-white p-1.5 text-xs font-black transition hover:text-sage-700" onClick={() => movePlannerTodo(todo.id, 1)} type="button" aria-label="Move task down">
                                  ↓
                                </button>
                                <button className="rounded-full border border-sage-100 bg-white p-1.5 transition hover:text-rose-500" onClick={() => deletePlannerTodo(todo.id)} type="button" aria-label="Delete task">
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="rounded-[1.4rem] border border-dashed border-sage-200 bg-sage-50/45 px-4 py-5 text-sm font-semibold leading-6 text-sage-500">
                    No tasks match this view yet. Try another filter or add a new task with a priority, due date, or recurring rhythm.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[1.9rem] border border-white/80 bg-white/78 p-5 shadow-soft backdrop-blur-xl">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-sage-700">Upcoming reminders</p>
                  <p className="mt-1 text-sm font-semibold text-sage-600">A calm shortlist of the dates that are coming up next.</p>
                </div>
                <div className="flex flex-wrap gap-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-sage-700">
                  <span className="rounded-full border border-sage-100 bg-sage-50 px-3 py-1">{upcomingReminderCount} upcoming</span>
                  <span className="rounded-full border border-sage-100 bg-white px-3 py-1">{reminderStorageLabel}</span>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {upcomingReminderPreview.length ? upcomingReminderPreview.map((item) => (
                  <button className="w-full rounded-[1.4rem] border border-sage-100 bg-sage-50/45 px-4 py-3 text-left transition hover:-translate-y-0.5 hover:bg-white hover:shadow-sm" key={item.dateKey} onClick={() => { setSelectedCalendarDate(item.dateKey); navigateToTab('memories'); }} type="button">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-extrabold leading-6 text-sage-900">{item.note}</p>
                        <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-sage-500">{formatDate(item.dateKey)}{item.time ? ` · ${formatReminderTime(item.time)}` : ''}</p>
                      </div>
                      <span className="rounded-full border border-sage-100 bg-white px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-sage-700">{item.relativeLabel}</span>
                    </div>
                  </button>
                )) : (
                  <div className="rounded-[1.4rem] border border-dashed border-sage-200 bg-sage-50/45 px-4 py-5 text-sm font-semibold leading-6 text-sage-500">
                    No upcoming reminders yet. Mark an important date in the calendar and it will show up here.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[1.9rem] border border-white/80 bg-white/78 p-5 shadow-soft backdrop-blur-xl">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-sage-700">Keep it simple</p>
              <div className="mt-4 space-y-3 text-sm font-semibold leading-7 text-sage-700">
                <p>Use this page for practical life details, not emotional journaling.</p>
                <p>Keep the to-do list short enough that it still feels calm to open.</p>
                <p>Move back to writing when you want reflection instead of admin.</p>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <button className="inline-flex items-center gap-2 rounded-full bg-sage-900 px-4 py-2 text-sm font-extrabold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-sage-800" onClick={() => navigateToTab('write')} type="button">
                  <PenLine size={15} /> Go back to writing
                </button>
                <button className="inline-flex items-center gap-2 rounded-full border border-sage-200 bg-white px-4 py-2 text-sm font-extrabold text-sage-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-sage-50" onClick={() => navigateToTab('insights')} type="button">
                  <CalendarDays size={15} /> Open calendar
                </button>
              </div>
            </div>
          </aside>
        </div>
        )}

        {activeTab === 'insights' && (
        <div className="mt-6 grid gap-6 pb-28 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] xl:pb-0">
          <div className="overflow-hidden rounded-[2rem] border border-white/80 bg-gradient-to-br from-white/88 via-sage-50/68 to-sand-50/72 p-4 shadow-soft backdrop-blur sm:p-6 xl:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-sage-600 sm:text-sm sm:tracking-widest">Reflection pattern</p>
                <h2 className="mt-2 text-3xl font-extrabold leading-tight text-ink sm:text-4xl">Your recent journal check-ins</h2>
                <p className="mt-3 text-sm font-semibold leading-7 text-sage-700">See the week in a calmer way: mood shifts, small streaks, and the gentle rhythm you are building by returning.</p>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-3xl bg-white text-sage-700 shadow-sm">
                <Moon size={20} />
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-sage-700">
              <span className="rounded-full border border-white/90 bg-white/88 px-3 py-2 shadow-sm">{weeklyCheckIns}/{weeklyGoal} check-ins this week</span>
              <span className="rounded-full border border-white/90 bg-white/88 px-3 py-2 shadow-sm">{entries.length} pages in your archive</span>
              <span className="rounded-full border border-white/90 bg-white/88 px-3 py-2 shadow-sm">{unlockedAchievementCount}/{achievementBadges.length} keepsakes lit</span>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/80 bg-white/80 p-6 shadow-soft backdrop-blur xl:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-sand-500 sm:text-sm sm:tracking-widest">This week so far</p>
            <p className="mt-3 text-4xl font-extrabold text-sage-950">{weeklyCheckIns}/{weeklyGoal}</p>
            <p className="mt-3 text-sm font-semibold leading-7 text-sage-700">{weeklyCheckIns >= weeklyGoal ? 'You already gave yourself enough room this week.' : `${weeklyGoal - weeklyCheckIns} more soft check-ins if you want to fill this week.`}</p>
            <div className="mt-5 h-2.5 w-full overflow-hidden rounded-full bg-sage-100">
              <div className="h-full rounded-full bg-gradient-to-r from-sage-500 to-teal-500 transition-all duration-700" style={{ width: `${Math.min((weeklyCheckIns / weeklyGoal) * 100, 100)}%` }}></div>
            </div>
            <div className="mt-6 rounded-[1.75rem] bg-gradient-to-br from-rose-50 to-white p-5 shadow-inner">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-rose-500 sm:text-sm sm:tracking-widest">Keepsake path</p>
              <div className="mt-3 flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-white text-3xl shadow-sm">{rewardLevel.emoji}</div>
                <div>
                  <p className="text-lg font-extrabold text-sage-950">{rewardLevel.title}</p>
                  <p className="text-sm font-semibold leading-6 text-sage-700">{entriesToNextReward === 0 ? 'Your next bloom is here.' : `${entriesToNextReward} pages until the next bloom.`}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/82 p-6 shadow-soft backdrop-blur xl:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-sage-600 sm:text-sm sm:tracking-widest">Mood garden</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-sage-700">A softer chart view so the patterns stay readable on both mobile and desktop.</p>
              </div>
              <div className="rounded-full bg-sage-100 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-sage-800">Weekly summary</div>
            </div>
            <div className="mt-5">
              <MoodChart entries={entries} weatherOptions={weatherOptions} />
            </div>
            <div className="mt-5 rounded-[1.75rem] bg-white p-5 text-sm font-bold leading-7 text-sage-900 shadow-inner">
              {weeklySummary}
            </div>
          </div>

          <div className="grid gap-6">
            <div className="rounded-[2rem] border border-white/80 bg-white/82 p-6 shadow-soft backdrop-blur xl:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-teal-600 sm:text-sm sm:tracking-widest">{returnRitual.eyebrow}</p>
              <p className="mt-2 text-2xl font-extrabold leading-tight text-sage-950">{returnRitual.title}</p>
              <p className="mt-3 text-sm font-semibold leading-7 text-sage-700">{returnRitual.text}</p>
              <button className="mt-5 inline-flex items-center gap-2 rounded-full bg-sage-900 px-4 py-2.5 text-sm font-extrabold text-white shadow-lift transition hover:-translate-y-0.5 hover:bg-sage-800" onClick={() => navigateToTab('write')} type="button">
                <PenLine size={16} /> Return to writing
              </button>
            </div>

            <div className="rounded-[2rem] border border-white/80 bg-white/82 p-6 shadow-soft backdrop-blur xl:p-8">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-sage-600">Keepsake shelf</p>
                <div className="rounded-full bg-sage-100 px-3 py-1 text-[10px] font-extrabold text-sage-800">{unlockedAchievementCount}/{achievementBadges.length}</div>
              </div>
              <div className="mt-4 grid grid-cols-6 gap-2">
                {achievementBadges.map((badge) => (
                  <div key={badge.id} className={`flex aspect-square items-center justify-center rounded-2xl text-xl shadow-sm transition-all ${badge.unlocked ? 'bg-white grayscale-0' : 'bg-sage-50/50 opacity-40 grayscale'}`} title={`${badge.title}: ${badge.hint}`}>
                    {badge.emoji}
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm font-semibold leading-7 text-sage-700">Every return adds another little sign that this space is becoming yours.</p>
            </div>
          </div>
        </div>
        )}

        {activeTab === 'memories' && (
        <div className="mt-6 grid gap-6 pb-24 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:pb-0">

          <div className="overflow-hidden rounded-[2rem] border border-white/80 bg-gradient-to-br from-white/88 via-sage-50/68 to-sand-50/72 p-4 shadow-soft backdrop-blur sm:p-6 lg:p-8">
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-sage-600 sm:text-sm sm:tracking-widest">Journal calendar</p>
                <h2 className="mt-1 text-2xl font-extrabold text-ink sm:text-3xl">Keep the diary pages you want to revisit.</h2>
                <p className="mt-2 text-sm font-semibold leading-7 text-sage-700">Mark meaningful dates, revisit saved pages, and return to entries that still matter when you want perspective later.</p>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-3xl bg-white text-sage-700 shadow-sm">
                <CalendarDays size={20} />
              </div>
            </div>
            <div className="mb-5 flex flex-wrap gap-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-sage-700 sm:text-xs sm:tracking-[0.18em]">
              <span className="rounded-full border border-white/90 bg-white/88 px-3 py-2 shadow-sm">{importantDateCount} marked dates</span>
              <span className="rounded-full border border-white/90 bg-white/88 px-3 py-2 shadow-sm">{upcomingReminderCount} upcoming reminders</span>
              <span className="rounded-full border border-white/90 bg-white/88 px-3 py-2 shadow-sm">{selectedDateEntries.length} page{selectedDateEntries.length === 1 ? '' : 's'} on this day</span>
            </div>
            <div className="mb-4 rounded-[1.5rem] bg-white/82 p-2.5 shadow-inner sm:rounded-[1.75rem] sm:p-3">
              <div className="flex items-center justify-between gap-2 rounded-[1.2rem] bg-white/75 px-2 py-2 shadow-sm">
                <button className="rounded-full bg-white px-3 py-2 text-sm font-extrabold text-sage-800 shadow-sm" onClick={() => setCalendarMonth(shiftMonthKey(calendarMonth, -1))} type="button">‹</button>
                <p className="text-center text-sm font-extrabold text-sage-950 sm:text-base">{formatMonthLabel(calendarMonth)}</p>
                <button className="rounded-full bg-white px-3 py-2 text-sm font-extrabold text-sage-800 shadow-sm" onClick={() => setCalendarMonth(shiftMonthKey(calendarMonth, 1))} type="button">›</button>
              </div>
              <button className="mt-3 inline-flex w-full items-center justify-center rounded-full border border-sage-100 bg-white px-3 py-2 text-xs font-extrabold uppercase tracking-[0.18em] text-sage-700 shadow-sm transition hover:bg-sage-50 sm:w-auto" onClick={() => { setCalendarMonth(todayISO().slice(0, 7)); setSelectedCalendarDate(todayISO()); }} type="button">
                Jump to today
              </button>
            </div>
            <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-extrabold uppercase tracking-[0.12em] text-sage-500 sm:gap-1 sm:text-xs sm:tracking-wider">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <div key={day}>{day}</div>)}
            </div>
            <div className="mt-2 grid grid-cols-7 gap-0.5 sm:gap-1">
              {calendarDays.map((day, index) => {
                const dayEntries = day ? entriesByDate[day.dateKey] || [] : [];
                const hasImportantDate = day ? Boolean(importantDates[day.dateKey]) : false;
                const isSelected = day?.dateKey === selectedCalendarDate;
                const isToday = day?.dateKey === todayISO();
                return day ? (
                  <button
                    className={`relative aspect-square rounded-xl border text-xs font-extrabold transition hover:-translate-y-0.5 sm:rounded-2xl sm:text-sm ${isSelected ? 'border-sage-800 bg-sage-900 text-white shadow-lift' : isToday ? 'border-sage-300 bg-sage-100 text-sage-900' : 'border-sage-100 bg-white text-sage-800 hover:bg-sage-50'}`}
                    key={day.dateKey}
                    onClick={() => {
                      setSelectedCalendarDate(day.dateKey);
                      setImportanceModalOpen(false);
                    }}
                    type="button"
                  >
                    {day.day}
                    {hasImportantDate && <span className={`absolute right-1 top-1 text-[9px] sm:right-1.5 sm:top-1.5 sm:text-[10px] ${isSelected ? 'text-sand-100' : 'text-rose-500'}`}>✦</span>}
                    {dayEntries.length > 0 && <span className={`absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full sm:h-1.5 sm:w-1.5 ${isSelected ? 'bg-white' : 'bg-sage-700'}`} />}
                  </button>
                ) : <div key={`blank-${index}`} />;
              })}
            </div>
            <div className="mt-5 rounded-[1.75rem] border border-white/80 bg-white/92 p-4 shadow-inner sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-2xl">
                  <p className="text-xs font-extrabold uppercase tracking-widest text-sage-600">{selectedCalendarDate}</p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-sage-700">Keep the calendar focused on the days that matter, then let notification permission and service-worker support surface today and tomorrow reminders more cleanly.</p>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto lg:min-w-[230px]">
                  <button className={`w-full rounded-full px-4 py-2.5 text-sm font-extrabold transition ${selectedImportantDate ? 'bg-sage-100 text-sage-800 hover:bg-sage-200' : 'bg-sage-900 text-white hover:bg-sage-800'}`} onClick={() => openImportantDateEditor(selectedCalendarDate)} type="button">
                    {selectedImportantDate ? 'Edit reminder' : 'Add reminder'}
                  </button>
                  <button className={`w-full rounded-full border px-4 py-2.5 text-sm font-extrabold transition ${notificationPermission === 'granted' ? 'border-sage-200 bg-white text-sage-700 hover:bg-sage-50' : 'border-sage-900 bg-white text-sage-900 hover:bg-sage-50'}`} onClick={requestNotificationPermission} type="button">
                    {notificationPermission === 'granted' ? 'Notifications allowed' : 'Allow browser notifications'}
                  </button>
                  {selectedImportantDate && (
                    <button className="w-full rounded-full bg-rose-100 px-4 py-2.5 text-sm font-extrabold text-rose-700 transition hover:bg-rose-200" onClick={() => deleteImportantDate(selectedCalendarDate)} type="button">
                      Remove reminder
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-sage-700">
                <span className="rounded-full border border-sage-100 bg-sage-50 px-3 py-2">{notificationPermission === 'granted' ? 'Browser permission on' : notificationPermission === 'unsupported' ? 'Notifications unsupported' : 'Permission needed'}</span>
                <span className="rounded-full border border-sage-100 bg-white px-3 py-2">{reminderStorageLabel}</span>
                <span className="rounded-full border border-sage-100 bg-white px-3 py-2">{reminderDeliveryLabel}</span>
                <span className="rounded-full border border-sage-100 bg-white px-3 py-2">{reminderBehaviorLabel}</span>
                <span className={`rounded-full border px-3 py-2 ${webPushTokenReady ? 'border-teal-200 bg-teal-50 text-teal-700' : 'border-sage-100 bg-white text-sage-700'}`}>{webPushTokenReady ? 'True push ready' : 'Push setup in progress'}</span>
              </div>

              <div className="mt-4 rounded-2xl border border-sage-100 bg-white/90 px-4 py-3 text-sm font-semibold leading-6 text-sage-700">
                {webPushStatus}
              </div>

              {notificationStatusMessage && (
                <div className="mt-4 rounded-2xl border border-sage-100 bg-sage-50/80 px-4 py-3 text-sm font-semibold leading-6 text-sage-700">
                  {notificationStatusMessage}
                </div>
              )}

              {nextUpcomingReminder && (
                <button className="mt-4 w-full rounded-2xl border border-sage-100 bg-sage-50/75 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:bg-white" onClick={() => setSelectedCalendarDate(nextUpcomingReminder.dateKey)} type="button">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-sage-600">Next reminder</p>
                      <p className="mt-2 text-sm font-extrabold leading-6 text-sage-900">{nextUpcomingReminder.note}</p>
                      <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-sage-500">{formatDate(nextUpcomingReminder.dateKey)}{nextUpcomingReminder.time ? ` · ${formatReminderTime(nextUpcomingReminder.time)}` : ''}</p>
                    </div>
                    <span className="rounded-full border border-sage-100 bg-white px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-sage-700">{nextUpcomingReminder.relativeLabel}</span>
                  </div>
                </button>
              )}

              {selectedImportantDate && (
                <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50/70 p-4 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-rose-600">Important reminder</p>
                      <p className="mt-2 text-sm font-semibold leading-6 text-sage-800">{selectedImportantDate.note}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-[11px] font-extrabold uppercase tracking-[0.18em] text-rose-700">
                      {selectedImportantDate.time && <span className="rounded-full border border-rose-100 bg-white/90 px-3 py-2">{formatReminderTime(selectedImportantDate.time)}</span>}
                      <span className="rounded-full border border-rose-100 bg-white/90 px-3 py-2">{selectedImportantDate.remindersEnabled ? 'Reminders on' : 'Reminders off'}</span>
                      <span className="rounded-full border border-rose-100 bg-white/90 px-3 py-2">{getRelativeReminderLabel(selectedCalendarDate)}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-4 rounded-2xl border border-sage-100 bg-white/90 p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-sage-600">Upcoming reminders</p>
                    <p className="mt-1 text-sm font-semibold leading-6 text-sage-700">See the next few important dates in one place, then jump straight to the day you want.</p>
                  </div>
                  <span className="rounded-full border border-sage-100 bg-sage-50 px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-sage-700">{upcomingReminderCount} saved</span>
                </div>
                <div className="mt-4 space-y-3">
                  {upcomingReminderPreview.length ? upcomingReminderPreview.map((item) => (
                    <button className={`w-full rounded-2xl border px-4 py-3 text-left transition hover:-translate-y-0.5 hover:bg-sage-50 ${item.dateKey === selectedCalendarDate ? 'border-sage-300 bg-sage-50' : 'border-sage-100 bg-white'}`} key={item.dateKey} onClick={() => setSelectedCalendarDate(item.dateKey)} type="button">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-extrabold leading-6 text-sage-900">{item.note}</p>
                          <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-sage-500">{formatDate(item.dateKey)}{item.time ? ` · ${formatReminderTime(item.time)}` : ''}</p>
                        </div>
                        <span className="rounded-full border border-sage-100 bg-sage-50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-sage-700">{item.relativeLabel}</span>
                      </div>
                    </button>
                  )) : (
                    <p className="rounded-2xl border border-dashed border-sage-200 bg-sage-50/50 px-4 py-4 text-sm font-semibold leading-6 text-sage-500">No upcoming reminders yet. Add one for birthdays, meetings, travel, deadlines, or anything you want to see ahead of time.</p>
                  )}
                </div>
              </div>

              {importanceModalOpen && (
                <div className="mt-4 rounded-2xl border border-sage-100 bg-sage-50/80 p-4 shadow-sm">
                  <label className="block text-sm font-bold text-sage-800">
                    What should they remember?
                    <textarea
                      className="mt-3 min-h-[96px] w-full rounded-2xl border border-sage-100 bg-white px-4 py-3 font-semibold leading-6 text-sage-900 outline-none transition focus:border-sage-300"
                      maxLength={180}
                      onChange={(event) => setImportanceDraft(event.target.value)}
                      placeholder="Client call, interview, exam, anniversary, family plan..."
                      value={importanceDraft}
                    />
                  </label>
                  <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
                    <label className="block text-sm font-bold text-sage-800">
                      Time (optional)
                      <input
                        className="mt-2 w-full rounded-2xl border border-sage-100 bg-white px-4 py-3 font-semibold text-sage-900 outline-none transition focus:border-sage-300"
                        onChange={(event) => setImportanceTimeDraft(event.target.value)}
                        type="time"
                        value={importanceTimeDraft}
                      />
                    </label>
                    <label className="flex items-center gap-3 rounded-2xl border border-sage-100 bg-white px-4 py-3 text-sm font-semibold text-sage-800">
                      <input checked={importanceReminderEnabled} className="h-4 w-4 rounded border-sage-300 text-sage-700 focus:ring-sage-300" onChange={(event) => setImportanceReminderEnabled(event.target.checked)} type="checkbox" />
                      Notify me on the day and the day before if browser notifications are allowed
                    </label>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button className="rounded-full bg-sage-900 px-4 py-2 text-sm font-extrabold text-white transition hover:bg-sage-800" onClick={saveImportantDate} type="button">Save reminder</button>
                    <button className="rounded-full border border-sage-200 bg-white px-4 py-2 text-sm font-extrabold text-sage-700 transition hover:bg-sage-50" onClick={() => setImportanceModalOpen(false)} type="button">Cancel</button>
                  </div>
                </div>
              )}
              {selectedDateEntries.length ? (
                <div className="mt-4 space-y-3">
                  {selectedDateEntries.map((entry) => (
                    <button className="w-full rounded-2xl border border-sage-100 bg-sage-50/78 p-3 text-left transition hover:-translate-y-0.5 hover:bg-white hover:shadow-sm" key={entry.id} onClick={() => setSelectedEntry(entry)} type="button">
                      <p className="font-extrabold text-sage-950">{entry.title}</p>
                      <p className="mt-1 line-clamp-2 text-sm font-semibold leading-6 text-sage-700">{getPlainTextFromHtml(entry.body || entry.prompt || '') || 'Photo entry'}</p>
                    </button>
                  ))}
                </div>
              ) : <p className="mt-4 text-sm font-semibold leading-6 text-sage-700">No entry for this date yet. Pick this day as your next little check-in.</p>}
            </div>
          </div>

          <div className="flex h-full flex-col overflow-hidden rounded-[2rem] border border-white/80 bg-gradient-to-br from-white/90 via-white/84 to-sand-50/72 p-4 shadow-soft backdrop-blur sm:p-6 lg:p-8">
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-3">
                <CalendarDays className="text-sage-700" size={18} />
                <div>
                  <h2 className="text-2xl font-extrabold text-ink sm:text-3xl">Your positivity archive</h2>
                  <p className="mt-1 text-sm font-semibold leading-7 text-sage-700">Open any page to read the full memory, with a calmer layout that uses the whole panel more gracefully.</p>
                </div>
              </div>
              <div className="rounded-full bg-sage-100 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.18em] text-sage-700 sm:text-[11px]">
                {entries.length} saved
              </div>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto pr-0 min-h-[24rem] sm:min-h-[32rem] sm:pr-2 xl:min-h-0">
              {!entries.length && <p className="rounded-3xl bg-white p-5 font-semibold leading-7 text-sage-900 shadow-inner">No entries yet. Start with one sentence if that is all you have today.</p>}
              {entries.map((entry) => {
                const effectiveMoodLabel = { 'Grounded': 'Happy', 'Soft': 'Calm', 'Okay': 'Neutral', 'Heavy': 'Sad', 'Stormy': 'Anxious' }[entry.mood] || entry.mood;
                const mood = weatherOptions.find((item) => item.label === effectiveMoodLabel) || weatherOptions.find(m => m.label === entry.mood) || moods[2];
                return (
                  <article
                    className="group w-full cursor-pointer rounded-3xl border border-sage-100 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lift sm:p-5"
                    key={entry.id}
                    onClick={() => setSelectedEntry(entry)}
                  >
                    <div className="flex flex-col gap-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-sage-600">
                        <span className="inline-flex items-center gap-2 rounded-full bg-sage-50 px-3 py-1.5 text-sage-700"><WeatherGlyph mood={mood} size="text-base" /> {entry.mood}</span>
                        <span className="rounded-full bg-white px-3 py-1.5 ring-1 ring-sage-100">{formatDate(entry.createdAt)}</span>
                      </div>
                      <h3 className="text-xl font-extrabold leading-tight text-ink">{entry.title}</h3>
                      <p className="mt-3 whitespace-pre-line break-words leading-7 text-sage-800">
                        {(() => {
                          const tempDiv = document.createElement('div');
                          tempDiv.innerHTML = entry.body || entry.prompt || '';
                          const images = tempDiv.querySelectorAll('img');
                          let preview = tempDiv.textContent || tempDiv.innerText || '';
                          if (images.length > 0) preview = '📷 ' + preview;
                          preview = preview.trim();
                          return preview.length > 180 ? `${preview.slice(0, 180).trim()}…` : preview;
                        })()}
                      </p>
                      <div className="mt-5 flex items-center justify-between gap-4 border-t border-sage-50 pt-4">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-sage-500">
                          <span className="rounded-full bg-sage-50 px-3 py-1">Open full page</span>
                          {entry.prompt && <span className="rounded-full bg-rose-50 px-3 py-1 text-rose-700">Prompt kept</span>}
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
          title="A private online diary designed to feel calm, personal, and easy to return to."
          text="Quiet Journal Journey is a private online diary built to make journaling feel light, repeatable, and emotionally safe — a softer place to notice your thoughts, moods, and everyday life."
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
          text="Some people want a private diary, some want an online diary, some want a diary app or journal app, some want an online journal, and some want help with how to write a diary. These pages help readers find the calmest place to begin."
        />
        <div className="mb-6 rounded-[1.8rem] border border-white/80 bg-white/82 p-5 shadow-lift backdrop-blur">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-sage-700">Most searched topics</p>
              <h3 className="mt-2 text-2xl font-extrabold text-ink">Jump straight to the guide that matches the search intent.</h3>
            </div>
            <p className="max-w-xl text-sm leading-7 text-sage-800">These quick links strengthen internal linking for SEO and make the guide area easier to scan for visitors who already know what they want.</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2.5">
            {seoPopularSearches.map((item) => (
              <a className="rounded-full border border-sage-200 bg-sage-50/70 px-4 py-2 text-sm font-bold text-sage-800 transition hover:-translate-y-0.5 hover:border-sage-300 hover:bg-white" href={item.href} key={item.href}>{item.label}</a>
            ))}
          </div>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {seoLandingBlocks.slice(0, 6).map((item) => (
            <article className="customizable-card rounded-3xl border border-white/70 bg-white/80 p-6 shadow-lift backdrop-blur transition hover:-translate-y-1 hover:bg-white/95" key={item.title}>
              <div className="rounded-full bg-sage-100 px-3 py-1 text-xs font-extrabold uppercase tracking-widest text-sage-800">Reader guide</div>
              <h3 className="mt-4 text-2xl font-extrabold leading-tight text-ink">{item.title}</h3>
              <p className="mt-4 leading-8 text-sage-800">{item.text}</p>
              <a className="mt-5 inline-flex text-sm font-bold text-sage-900 underline decoration-sage-300 underline-offset-4" href={item.href}>Open guide</a>
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
            <a className="inline-flex items-center justify-center rounded-full bg-sage-900 px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-sage-800" href="/online-diary.html">
              Browse guides
            </a>
          </div>
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            {seoGuideGroups.map((group) => (
              <article className="rounded-[1.8rem] border border-sage-100/80 bg-sand-50/70 p-5 shadow-sm" key={group.title}>
                <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-sage-700">Guide collection</p>
                <h4 className="mt-3 text-2xl font-extrabold leading-tight text-ink">{group.title}</h4>
                <p className="mt-3 text-sm leading-7 text-sage-800">{group.description}</p>
                <div className="mt-5 grid gap-2">
                  {group.links.map((page) => (
                    <a className="group flex items-start justify-between gap-3 rounded-2xl border border-white/80 bg-white/82 px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-sage-200 hover:bg-white" href={page.href} key={page.href}>
                      <span>
                        <span className="block text-sm font-extrabold text-sage-950 group-hover:text-sage-800">{page.title}</span>
                        <span className="mt-1 block text-xs font-semibold leading-5 text-sage-600">{page.text}</span>
                      </span>
                      <span className="shrink-0 rounded-full bg-sage-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-sage-700">Read</span>
                    </a>
                  ))}
                </div>
              </article>
            ))}
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
            <div className="rounded-3xl border border-white/80 bg-gradient-to-br from-white/95 to-sand-50/85 p-6 shadow-lift backdrop-blur">
              <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-sage-700">Quiet reader space</p>
              <h4 className="mt-3 text-2xl font-extrabold leading-tight text-ink">A stable place for future recommendations, without interrupting the journal.</h4>
              <p className="mt-3 max-w-2xl leading-8 text-sage-800">This area sits outside the main writing flow, so future recommendations can live here without covering prompts, shifting the editor, or making the journaling experience feel crowded on mobile or desktop.</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <a className="inline-flex items-center justify-center rounded-full bg-sage-900 px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-sage-800" href="/private-online-diary.html">Open private diary guide</a>
                <a className="inline-flex items-center justify-center rounded-full border border-sage-200 bg-white px-5 py-3 text-sm font-bold text-sage-900 transition hover:-translate-y-0.5 hover:border-sage-300" href="/journal-prompts.html">Browse prompts</a>
              </div>
            </div>
            <div className="rounded-3xl border border-sage-100/80 bg-white/85 p-6 shadow-lift backdrop-blur">
              <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-sage-700">Why this reader area stays separate</p>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-sage-800">
                <li>• Future recommendations can live here without interrupting the writing screen.</li>
                <li>• Your diary, memories, and prompts stay stable instead of shifting around.</li>
                <li>• Mobile visitors get a clean block to explore, rather than overlays or crowded panels.</li>
              </ul>
            </div>
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
          title="Articles and reflections for a gentler journaling practice."
          text="These guides and short reflections help visitors begin private journaling with more clarity, kindness, and curiosity."
        />
        <div className="grid gap-5 md:grid-cols-2">
          {wellnessArticles.map((article, index) => (
            article.href ? (
              <a href={article.href} className="customizable-card rounded-3xl border border-white/70 bg-white/80 p-6 shadow-lift backdrop-blur transition hover:-translate-y-1 hover:bg-white/95 text-left block" key={article.title}>
                <div className="mb-4 flex items-center justify-between gap-4">
                  <span className="rounded-full bg-sage-900 px-3 py-1 text-xs font-extrabold uppercase tracking-widest text-white">{article.read.split('•')[0]}</span>
                  <span className="text-sm font-bold text-sage-600">{article.read.split('•')[1] || ''}</span>
                </div>
                <h3 className="text-2xl font-extrabold leading-tight text-ink">{article.title}</h3>
                <p className="mt-4 leading-8 text-sage-800">{article.body}</p>
                <div className="mt-6 flex items-center gap-2 text-sm font-bold text-sage-900">
                  Read full article &rarr;
                </div>
              </a>
            ) : (
              <article className="customizable-card rounded-3xl border border-white/70 bg-white/80 p-6 shadow-lift backdrop-blur transition hover:-translate-y-1 hover:bg-white/95" key={article.title}>
                <div className="mb-4 flex items-center justify-between gap-4">
                  <span className="rounded-full bg-sage-100 px-3 py-1 text-xs font-extrabold uppercase tracking-widest text-sage-800">Note</span>
                  <span className="text-sm font-bold text-sage-600">{article.read}</span>
                </div>
                <h3 className="text-2xl font-extrabold leading-tight text-ink">{article.title}</h3>
                <p className="mt-4 leading-8 text-sage-800">{article.body}</p>
              </article>
            )
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
              <div className="grid gap-4">
                <div className="rounded-3xl bg-white/95 p-6 text-ink shadow-lift">
                  <p className="text-sm font-bold uppercase tracking-widest text-sage-600">Site owner email</p>
                  <a className="mt-3 block break-words text-2xl font-extrabold text-sage-900 underline decoration-sage-300 underline-offset-4" href="mailto:atastymealy@gmail.com">
                    atastymealy@gmail.com
                  </a>
                </div>
                <div className="rounded-3xl border border-white/15 bg-white/8 p-6 text-white shadow-inner backdrop-blur">
                  <p className="text-sm font-bold uppercase tracking-widest text-sage-100">A gentle place to begin</p>
                  <h3 className="mt-3 text-2xl font-extrabold leading-tight text-white">Made for people who want somewhere calm to start a diary.</h3>
                  <p className="mt-3 leading-7 text-sage-50/90">Quiet Journal Journey is for people who want a softer first step into diary writing — whether you are starting for the first time, starting again, or simply trying to understand your days more clearly.</p>
                  <div className="mt-4 grid gap-3 text-sm leading-7 text-sage-50/90">
                    <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">Diary writing can support wellbeing by helping you process emotions instead of carrying everything in your head.</div>
                    <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">It can improve mental clarity, help you notice patterns in your moods, and create a steadier routine during stressful periods.</div>
                    <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">Over time, even short entries can strengthen self-awareness, gratitude, and a calmer relationship with your inner life.</div>
                  </div>
                </div>
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

      {activeHomeSection === 'seo-studio' && showAdminTools && (
      <section id="seo-studio" className="mx-auto max-w-7xl px-6 py-14">
        <SectionHeader
          eyebrow="Admin-only AI SEO Studio"
          title="Review and draft SEO improvements without changing the public experience."
          text="This panel is only visible when the master email is signed in. It lets you run an AI SEO review from inside the website, keep the API key in your own browser, and work on ideas without exposing admin tools to normal visitors."
        />
        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="rounded-[2rem] border border-white/80 bg-white/78 p-6 shadow-soft backdrop-blur-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-widest text-sage-600">Master access</p>
                <h3 className="mt-2 text-2xl font-extrabold text-ink">Signed in as {user?.email}</h3>
                <p className="mt-3 leading-7 text-sage-700">Normal visitors never see this section. The public journaling flow stays exactly the same unless you later choose to apply changes manually.</p>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sage-900 text-white shadow-sm">
                <ShieldCheck size={20} />
              </div>
            </div>

            <div className="mt-6 rounded-[1.5rem] border border-sage-100 bg-white px-4 py-4 shadow-sm">
              <p className="text-sm font-extrabold uppercase tracking-[0.22em] text-sage-600">Preview mode</p>
              <div className="mt-3 flex overflow-hidden rounded-full border border-sage-200 bg-sage-50 p-1">
                <button
                  className={`flex-1 rounded-full px-4 py-2.5 text-sm font-extrabold transition ${adminViewMode === 'master' ? 'bg-sage-900 text-white shadow-sm' : 'text-sage-700 hover:bg-white'}`}
                  onClick={() => setAdminViewMode('master')}
                  type="button"
                >
                  Master view
                </button>
                <button
                  className={`flex-1 rounded-full px-4 py-2.5 text-sm font-extrabold transition ${adminViewMode === 'user' ? 'bg-sage-900 text-white shadow-sm' : 'text-sage-700 hover:bg-white'}`}
                  onClick={() => setAdminViewMode('user')}
                  type="button"
                >
                  User view
                </button>
              </div>
              <p className="mt-3 text-sm leading-7 text-sage-700">Switch to user view any time to hide admin tools and preview the calmer public experience while staying signed in.</p>
            </div>

            <div className="mt-6 grid gap-3 text-sm leading-7 text-sage-700">
              <div className="rounded-2xl border border-sage-100 bg-sage-50/80 px-4 py-4">
                <p className="font-extrabold text-sage-900">What this first version can do</p>
                <p className="mt-2">Run an AI SEO review of the current diary site, suggest safer homepage and guide-page improvements, and draft ideas you can later implement without disrupting users.</p>
              </div>
              <div className="rounded-2xl border border-sage-100 bg-white px-4 py-4">
                <p className="font-extrabold text-sage-900">What it does not auto-publish yet</p>
                <p className="mt-2">This version does not silently rewrite the live site on its own. It gives you admin-only guidance and drafts first, which is safer for SEO and much better for preserving tone.</p>
              </div>
            </div>

            <div className="mt-6 rounded-[1.75rem] border border-sage-100 bg-gradient-to-br from-sage-900 via-sage-800 to-sage-700 p-5 text-white shadow-soft">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-white/80">Suggested routine</p>
              <div className="mt-4 grid gap-3 text-sm leading-7 text-white/90">
                <div>1. Run a fresh AI review when you want new SEO ideas.</div>
                <div>2. Pick only a few high-impact suggestions at a time.</div>
                <div>3. Keep the writing experience calm and avoid constant churn.</div>
              </div>
              <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-white/80">Master email: {MASTER_ADMIN_EMAIL}</p>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/80 bg-white/82 p-6 shadow-soft backdrop-blur-xl">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-widest text-sage-600">Run AI review</p>
                <h3 className="mt-2 text-2xl font-extrabold text-ink">SEO drafts that stay inside your admin view</h3>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {seoStudioModelUsed && <span className="rounded-full border border-sage-200 bg-white px-4 py-2 text-xs font-extrabold uppercase tracking-[0.2em] text-sage-700">Model · {seoStudioModelUsed}</span>}
                {seoStudioLastRun && <span className="rounded-full border border-sage-200 bg-sage-50 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.2em] text-sage-800">Last run · {seoStudioLastRun}</span>}
              </div>
            </div>

            <div className="mt-6 grid gap-4">
              <label className="grid gap-2 text-sm font-bold text-sage-900">
                Gemini API key
                <div className="flex gap-2">
                  <input
                    className="w-full rounded-2xl border border-sage-200 bg-white px-4 py-3 text-sm font-semibold text-sage-900 outline-none transition focus:border-sage-400"
                    onChange={(event) => setSeoStudioApiKey(event.target.value)}
                    placeholder="Paste your Gemini API key"
                    type={showSeoStudioKey ? 'text' : 'password'}
                    value={seoStudioApiKey}
                  />
                  <button className="rounded-2xl border border-sage-200 bg-white px-4 text-sage-800 shadow-sm transition hover:bg-sage-50" onClick={() => setShowSeoStudioKey(!showSeoStudioKey)} type="button">
                    {showSeoStudioKey ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <span className="text-xs font-semibold text-sage-600">Stored only in this browser for the master email view. Use a browser-restricted key if possible.</span>
              </label>

              <label className="grid gap-2 text-sm font-bold text-sage-900">
                What should the AI focus on?
                <textarea
                  className="min-h-[128px] rounded-2xl border border-sage-200 bg-white px-4 py-3 text-sm leading-7 text-sage-900 outline-none transition focus:border-sage-400"
                  onChange={(event) => setSeoStudioPrompt(event.target.value)}
                  placeholder="Ask for homepage suggestions, new guide ideas, schema improvements, or calmer SEO fixes."
                  value={seoStudioPrompt}
                />
              </label>

              <div className="flex flex-wrap gap-3">
                <button className="inline-flex items-center gap-2 rounded-full bg-sage-900 px-5 py-3 text-sm font-extrabold text-white shadow-lift transition hover:-translate-y-1 hover:bg-sage-800 disabled:cursor-not-allowed disabled:opacity-60" disabled={seoStudioLoading} onClick={runSeoStudioReview} type="button">
                  <Sparkles size={16} /> {seoStudioLoading ? 'Running review...' : 'Run AI SEO review'}
                </button>
                <button className="inline-flex items-center gap-2 rounded-full border border-sage-200 bg-white px-5 py-3 text-sm font-extrabold text-sage-900 shadow-sm transition hover:-translate-y-1 hover:border-sage-300 hover:bg-sage-50 disabled:cursor-not-allowed disabled:opacity-50" disabled={!seoStudioReport.trim()} onClick={copySeoStudioReport} type="button">
                  <FileText size={16} /> {seoStudioCopied ? 'Copied' : 'Copy report'}
                </button>
                <button className="inline-flex items-center gap-2 rounded-full border border-sage-200 bg-white px-5 py-3 text-sm font-extrabold text-sage-900 shadow-sm transition hover:-translate-y-1 hover:border-sage-300 hover:bg-sage-50" onClick={clearSeoStudioReport} type="button">
                  Clear
                </button>
              </div>

              {seoStudioError && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold leading-7 text-rose-700">
                  {seoStudioError}
                </div>
              )}

              <div className="rounded-[1.75rem] border border-sage-100 bg-sand-50/80 p-4 shadow-inner">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-extrabold uppercase tracking-[0.22em] text-sage-600">AI report</p>
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-sage-500">Admin draft only</span>
                </div>
                <div className="mt-4 max-h-[28rem] overflow-auto rounded-[1.4rem] bg-white p-4 shadow-sm ring-1 ring-sage-100">
                  {seoStudioReport ? (
                    <pre className="whitespace-pre-wrap text-sm leading-7 text-sage-800">{seoStudioReport}</pre>
                  ) : (
                    <p className="text-sm leading-7 text-sage-600">Run the AI SEO review to generate a fresh draft. It will use the current Quiet Journal Journey positioning, homepage framing, guide-page cluster, and privacy-first diary context.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
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
            <a href="/privacy.html">Privacy</a>
            <a href="/terms.html">Terms</a>
            <a href="/contact.html">Contact</a>
          </div>
          Quiet Journal Journey is an online diary, private diary, diary app, journal app, and mood journal for noticing your thoughts, collecting small good moments, and understanding what you want next.
        </div>
      </footer>
      </>
      )}

      {!cookieConsentAccepted && (
        <div className="fixed bottom-24 left-0 right-0 z-50 p-4 sm:bottom-0 sm:p-6 flex justify-center pointer-events-none">
          <div className="pointer-events-auto flex w-full max-w-2xl flex-col gap-4 rounded-[1.75rem] border border-sage-200 bg-white/95 p-5 shadow-2xl backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium leading-relaxed text-sage-800">
              We use cookies to improve your experience and serve personalized ads. By using this site, you agree to our <a href="/privacy.html" className="font-bold text-sage-900 underline decoration-sage-300 hover:decoration-sage-500">Privacy Policy</a> and <a href="/terms.html" className="font-bold text-sage-900 underline decoration-sage-300 hover:decoration-sage-500">Terms</a>.
            </p>
            <button
              onClick={() => {
                localStorage.setItem('quiet-journal-cookie-consent', 'true');
                setCookieConsentAccepted(true);
              }}
              className="shrink-0 rounded-full bg-sage-900 px-6 py-2.5 text-sm font-extrabold text-white shadow-lift transition hover:-translate-y-0.5 hover:bg-sage-800"
            >
              I understand
            </button>
          </div>
        </div>
      )}

      <div className="fixed inset-x-3 bottom-3 z-30 mx-auto max-w-lg rounded-[1.7rem] border border-white/90 bg-white/90 p-1.5 shadow-soft backdrop-blur-xl lg:hidden">
        <div className="grid grid-cols-6 gap-1">
        {[
          { id: 'home', label: 'Home', icon: Waves },
          { id: 'write', label: 'Write', icon: PenLine },
          { id: 'notes', label: 'Notes', icon: FileText },
          { id: 'memories', label: 'Memory', icon: BookOpen },
          { id: 'insights', label: 'Insight', icon: Sparkles },
          { id: 'design', label: 'Design', icon: Palette }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          const isWrite = tab.id === 'write';
          return (
          <button
            key={tab.id}
            className={`flex min-w-0 flex-col items-center gap-1.5 rounded-[1.2rem] px-1 py-2 transition ${isActive ? 'bg-white text-sage-950 shadow-sm ring-1 ring-sage-100' : isWrite ? 'text-sage-900' : 'text-sage-600 hover:bg-white/70 hover:text-sage-800'}`}
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
            <div className={`flex h-8 w-8 items-center justify-center rounded-2xl transition ${isActive ? 'bg-sage-900 text-white shadow-sm' : isWrite ? 'bg-sage-900 text-white shadow-sm' : 'bg-sage-50 text-sage-700'}`}>
              <tab.icon size={16} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.1em]">{tab.label}</span>
            <span className={`h-1 w-5 rounded-full transition ${isActive ? 'bg-sage-700 opacity-100' : 'opacity-0'}`}></span>
          </button>
          );
        })}
        </div>
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
                  <button className="rounded-full bg-white px-3.5 py-2 text-sm font-bold text-sage-800 shadow-sm transition hover:bg-sage-50" onClick={() => toggleBoldText(editBodyRef, setEditBody)} title="Bold selected text" type="button">Bold</button>
                  <button className="rounded-full bg-white px-3.5 py-2 text-sm font-bold text-sage-800 shadow-sm transition hover:bg-sage-50" onClick={() => toggleUnderlineText(editBodyRef, setEditBody)} title="Underline selected text" type="button">Underline</button>
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
