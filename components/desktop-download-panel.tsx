'use client'

import { useEffect, useState } from 'react'
import { Apple, Check, Download, Monitor } from 'lucide-react'
import { cn } from '@/lib/utils'

type Platform = 'windows' | 'macos'

interface DesktopDownloadPanelProps {
  title: string
  description: string
  windowsLabel: string
  macosLabel: string
  downloadLabel: string
  unavailableLabel: string
  recommendedLabel: string
  windowsUrl?: string
  macosUrl?: string
  compact?: boolean
}

export function DesktopDownloadPanel({
  title,
  description,
  windowsLabel,
  macosLabel,
  downloadLabel,
  unavailableLabel,
  recommendedLabel,
  windowsUrl,
  macosUrl,
  compact = false,
}: DesktopDownloadPanelProps) {
  const [platform, setPlatform] = useState<Platform>('windows')
  const [detectedPlatform, setDetectedPlatform] = useState<Platform | null>(null)

  useEffect(() => {
    const detected = /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent)
      ? 'macos'
      : /Windows/i.test(navigator.userAgent)
        ? 'windows'
        : null

    if (detected) {
      setDetectedPlatform(detected)
      setPlatform(detected)
    }
  }, [])

  const options = [
    { id: 'windows' as const, label: windowsLabel, url: windowsUrl, icon: Monitor },
    { id: 'macos' as const, label: macosLabel, url: macosUrl, icon: Apple },
  ]
  const selected = options.find(option => option.id === platform) ?? options[0]

  return (
    <div className={cn('mx-auto flex w-full min-w-0 max-w-4xl flex-col items-center text-center', compact ? 'gap-6' : 'gap-8')}>
      <div className="flex size-20 items-center justify-center rounded-full bg-foreground text-background shadow-sm">
        <Download className="size-9" aria-hidden="true" />
      </div>

      <div className="max-w-2xl">
        <h2 className={cn('font-bold', compact ? 'text-2xl md:text-3xl' : 'text-3xl md:text-4xl')}>
          {title}
        </h2>
        <p className="mt-3 text-base text-muted-foreground md:text-lg">{description}</p>
      </div>

      <div className="grid w-full min-w-0 max-w-xl grid-cols-[repeat(2,minmax(0,1fr))] gap-2 rounded-lg border bg-background p-1.5" role="tablist">
        {options.map(option => {
          const Icon = option.icon
          const active = option.id === platform

          return (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setPlatform(option.id)}
              className={cn(
                'relative flex min-h-14 min-w-0 items-center justify-center gap-2 overflow-hidden rounded-md px-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-3',
                active ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className="size-5" aria-hidden="true" />
              <span className="truncate">{option.label}</span>
              {detectedPlatform === option.id && (
                <span className="hidden items-center gap-1 text-xs opacity-70 sm:flex">
                  <Check className="size-3" aria-hidden="true" />
                  {recommendedLabel}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {selected.url ? (
        <a
          href={selected.url}
          className="inline-flex h-12 min-w-56 items-center justify-center gap-2 rounded-md bg-foreground px-6 text-sm font-medium text-background transition-colors hover:bg-foreground/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Download className="size-4" aria-hidden="true" />
          {downloadLabel} {selected.label}
        </a>
      ) : (
        <button
          type="button"
          disabled
          className="inline-flex h-12 min-w-56 items-center justify-center gap-2 rounded-md bg-muted px-6 text-sm font-medium text-muted-foreground"
        >
          <Download className="size-4" aria-hidden="true" />
          {selected.label} {unavailableLabel}
        </button>
      )}
    </div>
  )
}
