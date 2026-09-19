import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Safe persistent storage directory and file path
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE_PATH = path.join(DATA_DIR, 'smokefree_db.json');

// Ensure data directory exists
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('Could not create data dir, using current working directory:', e);
}

// In-memory cache + persistent fallback
let appStateMemory: any = null;

function loadPersistedState(): any {
  if (appStateMemory) return appStateMemory;
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const raw = fs.readFileSync(DB_FILE_PATH, 'utf-8');
      appStateMemory = JSON.parse(raw);
      return appStateMemory;
    }
  } catch (err) {
    console.error('Error reading persisted state from disk:', err);
  }
  return null;
}

function savePersistedState(state: any): boolean {
  try {
    appStateMemory = state;
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(state, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing persisted state to disk:', err);
    return false;
  }
}

// Lazy-initialized Gemini client
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!aiClient && apiKey) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

const CBT_SYSTEM_INSTRUCTION = `Ты — персональный наставник и мудрый КПТ-коуч по освобождению от никотина в SmokeFree Companion.
Твоя база знаний включает:
1. КНИГИ: Аллен Карр («Легкий способ» — концепция Маленького чудовища и деконструкция иллюзии удовольствия; курящий платит за то, чтобы чувствовать себя как некурящий), Джадсон Брюер («Зависимый мозг» — метод RAIN и наблюдение за тягой как за волной), Джеймс Клир («Атомные привычки» — изменение идентичности: «Я не курю»), Виктор Франкл (зазор между стимулом и реакцией), стоики (Марк Аврелий, Сенека).
2. КИНЕМАТОГРАФ И ДОКУМЕНТАЛИСТИКА: «Свой человек» (The Insider) — раскрытие манипуляций химиков с аммиаком для 7-секундного удара никотина по рецепторам; «Здесь курят» (Thank You for Smoking) — обличение маркетинговой лжи о романтике сигарет; «Константин» — крушение иллюзии контроля.
3. ОПЫТ ФОРУМОВ (r/stopsmoking, ne-kurim.ru): железное правило NOPE (Not One Puff Ever); 3-минутная волна; стадии: дни 1-3 (химический детокс, туман), дни 4-14 (разрыв ритуалов с кофе/едой), недели 3-4 (дофаминовая яма), месяцы 2-3 (ложная самоуверенность).

ПРАВИЛА ОТВЕТА:
- Внимательно вникай в конкретную ситуацию пользователя и отвечай по существу его запроса (не отделывайся общими фразами).
- Общайся тепло, мудро, психологически точно, емко и воодушевляюще.
- Форматируй ответ четко (используй абзацы, списки при необходимости).
- Завершай ответ практическим советом или вопросом, возвращающим контроль.`;

const PERSONA_PROMPTS: Record<string, string> = {
  cbt: `Ты — доказательный КПТ-терапевт. Используй когнитивную реструктуризацию, метод наблюдения за тягой RAIN (Распознай, Прими, Исследуй телом, Не отождествляй). Помогай увидеть автоматические искажения мышления и возвращать осознанный выбор.`,
  carr: `Ты — последователь Аллена Карра. Твоя задача — безжалостно деконструировать «иллюзию удовольствия» от курения. Напоминай, что курение не снимает стресс, а создает его. Курильщик всю жизнь платит за то, чтобы чувствовать себя как нормальный некурящий. Тяга — это лишь предсмертные судороги «маленького чудовища».`,
  neuro: `Ты — нейробиолог из школы Stanford / Huberman Lab. Объясняй тягу и настроение через биохимию: даунрегуляция α4β2 ацетилхолиновых рецепторов, дофаминовый baseline, оксид азота, фазы REM-сна. Давай точные физиологические объяснения и биохакинг-советы.`,
  stoic: `Ты — мудрый стоический наставник в духе Марка Аврелия, Сенеки и Эпиктета. Фокусируйся на дихотомии контроля: тяга — это внешнее телесное ощущение, но твой разум и выбор не подчиняются импульсу. Воспитывай благородное спокойствие и внутреннюю силу.`,
  sos: `Ты — экстренный SOS-напарник. Пользователь прямо сейчас проживает острый пик тяги! Успокой, веди его за руку через 3-минутную волну. Прикажи сделать медленный диафрагмальный вдох, выпить 3 глотка воды, расслабить челюсть и плечи. Будь краток, решителен, уверен и добр.`,
};

const WISDOM_COLLECTION = [
  {
    category: 'books',
    badge: '📖 Книга',
    source: 'Аллен Карр, «Легкий способ бросить курить»',
    quote: '«Сигарета не снимает стресс — она лишь временно утоляет муки абстиненции, созданные предыдущей сигаретой. Курильщик всю жизнь платит за то, чтобы чувствовать себя так, как некурящий чувствует себя постоянно.»',
    takeaway: 'Тяга — это не твоё желание, а агония паразита внутри. Каждая минута терпения морит его голодом.',
  },
  {
    category: 'books',
    badge: '📖 Книга',
    source: 'Д-р Джадсон Брюер, «Зависимый мозг» (The Craving Mind)',
    quote: '«Когда наступает тяга, не борись с ней. Стань исследователем: обрати внимание, как именно она ощущается в теле — сжатие в груди, сухость во рту. Волна спадает за 3 минуты.»',
    takeaway: 'Метод RAIN: Распознай, Прими, Исследуй телом, Не отождествляй с собой.',
  },
  {
    category: 'books',
    badge: '📖 Книга',
    source: 'Джеймс Клир, «Атомные привычки»',
    quote: '«Истинное изменение привычки — это изменение идентичности. Говори себе: "Спасибо, я не курю", а не "Я пытаюсь бросить".»',
    takeaway: 'Разница колоссальна: ты уже свободный человек, а не жертва ограничений.',
  },
  {
    category: 'cinema',
    badge: '🎬 Кинематограф',
    source: 'Фильм «Свой человек» (The Insider, реж. Майкл Манн)',
    quote: '«Табачные корпорации десятилетиями знали правду: они добавляли аммиак, чтобы никотин ударял по рецепторам мозга за 7 секунд — быстрее героина. Они превратили сигарету в устройство доставки наркотика.»',
    takeaway: 'Твоя тяга спроектирована химиками корпораций ради их сверхприбыли. Сломай эту цепь.',
  },
  {
    category: 'cinema',
    badge: '🎬 Кинематограф',
    source: 'Фильм «Здесь курят» (Thank You for Smoking)',
    quote: '«В Голливуде 50-х сигарета стала символом мужественности и стиля благодаря миллионным контрактам. Людей убедили, что яд — это их личный выбор.»',
    takeaway: 'Романтика сигареты — рекламная иллюзия. В реальности это запах гари, одышка и пепел.',
  },
  {
    category: 'neuro',
    badge: '🧠 Наука и мозг',
    source: 'Проф. Эндрю Губерман (Stanford / Huberman Lab)',
    quote: '«Никотин взламывает выработку дофамина: он дает искусственный пик, за которым неизбежно следует падение базового уровня дофамина НИЖЕ нуля. Вот почему без сигареты мир кажется серым.»',
    takeaway: 'Апатия в первые недели — естественный процесс калибровки рецепторов. Радость вернется сама!',
  },
  {
    category: 'forums',
    badge: '💬 Опыт форумов',
    source: 'Золотое правило r/stopsmoking (NOPE: Not One Puff Ever)',
    quote: '«Не существует понятия "всего одной затяжки". 98% людей, сорвавшихся через полгода или три года, начали с мысли: "Я уже бросил, одна не повредит". Через неделю они снова курили по пачке.»',
    takeaway: 'Не открывай дверь монстру. Одна сигарета не принесет удовольствия — она лишь перезапустит рецепторы.',
  },
  {
    category: 'stoic',
    badge: '🏛 Стоицизм',
    source: 'Марк Аврелий, «Размышления»',
    quote: '«У тебя есть власть над твоим разумом, а не над внешними событиями. Осознай это, и ты обретешь силу. Импульсы тела не властны над твоим решением.»',
    takeaway: 'Тяга шумит в теле, но зажигать сигарету или нет — решает твой разум.',
  },
];

// Health endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'smokefree-companion-engine',
    persistence: fs.existsSync(DB_FILE_PATH) ? 'persisted-file-ok' : 'in-memory-active',
    timestamp: new Date().toISOString(),
  });
});

// State Persistence endpoints (Solves data loss on redeploy & sync)
app.get('/api/state', (req: Request, res: Response) => {
  const state = loadPersistedState();
  if (!state) {
    return res.status(404).json({ message: 'No persisted state yet on server' });
  }
  res.json(state);
});

app.post('/api/state', (req: Request, res: Response) => {
  const payload = req.body;
  if (!payload || typeof payload !== 'object') {
    return res.status(400).json({ error: 'Invalid payload' });
  }
  const payloadWithMeta = {
    ...payload,
    updatedAt: new Date().toISOString(),
  };
  const success = savePersistedState(payloadWithMeta);
  res.json({ success, updatedAt: payloadWithMeta.updatedAt });
});

// Wisdom endpoint
app.get('/api/wisdom', (req: Request, res: Response) => {
  const category = req.query.category as string | undefined;
  let pool = WISDOM_COLLECTION;
  if (category) {
    const filtered = WISDOM_COLLECTION.filter((w) => w.category === category);
    if (filtered.length > 0) pool = filtered;
  }
  const item = pool[Math.floor(Math.random() * pool.length)];
  res.json(item);
});

// AI Coach endpoint with multi-persona support & multi-turn history
app.post('/api/coach', async (req: Request, res: Response) => {
  const {
    message,
    daysFree = 0,
    hoursFree = 0,
    moneySaved = 0,
    cigsAvoided = 0,
    trigger = '',
    nicotineType = 'Сигареты',
    isRelapse = false,
    persona = 'cbt',
    history = [],
  } = req.body;

  const client = getAiClient();
  const personaInstruction = PERSONA_PROMPTS[persona] || PERSONA_PROMPTS.cbt;

  if (!client) {
    // Dynamic intelligent Wisdom fallback when Gemini API key is not configured
    const randomW = WISDOM_COLLECTION[Math.floor(Math.random() * WISDOM_COLLECTION.length)];
    let fallbackText = `${randomW.badge} — ${randomW.source}:\n${randomW.quote}\n\n💡 ${randomW.takeaway}\n\nСделай 4 глубоких вдоха и выпей стакан прохладной воды. Что именно сейчас пытается спровоцировать тягу?`;
    if (isRelapse) {
      fallbackText = `Дыши спокойно. Срыв — это не обнуление твоего опыта, а важная точка биохимических данных. Как учит Карр и участники форумов, мозг обманул иллюзией «только одной». Какое одно действие ты сделаешь прямо сейчас, чтобы вернуться в победный ритм?`;
    } else if (persona === 'sos') {
      fallbackText = `🚨 ТАК, ДЫШИМ ВМЕСТЕ! Тяга длится максимум 3 минуты. \n1. Сделай медленный вдох носом на 4 секунды...\n2. Задержи дыхание на 4 секунды...\n3. Медленный выдох через рот на 4 секунды...\n\nПрямо сейчас выпей полстакана холодной воды. Ты сильнее этого импульса!`;
    }
    return res.json({ reply: fallbackText, source: 'cbt-wisdom-engine' });
  }

  try {
    const fullInstruction = `${CBT_SYSTEM_INSTRUCTION}\n\nАКТИВНЫЙ РЕЖИМ КОУЧА (${persona}):\n${personaInstruction}`;

    // Build multi-turn contents array
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    if (Array.isArray(history) && history.length > 0) {
      for (const item of history.slice(-6)) {
        if (item && item.text && (item.role === 'user' || item.role === 'model')) {
          contents.push({
            role: item.role === 'user' ? 'user' : 'model',
            parts: [{ text: String(item.text) }],
          });
        }
      }
    }

    // Add current user prompt with rich context metadata
    const userPromptWithContext = isRelapse
      ? `[КОНТЕКСТ: Пользователь сообщает о срыве после ${daysFree} дн. ${hoursFree} ч. чистоты (${nicotineType}). Триггер: ${trigger || 'не указан'}. Сэкономлено ранее: ~${moneySaved} руб., не выкурено: ~${cigsAvoided} шт.]\n\nСообщение пользователя: "${message}"`
      : `[КОНТЕКСТ: Пользователь свободен от ${nicotineType} уже ${daysFree} дн. ${hoursFree} ч. Сэкономлено: ~${moneySaved} руб., не выкурено: ~${cigsAvoided} шт. Текущая ситуация/триггер: ${trigger || 'повседневная жизнь'}]\n\nСообщение пользователя: "${message}"`;

    contents.push({
      role: 'user',
      parts: [{ text: userPromptWithContext }],
    });

    const modelsToTry = [
      'gemini-3.8-flash',
      'gemini-3.6-flash',
      'gemini-3.1-flash-lite',
      'gemini-flash-latest',
    ];

    let reply = '';
    let successModel = '';

    for (const model of modelsToTry) {
      try {
        const response = await client.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction: fullInstruction,
            temperature: 0.7,
            maxOutputTokens: 1500,
          },
        });
        reply = response.text?.trim() || '';
        if (reply) {
          successModel = model;
          return res.json({ reply, source: successModel });
        }
      } catch (err: any) {
        console.warn(`Model ${model} attempt failed:`, err?.message || err);
        continue;
      }
    }

    if (!reply) {
      const w = WISDOM_COLLECTION[Math.floor(Math.random() * WISDOM_COLLECTION.length)];
      reply = `${w.badge} — ${w.source}:\n${w.quote}\n\n💡 ${w.takeaway}\n\nТяга — это временная биохимическая волна (до 3 минут). Сделай медленный диафрагмальный вдох и выпей стакан воды.`;
    }
    return res.json({ reply, source: 'cbt-wisdom-fallback' });
  } catch (error: any) {
    console.error('Error generating AI coach reply:', error);
    const w = WISDOM_COLLECTION[Math.floor(Math.random() * WISDOM_COLLECTION.length)];
    return res.json({
      reply: `${w.badge} — ${w.source}:\n${w.quote}\n\n💡 ${w.takeaway}\n\nСделай 4 глубоких вдоха и сосредоточься на теле. Ты контролируешь свои действия!`,
      source: 'cbt-fallback-on-error',
    });
  }
});

// Vite middleware for dev or static serving for production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SmokeFree Companion server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

