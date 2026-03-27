import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiPost } from '../lib/api-client';

interface Source {
  id: number;
  analysis_status: string;
}

function CapturePage() {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [opinion, setOpinion] = useState('');
  const [mode, setMode] = useState<'url' | 'text'>('url');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);

    try {
      const body: Record<string, string> = {};
      if (mode === 'url') {
        if (!url.trim()) {
          setError('Please enter a URL');
          setSubmitting(false);
          return;
        }
        body.url = url.trim();
      } else {
        if (!text.trim()) {
          setError('Please enter some text');
          setSubmitting(false);
          return;
        }
        body.text = text.trim();
      }
      if (opinion.trim()) body.opinion = opinion.trim();

      const source = await apiPost<Source>('/capture', body);

      if (source.analysis_status === 'extraction_failed') {
        setError('Could not extract article content. Try pasting the text instead.');
        setMode('text');
        setSubmitting(false);
        return;
      }

      navigate(`/source/${source.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Capture Source</h1>

      <div className="flex gap-2">
        <button
          onClick={() => setMode('url')}
          className={`px-3 py-1 rounded-md text-sm ${mode === 'url' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          Paste URL
        </button>
        <button
          onClick={() => setMode('text')}
          className={`px-3 py-1 rounded-md text-sm ${mode === 'text' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          Paste Text
        </button>
      </div>

      <section className="bg-white rounded-lg shadow p-6 space-y-4">
        {mode === 'url' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Article URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Article Text</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="Paste the article text here..."
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            What's your take? (optional)
          </label>
          <textarea
            value={opinion}
            onChange={(e) => setOpinion(e.target.value)}
            rows={2}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="Your opinion on this article..."
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? 'Capturing...' : 'Capture Source'}
        </button>
      </section>
    </div>
  );
}

export default CapturePage;
