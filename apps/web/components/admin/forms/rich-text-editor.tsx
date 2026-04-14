'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import { useEffect, useCallback } from 'react';
import {
  Bold,
  Italic,
  UnderlineIcon,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Link2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo2,
  Redo2,
  Link2Off,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, isActive, disabled, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex items-center justify-center h-7 w-7 rounded-md transition-all text-sm',
        'hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed',
        isActive
          ? 'bg-[var(--rbs-red)]/20 text-[var(--rbs-red)] ring-1 ring-[var(--rbs-red)]/40'
          : 'text-white/70 hover:text-white',
      )}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-5 bg-white/10 mx-0.5" />;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Rédigez votre contenu ici...',
  className,
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          class: 'text-[var(--rbs-red)] underline underline-offset-2',
          rel: 'noopener noreferrer',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-lg max-w-full my-4',
        },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass:
          'before:content-[attr(data-placeholder)] before:float-left before:text-white/25 before:pointer-events-none before:h-0',
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right'],
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class:
          'prose prose-invert prose-sm max-w-none min-h-[200px] p-4 focus:outline-none text-white/90',
      },
    },
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
  });

  // Sync external value changes (e.g. when form resets)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes('link').href as string;
    // eslint-disable-next-line no-alert
    const url = window.prompt('URL du lien :', prev ?? 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div
      className={cn(
        'rounded-xl border border-white/10 bg-white/5 overflow-hidden flex flex-col',
        className,
      )}
    >
      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b border-white/10 bg-black/40 px-2 py-1.5 backdrop-blur-sm">
        {/* History */}
        <ToolbarButton
          title="Annuler"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        >
          <Undo2 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Rétablir"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        >
          <Redo2 className="h-3.5 w-3.5" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Headings */}
        <ToolbarButton
          title="Titre H2"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
        >
          <Heading2 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Titre H3"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive('heading', { level: 3 })}
        >
          <Heading3 className="h-3.5 w-3.5" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Inline marks */}
        <ToolbarButton
          title="Gras"
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
        >
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Italique"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
        >
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Souligné"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive('underline')}
        >
          <UnderlineIcon className="h-3.5 w-3.5" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Lists */}
        <ToolbarButton
          title="Liste à puces"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
        >
          <List className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Liste numérotée"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Alignment */}
        <ToolbarButton
          title="Aligner à gauche"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          isActive={editor.isActive({ textAlign: 'left' })}
        >
          <AlignLeft className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Centrer"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          isActive={editor.isActive({ textAlign: 'center' })}
        >
          <AlignCenter className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Aligner à droite"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          isActive={editor.isActive({ textAlign: 'right' })}
        >
          <AlignRight className="h-3.5 w-3.5" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Link */}
        <ToolbarButton
          title="Insérer un lien"
          onClick={setLink}
          isActive={editor.isActive('link')}
        >
          <Link2 className="h-3.5 w-3.5" />
        </ToolbarButton>
        {editor.isActive('link') && (
          <ToolbarButton
            title="Supprimer le lien"
            onClick={() => editor.chain().focus().unsetLink().run()}
          >
            <Link2Off className="h-3.5 w-3.5" />
          </ToolbarButton>
        )}
      </div>

      {/* ── Editor area ──────────────────────────────────────────── */}
      <EditorContent
        editor={editor}
        className="flex-1 [&_.ProseMirror]:min-h-[200px] [&_.ProseMirror_h2]:text-xl [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h2]:text-white [&_.ProseMirror_h2]:mt-4 [&_.ProseMirror_h2]:mb-2 [&_.ProseMirror_h3]:text-lg [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_h3]:text-white [&_.ProseMirror_h3]:mt-3 [&_.ProseMirror_h3]:mb-1.5 [&_.ProseMirror_p]:text-white/80 [&_.ProseMirror_p]:leading-relaxed [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-5 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-5 [&_.ProseMirror_li]:text-white/80 [&_.ProseMirror_li]:my-0.5 [&_.ProseMirror_strong]:text-white [&_.ProseMirror_em]:italic [&_.ProseMirror_u]:underline"
      />
    </div>
  );
}
