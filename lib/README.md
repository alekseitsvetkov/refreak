# Lib Directory

Эта папка содержит общие утилиты и API клиенты для работы с FACEIT.

## Файлы

### `storage.ts`
Общие определения storage для всего расширения.

**Экспорты:**
- `appearanceSettings` - настройки внешнего вида
- `systemSettings` - системные настройки
- `uiSettings` - настройки интерфейса
- Типы: `AppearanceSettings`, `SystemSettings`, `UISettings`, `Theme`

### `faceit-api.ts`
Современный API клиент для работы с FACEIT API.

**Особенности:**
- Автоматическое кеширование запросов (10 минут)
- Retry логика с экспоненциальной задержкой
- TypeScript типы для всех ответов
- Обработка ошибок API

**Основные функции:**
- `getUser(userId)` - получить информацию о пользователе
- `getPlayer(nickname)` - получить игрока по никнейму
- `getPlayerStats(userId, game, size)` - получить статистику игрока
- `getMatch(matchId)` - получить информацию о матче
- `getPlayerHistory(userId, page)` - получить историю матчей

**Типы:**
- `FaceitUser` - информация о пользователе
- `FaceitMatch` - информация о матче
- `FaceitPlayer` - информация об игроке
- `PlayerStats` - статистика игрока
- `MatchHistory` - история матчей

### `match-room.ts`
Утилиты для работы с match room страницами FACEIT.

**Основные функции:**
- `getRoomId(path)` - извлечь ID комнаты из URL
- `getTeamElements(parent)` - найти элементы команд
- `getFactionDetails(element)` - получить информацию о фракции
- `getTeamMemberElements(parent)` - найти элементы игроков команды
- `mapPlayersToPartyColors()` - сопоставить игроков с цветами партий
- `mapMatchFactionRosters()` - получить составы команд
- `mapMatchNicknamesToPlayers()` - сопоставить никнеймы с игроками

**Кеширование:**
- Встроенное кеширование для дорогих операций
- Memoized версии функций для оптимизации производительности

**DOM утилиты:**
- `select(selector, parent)` - найти один элемент
- `selectAll(selector, parent)` - найти все элементы

### `dom-element.ts`
Утилиты для работы с DOM элементами и отслеживания функций.

**Экспорты:**
- `ENHANCER_ATTRIBUTE` - префикс для атрибутов функций
- `setFeatureAttribute(featureName, element)` - установить атрибут функции
- `hasFeatureAttribute(featureName, element)` - проверить наличие атрибута функции
- `setStyle(element, style)` - установить стили элемента
- `isFaceitNext()` - проверить, используется ли новая версия FACEIT

### `elo.ts`
Утилиты для работы с ELO рейтингом и расчетов.

**Основные функции:**
- `normalizeElo(elo)` - нормализовать ELO строку в число
- `estimateRatingChange(elo1, elo2, K)` - рассчитать изменение рейтинга
- `estimateRatingChangeMemoized()` - мемоизированная версия
- `predictRatingChange(winProbability, K)` - предсказать изменение рейтинга
- `getEloChangesByMatches(matches)` - получить изменения ELO по матчам

**Константы:**
- `SKILL_LEVELS_BY_GAME` - уровни навыков для разных игр

### `match-history.ts`
Утилиты для работы с историей матчей.

**Основные функции:**
- `getMatchHistory(playerId, totalMatches)` - получить историю матчей игрока
- Рекурсивная загрузка с кешированием
- Ограничение глубины рекурсии для безопасности

### `player-profile.ts`
Утилиты для работы с профилями игроков.

**Основные функции:**
- `getPlayerProfileNickname(path)` - извлечь никнейм из URL профиля
- `getPlayerProfileStatsGame(path)` - извлечь игру из URL статистики

### `team-page.ts`
Утилиты для работы со страницами команд.

**Основные функции:**
- `getTeamId(path)` - извлечь ID команды из URL
- `getTeamMemberPlayerElements(parent)` - найти элементы игроков команды
- `getTeamMemberNicknameElement(parent)` - найти элемент никнейма игрока

### `user.ts`
Утилиты для работы с пользователями.

**Основные функции:**
- `isLoggedIn()` - проверить, авторизован ли пользователь

## Использование

```typescript
import { getPlayer, getPlayerStats } from '../lib/faceit-api'
import { getRoomId, getTeamElements } from '../lib/match-room'
import { setFeatureAttribute, hasFeatureAttribute } from '../lib/dom-element'
import { normalizeElo, estimateRatingChange } from '../lib/elo'

// Получить статистику игрока
const stats = await getPlayerStats('user123', 'cs2', 20)

// Найти игроков в match room
const roomId = getRoomId()
const { teamElements } = getTeamElements(document.body)

// Отметить, что функция выполнена
setFeatureAttribute('smurf-detection', document.body)

// Рассчитать изменение ELO
const eloChange = estimateRatingChange(1500, 1600)
```

## Кеширование

Все API запросы автоматически кешируются на 10 минут. Кеш хранится в памяти и очищается при перезагрузке страницы.

Для match room операций используется отдельный кеш на 5 минут для дорогих вычислений.

## Обработка ошибок

Все функции API возвращают `null` при ошибках и логируют детали в консоль. Это позволяет расширению продолжать работать даже при проблемах с API.

## Отслеживание функций

Используйте `setFeatureAttribute()` и `hasFeatureAttribute()` для предотвращения повторного выполнения функций на одной странице. 