import { setRequestLocale, getTranslations } from 'next-intl/server'
import { DesktopDownloadPanel } from '@/components/desktop-download-panel'

type Props = { params: Promise<{ locale: string }> }

export default async function ChatDownloadPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('DownloadPage')

  return (
    <main className="flex min-h-[calc(100svh-3.5rem)] min-w-0 items-center justify-center overflow-hidden bg-muted/40 px-6 py-16">
      <DesktopDownloadPanel
        title={t('title')}
        description={t('description')}
        windowsLabel={t('windows')}
        macosLabel={t('macos')}
        downloadLabel={t('download')}
        recommendedLabel={t('recommended')}
        windowsUrl={process.env.NEXT_PUBLIC_CHAT_WINDOWS_DOWNLOAD_URL}
        macosUrl={process.env.NEXT_PUBLIC_CHAT_MACOS_DOWNLOAD_URL}
      />
    </main>
  )
}
