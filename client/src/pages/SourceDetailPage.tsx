import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSource, useGenerateAngles, useDeleteSource, useRetryAnalysis, type Angle } from '../hooks/use-sources';
import { useGenerateDraft, useUpdateDraft, useRegenerateDraft, type Draft } from '../hooks/use-drafts';

function SourceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: source, isLoading, error } = useSource(id);
  const generateAngles = useGenerateAngles();
  const generateDraft = useGenerateDraft();
  const updateDraft = useUpdateDraft();
  const regenerateDraft = useRegenerateDraft();
  const deleteSource = useDeleteSource();
  const retryAnalysis = useRetryAnalysis();

  const [angles, setAngles] = useState<Angle[]>([]);
  const [selectedAngle, setSelectedAngle] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftContent, setDraftContent] = useState('');
  const [feedback, setFeedback] = useState('');
  const [copied, setCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (isLoading) return <div className="text-gray-500">Loading source...</div>;
  if (error) return <div className="text-red-600">Error: {(error as Error).message}</div>;
  if (!source) return <div className="text-gray-500">Source not found</div>;

  const themes = source.themes ? JSON.parse(source.themes) as string[] : [];
  const takeaways = source.takeaways ? JSON.parse(source.takeaways) as string[] : [];

  const handleGenerateAngles = async (count: number) => {
    const result = await generateAngles.mutateAsync({ sourceId: source.id, count });
    setAngles(result);
    if (result.length === 1) {
      setSelectedAngle(result[0]!.title);
    }
  };

  const handleGenerateDraft = async () => {
    if (!selectedAngle) return;
    const result = await generateDraft.mutateAsync({ sourceId: source.id, angle: selectedAngle });
    setDraft(result);
    setDraftContent(result.content || '');
  };

  const handleSaveDraft = async () => {
    if (!draft) return;
    const updated = await updateDraft.mutateAsync({ draftId: draft.id, content: draftContent });
    setDraft(updated);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(draftContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = async () => {
    if (!draft) return;
    const result = await regenerateDraft.mutateAsync({
      draftId: draft.id,
      feedback: feedback || undefined,
      angle: selectedAngle || undefined,
    });
    setDraft(result);
    setDraftContent(result.content || '');
    setFeedback('');
  };

  const handleDelete = async () => {
    await deleteSource.mutateAsync(source.id);
    navigate('/');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{source.title || 'Untitled Source'}</h1>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-md"
        >
          Delete
        </button>
      </div>

      {showDeleteConfirm && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">Delete this source and all its drafts?</p>
          <div className="flex gap-2 mt-2">
            <button onClick={handleDelete} className="px-3 py-1 bg-red-600 text-white rounded-md text-sm">Confirm</button>
            <button onClick={() => setShowDeleteConfirm(false)} className="px-3 py-1 bg-gray-200 rounded-md text-sm">Cancel</button>
          </div>
        </div>
      )}

      {source.url && (
        <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm hover:underline">
          {source.url}
        </a>
      )}

      {source.opinion && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm font-medium text-yellow-800">Your take:</p>
          <p className="text-sm text-yellow-700">{source.opinion}</p>
        </div>
      )}

      {/* Analysis Section */}
      {source.analysis_status === 'complete' ? (
        <section className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Analysis</h2>
          <p className="text-sm text-gray-700">{source.analysis_summary}</p>
          {themes.length > 0 && (
            <div>
              <span className="text-xs font-medium text-gray-500">Themes:</span>
              <div className="flex gap-1 mt-1">
                {themes.map((t: string) => (
                  <span key={t} className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">{t}</span>
                ))}
              </div>
            </div>
          )}
          {takeaways.length > 0 && (
            <div>
              <span className="text-xs font-medium text-gray-500">Key Takeaways:</span>
              <ul className="list-disc list-inside text-sm text-gray-700 mt-1">
                {takeaways.map((t: string, i: number) => <li key={i}>{t}</li>)}
              </ul>
            </div>
          )}
          {source.relevance && <p className="text-sm text-gray-600 italic">{source.relevance}</p>}
          {source.category && (
            <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">
              {source.category}
            </span>
          )}
        </section>
      ) : source.analysis_status === 'pending' ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
          Analyzing article...
        </div>
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 flex items-center justify-between">
          <span>Analysis failed. The source was saved but could not be analyzed.</span>
          <button
            onClick={() => retryAnalysis.mutate(source.id)}
            disabled={retryAnalysis.isPending}
            className="px-3 py-1 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 disabled:opacity-50"
          >
            {retryAnalysis.isPending ? 'Retrying...' : 'Retry'}
          </button>
        </div>
      )}

      {/* Angle Generation */}
      {source.analysis_status === 'complete' && (
        <section className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Content Angles</h2>
          {angles.length === 0 ? (
            <button
              onClick={() => handleGenerateAngles(1)}
              disabled={generateAngles.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {generateAngles.isPending ? 'Generating...' : 'Generate Best Angle'}
            </button>
          ) : (
            <div className="space-y-2">
              {angles.map((angle, i) => (
                <div
                  key={i}
                  onClick={() => setSelectedAngle(angle.title)}
                  className={`p-3 rounded-lg border cursor-pointer ${selectedAngle === angle.title ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <p className="text-sm font-medium text-gray-900">{angle.title}</p>
                  <p className="text-xs text-gray-600">{angle.description}</p>
                </div>
              ))}
              {angles.length < 3 && (
                <button
                  onClick={() => handleGenerateAngles(3)}
                  disabled={generateAngles.isPending}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Show alternatives
                </button>
              )}
            </div>
          )}

          {selectedAngle && !draft && (
            <button
              onClick={handleGenerateDraft}
              disabled={generateDraft.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {generateDraft.isPending ? 'Generating draft...' : 'Generate Draft'}
            </button>
          )}
        </section>
      )}

      {/* Draft Section */}
      {draft && (
        <section className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Draft</h2>
          <textarea
            value={draftContent}
            onChange={(e) => setDraftContent(e.target.value)}
            rows={4}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSaveDraft}
              disabled={updateDraft.isPending}
              className="px-4 py-2 bg-gray-600 text-white rounded-md text-sm hover:bg-gray-700 disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={handleCopy}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
            >
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </button>
          </div>

          {/* Regeneration */}
          <div className="border-t pt-4 space-y-2">
            <input
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Feedback: too generic, more technical, shorter..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <button
              onClick={handleRegenerate}
              disabled={regenerateDraft.isPending}
              className="px-4 py-2 bg-yellow-600 text-white rounded-md text-sm hover:bg-yellow-700 disabled:opacity-50"
            >
              {regenerateDraft.isPending ? 'Regenerating...' : 'Regenerate'}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

export default SourceDetailPage;
