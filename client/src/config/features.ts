/**
 * Feature Flags Configuration
 *
 * REVIEW_MODE=true  → Для API Review (TikTok, Meta, Google)
 *                     Показываем только OAuth + Personal Analytics
 *
 * REVIEW_MODE=false → Полная версия (для beta тестеров)
 *                     Все фичи: Apify, AI Scripts, Competitors и т.д.
 */

// Читаем из environment variable
export const REVIEW_MODE = import.meta.env.VITE_REVIEW_MODE === 'true';

// Developer Access - защита паролем на время разработки
// ВАЖНО: Пароль ТОЛЬКО из environment variable, без fallback в коде!
export const DEV_ACCESS_ENABLED = import.meta.env.VITE_DEV_ACCESS === 'true';
export const DEV_ACCESS_PASSWORD = import.meta.env.VITE_DEV_PASSWORD || '';

// Feature flags
export const features = {
  // ===== ВСЕГДА ВКЛЮЧЕНО (для Review) =====
  auth: true,                    // Login/Register
  googleOAuth: true,             // Google авторизация
  dashboard: true,               // Основной dashboard
  myVideos: true,                // Мои видео (Official API)
  pricing: true,                 // Страница с ценами
  settings: true,                // Настройки
  privacyPolicy: true,           // Privacy Policy
  termsOfService: true,          // Terms of Service
  dataDelation: true,            // Удаление данных

  // ===== OAUTH ПЛАТФОРМ (для Review) =====
  tiktokOAuth: true,             // TikTok подключение
  instagramOAuth: true,          // Instagram подключение
  youtubeOAuth: true,            // YouTube подключение

  // ===== СКРЫТО В REVIEW MODE =====
  trendDiscovery: !REVIEW_MODE,  // Apify поиск трендов
  competitors: !REVIEW_MODE,     // Отслеживание конкурентов
  aiScripts: !REVIEW_MODE,       // AI генерация скриптов
  aiWorkspace: !REVIEW_MODE,     // AI чат
  workflowBuilder: !REVIEW_MODE, // Конструктор workflow
  deepAnalysis: !REVIEW_MODE,    // CLIP анализ
  trending: !REVIEW_MODE,        // Вирусные видео
  marketplace: !REVIEW_MODE,     // Маркетплейс

  // ===== КОММУНИКАЦИИ (можно включить) =====
  telegram: !REVIEW_MODE,        // Telegram интеграция
  discord: !REVIEW_MODE,         // Discord интеграция
};

// Хелпер для проверки фичи
export const isFeatureEnabled = (feature: keyof typeof features): boolean => {
  return features[feature];
};

// Список страниц для навигации (фильтруется по флагам)
export const getEnabledPages = () => {
  return {
    // Всегда видны
    dashboard: features.dashboard,
    myVideos: features.myVideos,
    pricing: features.pricing,
    settings: features.settings,

    // Скрыты в Review Mode
    discover: features.trendDiscovery,
    competitors: features.competitors,
    aiScripts: features.aiScripts,
    aiWorkspace: features.aiWorkspace,
    workflowBuilder: features.workflowBuilder,
    deepAnalysis: features.deepAnalysis,
    trending: features.trending,
    marketplace: features.marketplace,
  };
};
