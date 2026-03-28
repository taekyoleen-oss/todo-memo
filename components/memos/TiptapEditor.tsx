'use client'
import { useEditor, EditorContent } from '@tiptap/react'
import { useEffect } from 'react'
import StarterKit from '@tiptap/starter-kit'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Underline from '@tiptap/extension-underline'
import Highlight from '@tiptap/extension-highlight'
import Link from '@tiptap/extension-link'
import Typography from '@tiptap/extension-typography'
import { Bold, Italic, Underline as UnderlineIcon, Highlighter, List, ListOrdered, CheckSquare, Code } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { JSONContent } from '@tiptap/react'

interface Props {
  content: JSONContent | null
  onChange: (content: JSONContent) => void
  editable?: boolean
  className?: string
}

export function TiptapEditor({ content, onChange, editable = true, className }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TaskList,
      TaskItem.configure({ nested: true }),
      Underline,
      Highlight,
      Link.configure({ openOnClick: false }),
      Typography,
    ],
    content: content ?? undefined,
    editable,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON())
    },
    editorProps: {
      attributes: {
        class: cn(
          'memo-card-content prose prose-sm max-w-none min-h-[80px] focus:outline-none',
          'prose-p:my-1 prose-headings:my-2',
          className ?? ''
        ),
      },
    },
  })

  useEffect(() => {
    if (editor && editor.isEditable !== editable) {
      editor.setEditable(editable)
      if (editable) {
        setTimeout(() => editor.commands.focus('end'), 10)
      }
    }
  }, [editor, editable])

  if (!editor) return null

  return (
    <div className="flex flex-col gap-1">
      {editable && (
        <div className="flex flex-wrap gap-0.5 border-b border-border pb-1 mb-1">
          {[
            { icon: Bold, action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive('bold'), title: '굵게' },
            { icon: Italic, action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive('italic'), title: '기울임' },
            { icon: UnderlineIcon, action: () => editor.chain().focus().toggleUnderline().run(), active: editor.isActive('underline'), title: '밑줄' },
            { icon: Highlighter, action: () => editor.chain().focus().toggleHighlight().run(), active: editor.isActive('highlight'), title: '형광펜' },
            { icon: List, action: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive('bulletList'), title: '목록' },
            { icon: ListOrdered, action: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive('orderedList'), title: '번호 목록' },
            { icon: CheckSquare, action: () => editor.chain().focus().toggleTaskList().run(), active: editor.isActive('taskList'), title: '체크리스트' },
            { icon: Code, action: () => editor.chain().focus().toggleCode().run(), active: editor.isActive('code'), title: '코드' },
          ].map(({ icon: Icon, action, active, title }) => (
            <button
              key={title}
              type="button"
              onClick={action}
              title={title}
              className={cn(
                'p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors',
                active && 'bg-accent text-foreground'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  )
}
