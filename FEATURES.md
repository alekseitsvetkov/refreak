# Refreak Features System

## Обзор

Система features в Refreak позволяет включать/выключать отдельные функции расширения через popup интерфейс. Каждая функция может быть независимо активирована или деактивирована пользователем.

## Структура

```
├── entrypoints/
│   └── content.ts          # Основной content script
├── lib/
│   ├── storage.ts          # Общие определения storage
│   ├── faceit-api.ts       # FACEIT API клиент с кешированием
│   └── match-room.ts       # Утилиты для работы с match room
├── features/
│   ├── add-smurf-detection.ts    # Обнаружение смурфов
│   └── add-extension-toggle.ts   # UI переключения расширения
└── hooks/
    └── use-settings.ts     # Хук для управления настройками + утилиты для content script
```

## Доступные Features

### 1. Extension Toggle (`enabled`)
- **Описание**: Включает/выключает все функции расширения
- **UI**: Переключатель в popup
- **Поведение**: При выключении все элементы расширения удаляются со страницы

### 2. Smurf Detection (`smurfDetection`)
- **Описание**: Обнаруживает потенциальных смурфов на основе статистики игроков
- **UI**: Переключатель в popup
- **Поведение**: Добавляет индикаторы с процентом уверенности и детальными причинами
- **Алгоритм**: Анализирует количество матчей, K/D ratio, win rate, уровень аккаунта и возраст
- **API**: Использует FACEIT API для получения статистики игроков
- **Совместимость**: Поддерживает как новую, так и старую разметку FACEIT

## Как добавить новую Feature

### 1. Обновить типы в `hooks/use-settings.ts`
```typescript
interface SystemSettings {
  // ... существующие настройки
  newFeature: boolean  // Добавить новую настройку
}
```

### 2. Обновить значения по умолчанию в `lib/storage.ts`
```typescript
export const systemSettings = storage.defineItem<SystemSettings>('local:systemSettings', {
  fallback: {
    // ... существующие настройки
    newFeature: true  // Добавить значение по умолчанию
  }
})
```

### 3. Создать файл feature в `features/`
```typescript
// features/add-new-feature.ts
export async function addNewFeature() {
  try {
    // Логика новой функции
    console.log('New feature is running...')
    
    // Добавить элементы на страницу
    // Обработать события
    // и т.д.
    
  } catch (error) {
    console.error('Failed to add new feature:', error)
  }
}
```

### 4. Добавить в content script
```typescript
// entrypoints/content.ts
import { addNewFeature } from '../features/add-new-feature'

function observeBody() {
  const observer = new MutationObserver(() => {
    // ... существующие features
    
    runFeatureIf('newFeature', () => {
      addNewFeature()
    })
  })
  
  observer.observe(document.body, { childList: true, subtree: true })
}
```

### 5. Добавить UI в popup
```typescript
// entrypoints/popup/App.tsx
<div className="flex items-center justify-between">
  <div>
    <Label className="text-sm font-medium">
      New Feature
    </Label>
    <p className="text-xs text-muted-foreground">
      Description of the new feature
    </p>
  </div>
  <Switch
    checked={system.newFeature}
    onCheckedChange={(checked) => updateSystem({ newFeature: checked })}
  />
</div>
```

## Принципы работы

### 1. Условное выполнение
Все features выполняются только если включены в настройках:
```typescript
runFeatureIf('featureName', () => {
  // Код выполнится только если featureName === true
})
```

### 2. Автоматическое сохранение
Настройки автоматически сохраняются в browser storage при изменении.

### 3. Восстановление состояния
При загрузке страницы настройки восстанавливаются из storage.

### 4. UI переключения
Кнопка "Refreak ON/OFF" в правом верхнем углу позволяет быстро включать/выключать расширение.

## Отладка

### Логи в консоли
- `Refreak extension is enabled, initializing features...` - расширение включено
- `Refreak extension is disabled` - расширение выключено
- `Smurf detection feature is running...` - функция обнаружения смурфов активна
- `Adding extension toggle UI...` - добавление UI переключения

### Проверка настроек
```javascript
// В консоли браузера
const systemSettings = await storage.defineItem('local:systemSettings').getValue()
console.log(systemSettings)
```

## Безопасность

- Все features выполняются в try-catch блоках
- Ошибки логируются в консоль
- Расширение не ломает страницу при ошибках
- Настройки валидируются при загрузке 