import React from 'dom-chef'

export default ({ emoji, smurfScore, reasons }) => {
  // Получаем Unicode код эмодзи
  const codePoint = emoji.codePointAt(0)
  const hexCode = codePoint.toString(16)

  // Используем CDN версию twemoji для браузерного окружения
  const twemojiUrl = `https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/${hexCode}.svg`

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: '16px',
        cursor: 'help',
        lineHeight: '1',
        verticalAlign: 'middle',
      }}
      title={`Smurf score: ${smurfScore}`}
    >
      <img
        src={twemojiUrl}
        alt={emoji}
        style={{
          width: '16px',
          height: '16px',
          display: 'inline-block',
          verticalAlign: 'middle',
        }}
        onError={(e) => {
          // Если изображение не загрузилось, показываем оригинальный эмодзи
          e.target.style.display = 'none'
          const fallback = e.target.parentNode.querySelector('.emoji-fallback')
          if (fallback) {
            fallback.style.display = 'inline'
          }
        }}
      />
      <span
        className="emoji-fallback"
        style={{ display: 'none', fontSize: '16px' }}
      >
        {emoji}
      </span>
    </div>
  )
}
