import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Создаем QueryClient с настройками кеширования
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Время жизни кеша по умолчанию (10 минут)
      staleTime: 10 * 60 * 1000,
      // Время кеширования (30 минут)
      gcTime: 30 * 60 * 1000,
      // Количество повторных попыток при ошибке
      retry: 3,
      // Задержка между повторными попытками
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Обновлять данные при фокусе окна
      refetchOnWindowFocus: false,
      // Обновлять данные при переподключении
      refetchOnReconnect: true,
    },
  },
})

interface ReactQueryProviderProps {
  children: React.ReactNode
}

export function ReactQueryProvider({ children }: ReactQueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

export { queryClient } 