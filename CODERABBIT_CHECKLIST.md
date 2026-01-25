# CodeRabbit Local Check - Checklist

## Как использовать CodeRabbit в Cursor:

1. **CodeRabbit работает автоматически** - просто откройте файлы ниже
2. **Подсказки появятся** в виде:
   - Подчеркиваний в коде (желтые/красные линии)
   - Всплывающих подсказок при наведении
   - В панели "Problems" (View → Problems)

## Файлы для проверки (откройте их в Cursor):

### 🔴 Критические файлы (Security & Configuration)

1. **`server/app/main.py`**
   - ⚠️ Проблема: `allow_origins=["*"]` - небезопасно
   - CodeRabbit должен предупредить о CORS

2. **`server/app/core/config.py`**
   - ⚠️ Проблема: `SECRET_KEY: str = "supersecretkey123"` - хардкод секрета
   - CodeRabbit должен найти утечку секрета

3. **`server/app/core/security.py`**
   - Проверка JWT токенов
   - Валидация безопасности

### 🟡 Важные файлы (Business Logic)

4. **`server/app/api/trends.py`**
   - Логика обработки запросов
   - Обработка ошибок
   - SQL запросы

5. **`server/app/api/routes/auth.py`**
   - OAuth2 flow
   - Валидация входных данных
   - Обработка токенов

6. **`server/app/services/collector.py`**
   - Обработка API запросов
   - Error handling
   - Timeout handling

### 🟢 Frontend файлы (TypeScript)

7. **`client/src/services/api.ts`**
   - TypeScript типы
   - API контракты
   - Error handling

8. **`client/src/types/index.ts`**
   - Type definitions
   - Соответствие с backend

9. **`client/src/App.tsx`**
   - React hooks
   - State management

## Что CodeRabbit должен найти:

### Security Issues:
- ✅ CORS `allow_origins=["*"]` в `main.py:48`
- ✅ Hardcoded SECRET_KEY в `config.py:17`
- ✅ Проверка валидации входных данных
- ✅ SQL injection риски

### Code Quality:
- ✅ Error handling
- ✅ Type hints в Python
- ✅ TypeScript strict mode
- ✅ Async/await patterns

### Best Practices:
- ✅ FastAPI patterns
- ✅ React hooks dependencies
- ✅ Environment variables usage

## Инструкция:

1. Откройте Cursor
2. Откройте файлы из списка выше (по одному или все сразу)
3. CodeRabbit автоматически проанализирует код
4. Смотрите подсказки в:
   - **Problems panel**: View → Problems (Cmd+Shift+M)
   - **Inline**: Подчеркивания в коде
   - **Hover**: Наведите на подчеркнутый код

## Быстрая проверка:

Откройте эти 3 файла одновременно:
- `server/app/main.py`
- `server/app/core/config.py`  
- `client/src/services/api.ts`

CodeRabbit покажет все проблемы сразу!
