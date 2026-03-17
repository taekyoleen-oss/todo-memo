import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'TaskFlow',
  description: 'To-Do와 메모를 한 곳에서 관리하는 개인 생산성 앱',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
        <footer className="mt-16 border-t border-[#E2E8F0] bg-[#F8FAFC] py-8 text-center">
          <p className="text-sm text-[#64748B] mb-2">더 많은 앱을 활용하거나 만들고 싶으면</p>
          <a
            href="https://www.vibecodinglab.ai.kr/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#0891B2] hover:text-[#0E7490] transition-colors"
          >
            🚀 바이브코딩랩 방문하기
          </a>
          <p className="text-xs text-[#94A3B8] mt-1">vibecodinglab.ai.kr</p>
        </footer>
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  )
}
