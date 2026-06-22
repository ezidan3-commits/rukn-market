'use client'
import { useEffect, useState } from 'react'

export default function InstallPWA() {
  const [prompt, setPrompt] = useState<Event | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!prompt) return null

  const install = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const deferred = prompt as any
    deferred.prompt()
    const { outcome } = await deferred.userChoice
    if (outcome === 'accepted') setPrompt(null)
  }

  return (
    <button
      onClick={install}
      aria-label="حمّل التطبيق على هاتفك"
      title="حمّل التطبيق"
      className="bg-navy hover:bg-navy-light text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95 hover:scale-110"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    </button>
  )
}
