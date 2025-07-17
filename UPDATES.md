# Обновления для новой разметки FACEIT

## Проблема
FACEIT обновил разметку match room страниц, что привело к тому, что наши селекторы перестали работать.

## Решение
Обновлены селекторы в `lib/match-room.ts` для поддержки как новой, так и старой разметки.

### Новые селекторы
```typescript
// Новые константы для селекторов
export const NEW_PLAYER_CARD = '.ListContentPlayer__Holder-sc-b2e37a95-1'
export const NEW_NICKNAME_ELEMENT = '.Nickname__Name-sc-e7d5c77a-1'
export const NEW_TEAM_CONTAINER = '.RosterParty__PartyStart-sc-a1d1e41c-1'
```

### Обновленные функции

#### `getTeamElements()`
- Сначала пытается найти элементы в новой разметке
- Если не найдено, использует старые селекторы
- Обеспечивает обратную совместимость

#### `getTeamMemberElements()`
- Ищет игроков в новой разметке: `.ListContentPlayer__Holder-sc-b2e37a95-1`
- Fallback на старую разметку: `.match-team-member`

#### `getNicknameElement()`
- Ищет никнеймы в новой разметке: `.Nickname__Name-sc-e7d5c77a-1`
- Fallback на старую разметку: `strong[ng-bind="vm.teamMember.nickname"]`

### Структура новой разметки
```html
<div class="RosterParty__PartyStart-sc-a1d1e41c-1">
  <div class="ListContentPlayer__Holder-sc-b2e37a95-1">
    <div class="Nickname__Name-sc-e7d5c77a-1">chtotydelaew</div>
  </div>
</div>
```

### Обновления в smurf detection
- Обновлены все функции для использования новых селекторов
- Добавлена поддержка `getNicknameElement()` вместо прямых селекторов
- Исправлены ошибки с парсингом timestamp'ов

## Преимущества
1. **Обратная совместимость** - работает с обеими версиями разметки
2. **Автоматическое определение** - выбирает правильные селекторы
3. **Надежность** - fallback на старые селекторы при необходимости
4. **Простота поддержки** - централизованные селекторы в одном месте

## Тестирование
- Сборка проходит успешно
- Все TypeScript ошибки исправлены
- Функции готовы к использованию на новой разметке FACEIT 