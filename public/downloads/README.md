# Desktop installers

When external download URLs are not configured, the download panel uses these files:

- `chat-client-windows.exe`
- `chat-client-macos.dmg`

Do not commit large release binaries unless the repository is configured for them. In production, prefer setting `NEXT_PUBLIC_CHAT_WINDOWS_DOWNLOAD_URL` and `NEXT_PUBLIC_CHAT_MACOS_DOWNLOAD_URL` to release or object-storage URLs.
