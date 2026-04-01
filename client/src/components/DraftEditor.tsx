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
      {/* Win2K toolbar for bold/italic */}
      <div
        style={{
          display: 'flex',
          gap: 2,
          marginBottom: 4,
          padding: '2px 4px',
          background: '#d4d0c8',
          borderTop: '1px solid #fff',
          borderLeft: '1px solid #fff',
          borderRight: '1px solid #404040',
          borderBottom: '1px solid #404040',
        }}
      >
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleBold().run()}
          style={{
            fontWeight: 'bold',
            fontFamily: '"Tahoma", Arial, sans-serif',
            fontSize: 11,
            padding: '1px 6px',
            cursor: 'pointer',
            background: editor?.isActive('bold') ? '#a0a098' : '#d4d0c8',
            borderTop: editor?.isActive('bold') ? '1px solid #404040' : '1px solid #fff',
            borderLeft: editor?.isActive('bold') ? '1px solid #404040' : '1px solid #fff',
            borderRight: editor?.isActive('bold') ? '1px solid #fff' : '1px solid #404040',
            borderBottom: editor?.isActive('bold') ? '1px solid #fff' : '1px solid #404040',
          }}
        >
          B
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          style={{
            fontStyle: 'italic',
            fontFamily: '"Tahoma", Arial, sans-serif',
            fontSize: 11,
            padding: '1px 6px',
            cursor: 'pointer',
            background: editor?.isActive('italic') ? '#a0a098' : '#d4d0c8',
            borderTop: editor?.isActive('italic') ? '1px solid #404040' : '1px solid #fff',
            borderLeft: editor?.isActive('italic') ? '1px solid #404040' : '1px solid #fff',
            borderRight: editor?.isActive('italic') ? '1px solid #fff' : '1px solid #404040',
            borderBottom: editor?.isActive('italic') ? '1px solid #fff' : '1px solid #404040',
          }}
        >
          I
        </button>
      </div>

      {/* Win2K sunken text area */}
      <EditorContent
        editor={editor}
        className="win-editor"
        style={{
          background: '#ffffff',
          borderTop: '2px solid #404040',
          borderLeft: '2px solid #404040',
          borderRight: '2px solid #ffffff',
          borderBottom: '2px solid #ffffff',
          padding: '4px',
          minHeight: '6rem',
          fontFamily: '"Courier New", monospace',
          fontSize: 12,
        }}
      />
    </div>
  );
}
