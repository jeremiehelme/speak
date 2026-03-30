import { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

interface DraftEditorProps {
  content: string;
  onUpdate: (text: string) => void;
}

export default function DraftEditor({ content, onUpdate }: DraftEditorProps) {
  const lastEmitted = useRef(content);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        code: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        horizontalRule: false,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      const text = editor.getText();
      lastEmitted.current = text;
      onUpdate(text);
    },
  });

  useEffect(() => {
    if (editor && content !== lastEmitted.current) {
      editor.commands.setContent(content);
      lastEmitted.current = content;
    }
  }, [content, editor]);

  return (
    <div>
      <div className="flex gap-1 mb-1">
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleBold().run()}
          className={`px-2 py-1 text-xs rounded border ${
            editor?.isActive('bold')
              ? 'bg-gray-800 text-white border-gray-800'
              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
          }`}
        >
          B
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          className={`px-2 py-1 text-xs rounded border italic ${
            editor?.isActive('italic')
              ? 'bg-gray-800 text-white border-gray-800'
              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
          }`}
        >
          I
        </button>
      </div>
      <EditorContent
        editor={editor}
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[6rem] [&_.ProseMirror_p]:my-0"
      />
    </div>
  );
}
