import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DraftEditor from '../components/DraftEditor';
import {
  useSource,
  useGenerateAngles,
  useDeleteSource,
  useRetryAnalysis,
  useSaveAnswers,
  useUpdateSource,
  type Angle,
} from '../hooks/use-sources';
import {
  useGenerateDraft,
  useUpdateDraft,
  useRegenerateDraft,
  usePublishDraft,
  usePublishDraftToThreads,
  useScheduleDraft,
  useAdaptDraft,
  useTranslateDraft,
  type Draft,
} from '../hooks/use-drafts';
import { useSettings } from '../hooks/use-settings';

function SourceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: source, isLoading, error } = useSource(id);
  const generateAngles = useGenerateAngles();
  const generateDraft = useGenerateDraft();
  const updateDraft = useUpdateDraft();
  const regenerateDraft = useRegenerateDraft();
  const publishDraft = usePublishDraft();
  const publishDraftToThreads = usePublishDraftToThreads();
  const adaptDraft = useAdaptDraft();
  const scheduleDraft = useScheduleDraft();
  const translateDraft = useTranslateDraft();
  const deleteSource = useDeleteSource();
  const retryAnalysis = useRetryAnalysis();
  const saveAnswers = useSaveAnswers();
  const updateSource = useUpdateSource();
  const { data: settings } = useSettings();
  const maxCharLimit = settings?.maxCharLimit ?? 280;
  const [editingTitle, setEditingTitle] = useState(false);

  const [angles, setAngles] = useState<Angle[]>([]);
  const [selectedAngle, setSelectedAngle] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftContent, setDraftContent] = useState('');
  const [feedback, setFeedback] = useState('');
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [answers, setAnswers] = useState<string[]>([]);
  const answersInitialized = useRef(false);

  useEffect(() => {
    if (source?.drafts && source.drafts.length > 0 && !draft) {
      const mostRecent = source.drafts[0] as Draft;
      setDraft(mostRecent);
      setDraftContent(mostRecent.content || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source?.drafts]);

  useEffect(() => {
    if (source?.angles && angles.length === 0) {
      try {
        const stored = JSON.parse(source.angles) as Angle[];
        if (stored.length > 0) {
          setAngles(stored);
          if (stored.length === 1) {
            setSelectedAngle(stored[0]!.title);
          }
        }
      } catch {
        // ignore parse errors
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source?.angles]);

  useEffect(() => {
    if (source?.targeted_questions && !answersInitialized.current) {
      const questions = JSON.parse(source.targeted_questions) as string[];
      const stored = source.targeted_answers
        ? (JSON.parse(source.targeted_answers) as string[])
        : [];
      setAnswers(questions.map((_, i) => stored[i] || ''));
      answersInitialized.current = true;
    }
  }, [source?.targeted_questions, source?.targeted_answers]);

  if (isLoading) return <div className="text-gray-500">Loading source...</div>;
  if (error) return <div className="text-red-600">Error: {(error as Error).message}</div>;
  if (!source) return <div className="text-gray-500">Source not found</div>;

  let themes: string[] = [];
  try {
    themes = source.themes ? (JSON.parse(source.themes) as string[]) : [];
  } catch {
    /* ignore */
  }
  let takeaways: string[] = [];
  try {
    takeaways = source.takeaways ? (JSON.parse(source.takeaways) as string[]) : [];
  } catch {
    /* ignore */
  }
  let targetedQuestions: string[] = [];
  try {
    targetedQuestions = source.targeted_questions
      ? (JSON.parse(source.targeted_questions) as string[])
      : [];
  } catch {
    /* ignore */
  }

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
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCopy = async () => {
    if (draft) {
      await updateDraft.mutateAsync({ draftId: draft.id, content: draftContent });
    }
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

  const handleAnswerBlur = (index: number, value: string) => {
    const updated = [...answers];
    updated[index] = value;
    setAnswers(updated);
    saveAnswers.mutate({ sourceId: source.id, answers: updated });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        {editingTitle ? (
          <input
            autoFocus
            defaultValue={source.title || ''}
            onBlur={(e) => {
              const newTitle = e.target.value.trim();
              if (newTitle && newTitle !== source.title) {
                updateSource.mutate({ sourceId: source.id, title: newTitle });
              }
              setEditingTitle(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              if (e.key === 'Escape') setEditingTitle(false);
            }}
            className="text-2xl font-bold text-gray-900 border-b-2 border-blue-500 outline-none bg-transparent w-full"
          />
        ) : (
          <h1
            onClick={() => setEditingTitle(true)}
            className="text-2xl font-bold text-gray-900 cursor-pointer hover:text-blue-600"
            title="Click to edit title"
          >
            {source.title || 'Untitled Source'}
          </h1>
        )}
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
            <button
              onClick={handleDelete}
              className="px-3 py-1 bg-red-600 text-white rounded-md text-sm"
            >
              Confirm
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-3 py-1 bg-gray-200 rounded-md text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {source.url && (
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 text-sm hover:underline"
        >
          {source.url}
        </a>
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
                  <span
                    key={t}
                    className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
          {takeaways.length > 0 && (
            <div>
              <span className="text-xs font-medium text-gray-500">Key Takeaways:</span>
              <ul className="list-disc list-inside text-sm text-gray-700 mt-1">
                {takeaways.map((t: string, i: number) => (
                  <li key={i}>{t}</li>
                ))}
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
            source.analysis_status === 'complete' && !source.angles ? (
              <div className="text-sm text-blue-600">Generating angle...</div>
            ) : (
              <button
                onClick={() => handleGenerateAngles(1)}
                disabled={generateAngles.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {generateAngles.isPending ? 'Generating...' : 'Generate Best Angle'}
              </button>
            )
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
        </section>
      )}

      {/* Your Perspective Section */}
      {source.analysis_status === 'complete' && (
        <section className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Your Perspective</h2>
          <p className="text-xs text-gray-500">
            Share your take and answer questions to make your draft more authentic. All fields are
            optional.
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                What's your take on this article?
              </label>
              <textarea
                defaultValue={source.opinion || ''}
                onBlur={(e) => {
                  const value = e.target.value.trim();
                  if (value !== (source.opinion || '')) {
                    updateSource.mutate({ sourceId: source.id, opinion: value });
                  }
                }}
                rows={2}
                placeholder="Your opinion on this article..."
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            {targetedQuestions.map((question, i) => (
              <div key={i}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{question}</label>
                <input
                  type="text"
                  defaultValue={answers[i] || ''}
                  onBlur={(e) => handleAnswerBlur(i, e.target.value)}
                  placeholder="Your answer..."
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Generate Draft Button */}
      {selectedAngle && !draft && (
        <button
          onClick={handleGenerateDraft}
          disabled={generateDraft.isPending}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {generateDraft.isPending ? 'Generating draft...' : 'Generate Draft'}
        </button>
      )}

      {/* Draft Section */}
      {draft && (
        <section className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Draft</h2>
          <DraftEditor content={draftContent} onUpdate={setDraftContent} />
          <div className="flex items-center justify-between">
            <span
              className={`text-xs ${draftContent.length > maxCharLimit ? 'text-red-600 font-semibold' : 'text-gray-400'}`}
            >
              {draftContent.length}/{maxCharLimit}
            </span>
            <div className="flex items-center gap-1">
              <select
                onChange={async (e) => {
                  const lang = e.target.value;
                  if (!lang || !draft) return;
                  e.target.value = '';
                  try {
                    const result = await translateDraft.mutateAsync({
                      draftId: draft.id,
                      language: lang,
                    });
                    setDraftContent(result.translated);
                  } catch {
                    // error surfaced by mutation state
                  }
                }}
                disabled={translateDraft.isPending || !draft}
                className="text-xs border border-gray-300 rounded px-2 py-1 text-gray-600"
                defaultValue=""
              >
                <option value="" disabled>
                  {translateDraft.isPending ? 'Translating...' : 'Translate to...'}
                </option>
                <option value="English">English</option>
                <option value="French">French</option>
                <option value="Spanish">Spanish</option>
                <option value="German">German</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleSaveDraft}
              disabled={updateDraft.isPending}
              className="px-4 py-2 bg-gray-600 text-white rounded-md text-sm hover:bg-gray-700 disabled:opacity-50"
            >
              {saved ? 'Saved!' : 'Save'}
            </button>
            <button
              onClick={handleCopy}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
            >
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </button>
            {draft?.published_status === 'published' && draft?.published_url ? (
              <a
                href={draft.published_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 inline-flex items-center gap-1"
              >
                Published — View on {draft.published_url.includes('threads.net') ? 'Threads' : 'X'}
              </a>
            ) : settings?.hasXCredentials ? (
              <button
                onClick={async () => {
                  if (!draft) return;
                  try {
                    await updateDraft.mutateAsync({ draftId: draft.id, content: draftContent });
                    const result = await publishDraft.mutateAsync(draft.id);
                    setDraft(result);
                  } catch {
                    // error is surfaced by mutation state
                  }
                }}
                disabled={
                  publishDraft.isPending || !draft || draftContent.length > 280 || !draftContent
                }
                className="px-4 py-2 bg-black text-white rounded-md text-sm hover:bg-gray-800 disabled:opacity-50"
              >
                {publishDraft.isPending ? 'Publishing...' : 'Publish to X'}
              </button>
            ) : (
              <span
                className="px-4 py-2 bg-gray-200 text-gray-500 rounded-md text-sm cursor-not-allowed"
                title="Connect X account in Settings"
              >
                Publish to X
              </span>
            )}

            {draft?.published_status !== 'published' && settings?.hasThreadsCredentials && (
              <button
                onClick={async () => {
                  if (!draft) return;
                  try {
                    await updateDraft.mutateAsync({ draftId: draft.id, content: draftContent });
                    const result = await publishDraftToThreads.mutateAsync(draft.id);
                    setDraft(result);
                  } catch {
                    // error is surfaced by mutation state
                  }
                }}
                disabled={
                  publishDraftToThreads.isPending ||
                  !draft ||
                  draftContent.length > 500 ||
                  !draftContent
                }
                className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm hover:bg-gray-700 disabled:opacity-50"
              >
                {publishDraftToThreads.isPending ? 'Publishing...' : 'Publish to Threads'}
              </button>
            )}

            {draft?.published_status !== 'published' && draft?.published_status !== 'queued' && (
              <button
                onClick={async () => {
                  if (!draft) return;
                  try {
                    await updateDraft.mutateAsync({ draftId: draft.id, content: draftContent });
                    const result = await scheduleDraft.mutateAsync(draft.id);
                    setDraft(result);
                  } catch {
                    // error surfaced by mutation state
                  }
                }}
                disabled={
                  scheduleDraft.isPending ||
                  !draft ||
                  draftContent.length > maxCharLimit ||
                  !draftContent
                }
                className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm hover:bg-purple-700 disabled:opacity-50"
              >
                {scheduleDraft.isPending ? 'Scheduling...' : 'Schedule'}
              </button>
            )}
            {draft && draftContent && (
              <select
                onChange={async (e) => {
                  const platform = e.target.value;
                  if (!platform || !draft) return;
                  e.target.value = '';
                  try {
                    await updateDraft.mutateAsync({ draftId: draft.id, content: draftContent });
                    const adapted = await adaptDraft.mutateAsync({
                      draftId: draft.id,
                      targetPlatform: platform,
                    });
                    setDraft(adapted);
                    setDraftContent(adapted.content || '');
                  } catch {
                    // error surfaced by mutation state
                  }
                }}
                disabled={adaptDraft.isPending || !draft}
                className="px-2 py-2 border border-gray-300 rounded-md text-sm text-gray-600"
                defaultValue=""
              >
                <option value="" disabled>
                  {adaptDraft.isPending ? 'Adapting...' : 'Adapt to...'}
                </option>
                <option value="x">X (280 chars)</option>
                <option value="threads">Threads (500 chars)</option>
              </select>
            )}
          </div>
          {draft?.published_status === 'queued' && draft?.scheduled_at && (
            <p className="text-sm text-purple-600">
              Scheduled for {new Date(draft.scheduled_at * 1000).toLocaleString()}
            </p>
          )}
          {publishDraftToThreads.isError && (
            <p className="text-sm text-red-600">
              {publishDraftToThreads.error instanceof Error
                ? publishDraftToThreads.error.message
                : 'Failed to publish to Threads'}
            </p>
          )}
          {publishDraft.isError && (
            <p className="text-sm text-red-600">
              {publishDraft.error instanceof Error
                ? publishDraft.error.message
                : 'Failed to publish'}
            </p>
          )}
          {scheduleDraft.isError && (
            <p className="text-sm text-red-600">
              {scheduleDraft.error instanceof Error
                ? scheduleDraft.error.message
                : 'Failed to schedule'}
            </p>
          )}

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
