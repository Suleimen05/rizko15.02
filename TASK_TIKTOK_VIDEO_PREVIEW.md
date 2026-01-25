# Техническое Задание: TikTok Video Preview в карточках

## Цель
Реализовать автоматическое воспроизведение TikTok видео в карточках при наведении мыши (hover), как в TikTok feed.

## Референс
- **Конкурент**: TrendSee (app.trendsee.io)
- **Поведение**: Видео должно автоматически проигрываться при hover, как в основном TikTok приложении

---

## Требования

### 1. Функциональные требования

#### 1.1 Воспроизведение видео
- ✅ **Автоплей при hover**: При наведении мыши на карточку видео начинает автоматически воспроизводиться
- ✅ **Пауза при убирании мыши**: Когда мышь убирается с карточки, видео останавливается
- ✅ **Зацикленное воспроизведение**: Видео должно повторяться в цикле (loop)
- ✅ **Звук по умолчанию выключен**: Видео начинает воспроизводиться без звука (muted)
- ⚠️ **Опционально: Включение звука при клике**: При клике на видео включается звук

#### 1.2 Оптимизация загрузки
- ✅ **Lazy loading**: Видео загружаются только когда карточка попадает в viewport (видимую область)
- ✅ **Приоритет thumbnail**: Сначала показывается превью (thumbnail), iframe загружается только при hover
- ✅ **Кэширование**: Один раз загруженное видео не должно перезагружаться

#### 1.3 UI/UX
- ✅ **Плавный переход**: Плавная анимация при переходе от thumbnail к видео
- ✅ **Индикатор загрузки**: Показать loader пока видео загружается
- ✅ **Fallback**: Если видео не загрузилось, показать thumbnail с ошибкой

---

## 2. Техническая реализация

### 2.1 Выбор подхода

**Рекомендуемый подход**: Гибридный (thumbnail + iframe on hover)

**Почему:**
- 🚀 Быстрая загрузка страницы (только картинки)
- ✨ Интерактивность (видео проигрывается при hover)
- 📱 Адаптивность (работает на desktop и mobile)

### 2.2 Компоненты для изменения

#### Файл: `/client/src/components/VideoCard.tsx`

**Текущее состояние:**
- Показывает статичную карточку с thumbnail
- Нет автоплея видео

**Требуемые изменения:**
1. Добавить state для отслеживания hover состояния
2. При hover загружать TikTok Embed Player (iframe)
3. Использовать Intersection Observer для lazy loading
4. Добавить обработчики onMouseEnter/onMouseLeave

---

## 3. TikTok Embed API

### 3.1 Использовать TikTok Embed Player

**Endpoint:**
```
https://www.tiktok.com/player/v1/{VIDEO_ID}?{параметры}
```

**Параметры для автоплея:**
```
autoplay=1          // Автоматический старт
controls=0          // Скрыть контролы (чистое видео)
loop=1              // Зацикливание
muted=1             // Без звука
music_info=0        // Скрыть информацию о музыке
description=0       // Скрыть описание
progress_bar=0      // Скрыть прогресс бар
```

**Пример полного URL:**
```
https://www.tiktok.com/player/v1/7123456789?autoplay=1&controls=0&loop=1&muted=1&music_info=0&description=0
```

### 3.2 Извлечение Video ID

**Из URL вида:**
- `https://www.tiktok.com/@username/video/7123456789`
- `https://vm.tiktok.com/ZMxxx/` (после редиректа)

**Функция для извлечения ID:**
```typescript
function extractTikTokVideoId(url: string): string | null {
  // Pattern 1: Regular TikTok URL
  const pattern1 = /tiktok\.com\/@[\w.-]+\/video\/(\d+)/;
  const match1 = url.match(pattern1);
  if (match1) return match1[1];

  // Pattern 2: From Apify scraped data (video ID может быть в отдельном поле)
  // Проверьте структуру данных из Apify

  return null;
}
```

---

## 4. Псевдокод реализации

### 4.1 VideoCard Component

```typescript
interface VideoCardProps {
  videoUrl: string;
  thumbnail: string;
  username: string;
  views: number;
  likes: number;
  // ... другие поля
}

function VideoCard({ videoUrl, thumbnail, ...props }: VideoCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isInViewport, setIsInViewport] = useState(false);
  const [videoId, setVideoId] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // 1. Intersection Observer для lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInViewport(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // 2. Извлечь video ID при монтировании
  useEffect(() => {
    const id = extractTikTokVideoId(videoUrl);
    setVideoId(id);
  }, [videoUrl]);

  // 3. Обработчики hover
  const handleMouseEnter = () => {
    if (isInViewport && videoId) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <div
      ref={cardRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="video-card"
    >
      {/* Thumbnail (всегда показывается) */}
      {!isHovered && (
        <img
          src={thumbnail}
          alt="Video preview"
          className="thumbnail"
        />
      )}

      {/* TikTok Embed Player (только при hover) */}
      {isHovered && videoId && (
        <iframe
          src={`https://www.tiktok.com/player/v1/${videoId}?autoplay=1&controls=0&loop=1&muted=1&music_info=0&description=0`}
          allow="autoplay; fullscreen"
          className="tiktok-player"
        />
      )}

      {/* Статистика и информация */}
      <div className="video-info">
        <span>{views} views</span>
        <span>{likes} likes</span>
      </div>
    </div>
  );
}
```

### 4.2 CSS стили

```css
.video-card {
  position: relative;
  width: 100%;
  aspect-ratio: 9 / 16; /* TikTok формат */
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.video-card:hover {
  transform: scale(1.02);
}

.thumbnail,
.tiktok-player {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border: none;
}

.tiktok-player {
  position: absolute;
  top: 0;
  left: 0;
}

.video-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px;
  background: linear-gradient(to top, rgba(0,0,0,0.7), transparent);
  color: white;
}
```

---

## 5. Интеграция с Apify данными

### 5.1 Структура данных из Apify

**Проверьте какие поля возвращает Apify:**
```typescript
interface ApifyTikTokVideo {
  webVideoUrl: string;        // https://www.tiktok.com/@user/video/123
  videoUrl: string;           // Прямая ссылка на .mp4 (если есть)
  id: string;                 // Video ID
  text: string;               // Описание
  authorMeta: {
    name: string;             // Username
    avatar: string;           // URL аватара
  };
  covers: {
    default: string;          // Thumbnail URL
  };
  // ... другие поля
}
```

### 5.2 Mapping данных

```typescript
function mapApifyToVideoCard(apifyData: ApifyTikTokVideo): VideoCardProps {
  return {
    videoUrl: apifyData.webVideoUrl,
    thumbnail: apifyData.covers.default,
    username: apifyData.authorMeta.name,
    avatar: apifyData.authorMeta.avatar,
    description: apifyData.text,
    // ... остальные поля
  };
}
```

---

## 6. Альтернативные подходы

### Подход A: TikTok oEmbed API (НЕ рекомендуется)
**Проблема:** Требует серверный запрос для каждого видео, медленнее

### Подход B: Прямой .mp4 файл (НЕ рекомендуется)
**Проблема:** Нарушает ToS TikTok, может быть заблокировано

### Подход C: Blockquote Embed (НЕ рекомендуется)
**Проблема:** Слишком тяжелый, загружает много данных, нет контроля

---

## 7. Тестирование

### 7.1 Чек-лист функциональности
- [ ] Видео автоматически проигрывается при hover
- [ ] Видео останавливается при убирании мыши
- [ ] Видео зацикливается (loop)
- [ ] Звук выключен по умолчанию
- [ ] Lazy loading работает (видео грузится только в viewport)
- [ ] Плавная анимация перехода
- [ ] Работает на desktop
- [ ] Работает на mobile (touch events)
- [ ] Корректно отображается при быстром скролле
- [ ] Не тормозит страницу при 10+ видео

### 7.2 Тестовые URL

**Тестовые TikTok видео:**
1. `https://www.tiktok.com/@scout2015/video/6718335390845095173`
2. `https://www.tiktok.com/@mauvellala/video/7123456789` (из вашего скриншота)

### 7.3 Производительность

**Метрики:**
- Время загрузки страницы с 10 видео: < 2 секунды
- Время от hover до начала воспроизведения: < 500ms
- Потребление памяти: < 100MB для 20 видео

---

## 8. Edge Cases и обработка ошибок

### 8.1 Что делать если:

**Видео удалено/недоступно:**
```typescript
<div className="error-state">
  <img src={thumbnail} alt="Video unavailable" />
  <div className="error-overlay">
    ❌ Video unavailable
  </div>
</div>
```

**Video ID не удалось извлечь:**
```typescript
if (!videoId) {
  // Fallback на thumbnail со ссылкой на TikTok
  return (
    <a href={videoUrl} target="_blank">
      <img src={thumbnail} />
    </a>
  );
}
```

**Медленное соединение:**
- Показать spinner/loader
- Таймаут 5 секунд → показать ошибку

---

## 9. Дополнительные улучшения (опционально)

### 9.1 Продвинутые фичи

**Feature 1: Включение звука при клике**
```typescript
const [isMuted, setIsMuted] = useState(true);

const handleClick = () => {
  setIsMuted(false);
  // Отправить message в iframe для unmute
};
```

**Feature 2: Контроль через postMessage**
```typescript
// Отправка команд в TikTok iframe
iframeRef.current?.contentWindow?.postMessage({
  'x-tiktok-player': true,
  type: 'play',
  value: undefined
}, '*');
```

**Feature 3: Analytics трекинг**
```typescript
// Трекинг когда видео проиграно
const handleVideoPlayed = () => {
  analytics.track('video_preview_played', {
    videoId,
    username,
    timestamp: Date.now()
  });
};
```

---

## 10. Timeline разработки

### Фаза 1: Базовая реализация (2-3 дня)
- [ ] Реализовать VideoCard с hover состоянием
- [ ] Интегрировать TikTok Embed Player
- [ ] Добавить Intersection Observer для lazy loading
- [ ] Базовые стили и анимации

### Фаза 2: Оптимизация (1-2 дня)
- [ ] Оптимизация производительности
- [ ] Обработка ошибок и edge cases
- [ ] Тестирование на разных браузерах
- [ ] Mobile адаптация

### Фаза 3: Дополнительно (опционально, 1 день)
- [ ] Включение звука при клике
- [ ] Analytics интеграция
- [ ] A/B тестирование разных подходов

---

## 11. Критерии приемки

### ✅ Готово когда:
1. Видео автоматически проигрывается при hover на desktop
2. Видео останавливается при убирании мыши
3. Страница с 10+ видео загружается быстро (< 2 сек)
4. Работает на Chrome, Safari, Firefox
5. Корректно работает на mobile (touch)
6. Нет багов при быстром скролле
7. Код покрыт комментариями
8. Проведено code review

---

## 12. Контакты и ресурсы

### Документация
- [TikTok Embed Player Docs](https://developers.tiktok.com/doc/embed-player)
- [TikTok Embed Videos Docs](https://developers.tiktok.com/doc/embed-videos)
- [Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)

### Референсы
- TrendSee: https://app.trendsee.io
- TikTok: https://www.tiktok.com

### Вопросы
- Slack: #dev-frontend
- Email: tech@trendscout.ai

---

**Дата создания:** 2026-01-24
**Автор:** Product Team
**Приоритет:** High 🔥
**Оценка:** 3-5 дней разработки
