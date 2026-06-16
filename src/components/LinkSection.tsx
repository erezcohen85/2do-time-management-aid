import { useState } from 'react'
import {
  ClipboardList,
  ExternalLink,
  FileText,
  FolderOpen,
  Link as LinkIcon,
  Plus,
  Presentation,
  Sheet,
  X,
} from 'lucide-react'
import { store, useDB, useLinks } from '@/data/hooks'
import { PROVIDER_META, cx, prettyUrl } from '@/lib/utils'
import type { LinkItem, LinkParentType, LinkProvider } from '@/types'

const PROVIDER_ICON: Record<LinkProvider, typeof FileText> = {
  gdoc: FileText,
  gsheet: Sheet,
  gslides: Presentation,
  gform: ClipboardList,
  gdrive: FolderOpen,
  web: LinkIcon,
}

export function LinkSection({
  parentType,
  parentId,
  compact = false,
}: {
  parentType: LinkParentType
  parentId: string
  compact?: boolean
}) {
  const links = useLinks(parentType, parentId)
  const { settings } = useDB()
  const mode = settings.linkDisplayMode
  const [adding, setAdding] = useState(false)

  if (links.length === 0 && !adding && compact) return null

  return (
    <div>
      {(links.length > 0 || !compact) && (
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-semibold tracking-wide text-ink-faint uppercase">
            Links
          </span>
          {links.length > 0 && (
            <button
              onClick={() =>
                store.updateSettings({ linkDisplayMode: mode === 'chips' ? 'list' : 'chips' })
              }
              className="rounded-md px-1.5 py-0.5 text-xs text-ink-faint transition-colors hover:bg-line-soft hover:text-ink-soft"
              title="Toggle chips / list view"
            >
              {mode === 'chips' ? 'List view' : 'Chip view'}
            </button>
          )}
        </div>
      )}

      {mode === 'chips' ? (
        <div className="flex flex-wrap gap-1.5">
          {links.map((l) => (
            <LinkChip key={l.id} link={l} />
          ))}
          {!adding && <AddButton chip onClick={() => setAdding(true)} />}
        </div>
      ) : (
        <div className="flex flex-col gap-0.5">
          {links.map((l) => (
            <LinkRow key={l.id} link={l} />
          ))}
          {!adding && <AddButton onClick={() => setAdding(true)} />}
        </div>
      )}

      {adding && (
        <AddLinkForm
          onAdd={(url, title) => {
            store.addLink(parentType, parentId, url, title)
          }}
          onDone={() => setAdding(false)}
        />
      )}
    </div>
  )
}

function AddButton({ onClick, chip }: { onClick: () => void; chip?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        'flex items-center gap-1 text-ink-faint transition-colors hover:text-accent',
        chip
          ? 'rounded-full border border-dashed border-line px-2.5 py-1 text-xs hover:border-accent/40'
          : 'px-1 py-1 text-xs',
      )}
    >
      <Plus className="h-3.5 w-3.5" /> Add link
    </button>
  )
}

function LinkChip({ link }: { link: LinkItem }) {
  const meta = PROVIDER_META[link.provider]
  const Icon = PROVIDER_ICON[link.provider]
  return (
    <span
      className="group inline-flex max-w-full items-center gap-1.5 rounded-full py-1 pr-1.5 pl-2.5 text-xs font-medium"
      style={{ background: meta.bg, color: meta.color }}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <a
        href={link.url}
        target="_blank"
        rel="noreferrer"
        className="max-w-[16rem] truncate hover:underline"
        title={link.url}
      >
        {link.title || meta.label}
      </a>
      <button
        onClick={() => store.deleteLink(link.id)}
        className="grid h-4 w-4 place-items-center rounded-full opacity-0 transition-opacity group-hover:opacity-70 hover:!opacity-100"
        title="Remove link"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  )
}

function LinkRow({ link }: { link: LinkItem }) {
  const meta = PROVIDER_META[link.provider]
  const Icon = PROVIDER_ICON[link.provider]
  return (
    <div className="group flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-line-soft">
      <Icon className="h-4 w-4 shrink-0" style={{ color: meta.color }} />
      <a
        href={link.url}
        target="_blank"
        rel="noreferrer"
        className="flex min-w-0 flex-1 items-center gap-1.5 text-sm text-ink-soft hover:text-accent"
        title={link.url}
      >
        <span className="truncate">{link.title || prettyUrl(link.url)}</span>
        <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />
      </a>
      <button
        onClick={() => store.deleteLink(link.id)}
        className="grid h-5 w-5 place-items-center rounded text-ink-faint opacity-0 transition-opacity group-hover:opacity-100 hover:bg-line hover:text-danger"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

function AddLinkForm({
  onAdd,
  onDone,
}: {
  onAdd: (url: string, title?: string) => void
  onDone: () => void
}) {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')

  const submit = () => {
    if (url.trim()) onAdd(url, title)
    onDone()
  }

  return (
    <div className="mt-2 flex flex-col gap-2 rounded-lg border border-line bg-canvas p-2">
      <input
        autoFocus
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit()
          if (e.key === 'Escape') onDone()
        }}
        placeholder="Paste a Drive / Docs / Forms URL…"
        className="w-full rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/15"
      />
      <div className="flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit()
            if (e.key === 'Escape') onDone()
          }}
          placeholder="Label (optional)"
          className="w-full rounded-md border border-line bg-surface px-2.5 py-1.5 text-sm outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/15"
        />
        <button
          onClick={submit}
          className="shrink-0 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          Add
        </button>
        <button
          onClick={onDone}
          className="shrink-0 rounded-md px-2 py-1.5 text-sm text-ink-faint hover:text-ink"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
