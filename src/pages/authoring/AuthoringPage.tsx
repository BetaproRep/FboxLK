import { useMemo, useState, type ChangeEventHandler } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import { helpMarkdownDefault, parseHelpSections } from '@/pages/help/helpManifest'
import { quickStartMarkdownDefault, parseQuickStartSteps } from '@/pages/quickstart/content'
import { pageHelpRawDefault, parsePageHelpMarkdown } from '@/content/pageHelp'
import {
  clearMarkdownOverride,
  getMarkdownWithOverride,
  HELP_OVERRIDE_STORAGE_KEY,
  PAGE_HELP_OVERRIDE_STORAGE_KEY,
  PAGE_HELP_WRITER_MODE_KEY,
  QUICKSTART_OVERRIDE_STORAGE_KEY,
  setMarkdownOverride,
  setPageHelpWriterMode,
  usePageHelpWriterMode,
} from '@/content/authoringState'

interface ManagedFile {
  key: string
  title: string
  fileName: string
  storageKey: string
  defaultContent: string
  validate: (markdown: string) => string[]
}

const MANAGED_FILES: ManagedFile[] = [
  {
    key: 'help',
    title: 'Основная справка',
    fileName: 'help.md',
    storageKey: HELP_OVERRIDE_STORAGE_KEY,
    defaultContent: helpMarkdownDefault,
    validate: (markdown) => parseHelpSections(markdown).issues.map((x) => `Строка ${x.line}: ${x.message}`),
  },
  {
    key: 'page-help',
    title: 'Инлайн-справки страниц/табов',
    fileName: 'page-help.md',
    storageKey: PAGE_HELP_OVERRIDE_STORAGE_KEY,
    defaultContent: pageHelpRawDefault,
    validate: (markdown) => parsePageHelpMarkdown(markdown).issues.map((x) => `Строка ${x.line}: ${x.message}`),
  },
  {
    key: 'quickstart',
    title: 'Быстрый старт',
    fileName: 'quickstart.md',
    storageKey: QUICKSTART_OVERRIDE_STORAGE_KEY,
    defaultContent: quickStartMarkdownDefault,
    validate: (markdown) => parseQuickStartSteps(markdown).issues.map((x) => `Строка ${x.line}: ${x.message}`),
  },
]

export default function AuthoringPage() {
  const writerModeEnabled = usePageHelpWriterMode()
  const [messages, setMessages] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string[]>>({})

  const fileSources = useMemo(() => {
    const entries: Record<string, string> = {}
    for (const file of MANAGED_FILES) {
      entries[file.key] = getMarkdownWithOverride(file.defaultContent, file.storageKey)
    }
    return entries
  }, [messages])

  const setMessage = (key: string, message: string) => {
    setMessages((prev) => ({ ...prev, [key]: message }))
  }

  const setValidationErrors = (key: string, list: string[]) => {
    setErrors((prev) => ({ ...prev, [key]: list }))
  }

  const handleExport = (file: ManagedFile) => {
    const content = fileSources[file.key]
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = file.fileName
    a.click()
    URL.revokeObjectURL(url)
    setMessage(file.key, `Файл ${file.fileName} выгружен.`)
  }

  const handleReset = (file: ManagedFile) => {
    clearMarkdownOverride(file.storageKey)
    setValidationErrors(file.key, [])
    setMessage(file.key, `Для ${file.fileName} восстановлена версия из репозитория.`)
  }

  const handleImport = (file: ManagedFile): ChangeEventHandler<HTMLInputElement> => async (event) => {
    const uploaded = event.target.files?.[0]
    event.currentTarget.value = ''
    if (!uploaded) return

    const markdown = await uploaded.text()
    const validation = file.validate(markdown)
    if (validation.length > 0) {
      setValidationErrors(file.key, validation)
      setMessage(file.key, `Импорт ${file.fileName} отклонён: исправьте ошибки контракта.`)
      return
    }

    setMarkdownOverride(file.storageKey, markdown)
    setValidationErrors(file.key, [])
    setMessage(file.key, `Импорт ${file.fileName} успешно применён.`)
  }

  return (
    <div>
      <PageHeader
        title="Авторинг"
        subtitle={<span className="text-sm text-gray-500">Управление markdown-контентом и режимом техписателя</span>}
      />

      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={writerModeEnabled}
            onChange={(e) => setPageHelpWriterMode(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          Writer mode для page-help (глобально для всех страниц)
        </label>
        <p className="mt-2 text-xs text-gray-500">
          Ключ: <code>{PAGE_HELP_WRITER_MODE_KEY}</code>. В этом режиме иконки справки всегда видимы, панели открыты по умолчанию.
        </p>
      </div>

      <div className="space-y-4">
        {MANAGED_FILES.map((file) => (
          <section key={file.key} className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-gray-900">{file.title}</h2>
            <p className="mt-1 text-xs text-gray-500">
              Файл: <code>{file.fileName}</code>
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleExport(file)}
                className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Скачать
              </button>
              <label className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer">
                Загрузить
                <input type="file" accept=".md,text/markdown,text/plain" onChange={handleImport(file)} className="hidden" />
              </label>
              <button
                type="button"
                onClick={() => handleReset(file)}
                className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Сбросить к дефолту
              </button>
            </div>

            {messages[file.key] && <p className="mt-2 text-xs text-gray-600">{messages[file.key]}</p>}
            {(errors[file.key] ?? []).length > 0 && (
              <div className="mt-3 rounded-md border border-red-300 bg-red-50 p-3">
                <p className="text-xs font-medium text-red-900">Ошибки в загруженном markdown:</p>
                <ul className="mt-1 list-disc pl-5 text-xs text-red-800">
                  {(errors[file.key] ?? []).map((err) => <li key={err}>{err}</li>)}
                </ul>
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  )
}
