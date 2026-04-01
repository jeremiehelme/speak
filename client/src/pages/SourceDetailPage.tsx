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

/* ------------------------------------------------------------------ */
/* Small reusable Win2K primitives                                     */
/* ------------------------------------------------------------------ */

function WinPanel({ title, icon, children }: { title: string; icon?: string; children: React.ReactNode }) {
  return (
    <div className="win-window" style={{ marginBottom: 10 }}>
      <div className="win-titlebar">
        {icon && <span>{icon}</span>}
        <span>{title}</span>
      </div>
      <div style={{ padding: '8px 10px', background: '#d4d0c8' }}>{children}</div>
    </div>
  );
}

function WinLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontWeight: 'bold', fontSize: 11, marginBottom: 3 }}>{children}</div>
  );
}

/* ------------------------------------------------------------------ */

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

  if (isLoading) {
    return (
      <div className="win-info-box" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>⌛</span> Loading source...
      </div>
    );
  }
  if (error) {
    return (
      <div className="win-error-box">
        ❌ Error: {(error as Error).message}
      </div>
    );
  }
  if (!source) {
    return <div className="win-info-box">Source not found.</div>;
  }

  let themes: string[] = [];
  try {
    themes = source.themes ? (JSON.parse(source.themes) as string[]) : [];
  } catch { /* ignore */ }
  let takeaways: string[] = [];
  try {
    takeaways = source.takeaways ? (JSON.parse(source.takeaways) as string[]) : [];
  } catch { /* ignore */ }
  let targetedQuestions: string[] = [];
  try {
    targetedQuestions = source.targeted_questions
      ? (JSON.parse(source.targeted_questions) as string[])
      : [];
  } catch { /* ignore */ }

  const handleGenerateAngles = async (count: number) => {
    const result = await generateAngles.mutateAsync({ sourceId: source.id, count });
    setAngles(result);
    if (result.length === 1) setSelectedAngle(result[0]!.title);
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
    if (draft) await updateDraft.mutateAsync({ draftId: draft.id, content: draftContent });
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

  const charOverLimit = draftContent.length > maxCharLimit;

  return (
    <div style={{ fontFamily: '"Tahoma", "MS Sans Serif", Arial, sans-serif' }}>

      {/* ── Title bar row ── */}
      <div className="win-window" style={{ marginBottom: 10 }}>
        <div className="win-titlebar">
          <span>📄</span>
          <span style={{ flex: 1 }}>Source Detail</span>
        </div>
        <div style={{ padding: '8px 10px', background: '#d4d0c8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
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
              className="win-input"
              style={{ fontSize: 13, fontWeight: 'bold', flex: 1 }}
            />
          ) : (
            <span
              onClick={() => setEditingTitle(true)}
              title="Click to edit title"
              style={{ fontSize: 13, fontWeight: 'bold', cursor: 'pointer', flex: 1, textDecoration: 'underline dotted' }}
            >
              {source.title || 'Untitled Source'}
            </span>
          )}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="win-button win-btn-danger"
          >
            🗑️ Delete
          </button>
        </div>
      </div>

      {/* ── Delete confirm dialog ── */}
      {showDeleteConfirm && (
        <div className="win-window" style={{ marginBottom: 10, maxWidth: 360 }}>
          <div className="win-titlebar" style={{ background: 'linear-gradient(to right, #800000, #c04040)' }}>
            <span>⚠️</span>
            <span>Confirm Delete</span>
          </div>
          <div style={{ padding: '12px', background: '#d4d0c8' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
              <span style={{ fontSize: 28 }}>❓</span>
              <p style={{ margin: 0, fontSize: 11 }}>
                Delete this source and all its drafts? This action cannot be undone.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button onClick={handleDelete} className="win-button win-btn-primary win-btn-danger">
                Yes
              </button>
              <button onClick={() => setShowDeleteConfirm(false)} className="win-button win-btn-primary">
                No
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Source URL ── */}
      {source.url && (
        <div style={{ marginBottom: 8, fontSize: 11 }}>
          <span style={{ fontWeight: 'bold' }}>Address: </span>
          <a href={source.url} target="_blank" rel="noopener noreferrer">
            {source.url}
          </a>
        </div>
      )}

      {/* ── Analysis Section ── */}
      {source.analysis_status === 'complete' ? (
        <WinPanel title="Analysis" icon="🔍">
          <p style={{ margin: '0 0 8px', fontSize: 11 }}>{source.analysis_summary}</p>

          {themes.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <WinLabel>Themes:</WinLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {themes.map((t: string) => (
                  <span key={t} className="win-tag">{t}</span>
                ))}
              </div>
            </div>
          )}

          {takeaways.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <WinLabel>Key Takeaways:</WinLabel>
              <ul style={{ margin: '2px 0 0 18px', padding: 0, fontSize: 11 }}>
                {takeaways.map((t: string, i: number) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          )}

          {source.relevance && (
            <p style={{ margin: '6px 0 0', fontSize: 11, fontStyle: 'italic' }}>{source.relevance}</p>
          )}
          {source.category && (
            <div style={{ marginTop: 6 }}>
              <span className="win-tag">📁 {source.category}</span>
            </div>
          )}
        </WinPanel>
      ) : source.analysis_status === 'pending' ? (
        <div className="win-info-box" style={{ marginBottom: 10 }}>
          ⌛ Analyzing article... please wait.
        </div>
      ) : (
        <div className="win-error-box" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span>❌ Analysis failed. The source was saved but could not be analyzed.</span>
          <button
            onClick={() => retryAnalysis.mutate(source.id)}
            disabled={retryAnalysis.isPending}
            className="win-button win-btn-danger"
          >
            {retryAnalysis.isPending ? '⌛ Retrying...' : '🔄 Retry'}
          </button>
        </div>
      )}

      {/* ── Content Angles ── */}
      {source.analysis_status === 'complete' && (
        <WinPanel title="Content Angles" icon="📐">
          {angles.length === 0 ? (
            source.analysis_status === 'complete' && !source.angles ? (
              <div style={{ color: '#000080', fontSize: 11 }}>⌛ Generating angle...</div>
            ) : (
              <button
                onClick={() => handleGenerateAngles(1)}
                disabled={generateAngles.isPending}
                className="win-button win-btn-primary"
              >
                {generateAngles.isPending ? '⌛ Generating...' : '✨ Generate Best Angle'}
              </button>
            )
          ) : (
            <div>
              {/* Win2K style listbox */}
              <div className="win-sunken" style={{ marginBottom: 6 }}>
                {angles.map((angle, i) => (
                  <div
                    key={i}
                    onClick={() => setSelectedAngle(angle.title)}
                    className={`win-listitem ${selectedAngle === angle.title ? 'selected' : ''}`}
                  >
                    <div style={{ fontWeight: 'bold', fontSize: 11 }}>
                      {selectedAngle === angle.title ? '▶ ' : '  '}{angle.title}
                    </div>
                    <div style={{ fontSize: 10, paddingLeft: 14, color: selectedAngle === angle.title ? '#c0d8f0' : '#444' }}>
                      {angle.description}
                    </div>
                  </div>
                ))}
              </div>
              {angles.length < 3 && (
                <button
                  onClick={() => handleGenerateAngles(3)}
                  disabled={generateAngles.isPending}
                  className="win-button"
                >
                  Show alternatives...
                </button>
              )}
            </div>
          )}
        </WinPanel>
      )}

      {/* ── Your Perspective ── */}
      {source.analysis_status === 'complete' && (
        <WinPanel title="Your Perspective" icon="💬">
          <p style={{ margin: '0 0 8px', fontSize: 10, color: '#444' }}>
            Share your take and answer questions to make your draft more authentic. All fields are optional.
          </p>
          <div>
            <WinLabel>What&apos;s your take on this article?</WinLabel>
            <textarea
              defaultValue={source.opinion || ''}
              onBlur={(e) => {
                const value = e.target.value.trim();
                if (value !== (source.opinion || '')) {
                  updateSource.mutate({ sourceId: source.id, opinion: value });
                }
              }}
              rows={3}
              placeholder="Your opinion on this article..."
              className="win-textarea"
              style={{ marginBottom: 8 }}
            />
          </div>
          {targetedQuestions.map((question, i) => (
            <div key={i} style={{ marginBottom: 6 }}>
              <WinLabel>{question}</WinLabel>
              <input
                type="text"
                defaultValue={answers[i] || ''}
                onBlur={(e) => handleAnswerBlur(i, e.target.value)}
                placeholder="Your answer..."
                className="win-input"
              />
            </div>
          ))}
        </WinPanel>
      )}

      {/* ── Generate Draft Button ── */}
      {selectedAngle && !draft && (
        <div style={{ marginBottom: 10 }}>
          <button
            onClick={handleGenerateDraft}
            disabled={generateDraft.isPending}
            className="win-button win-btn-primary"
          >
            {generateDraft.isPending ? '⌛ Generating draft...' : '📝 Generate Draft'}
          </button>
        </div>
      )}

      {/* ── Draft Section ── */}
      {draft && (
        <WinPanel title="Draft" icon="📝">
          <DraftEditor content={draftContent} onUpdate={setDraftContent} />

          {/* Char count */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, marginBottom: 8 }}>
            <span style={{ fontSize: 10, color: charOverLimit ? '#800000' : '#444', fontWeight: charOverLimit ? 'bold' : 'normal' }}>
              {charOverLimit ? '⚠️ ' : ''}{draftContent.length}/{maxCharLimit} characters
            </span>
            <select
              onChange={async (e) => {
                const lang = e.target.value;
                if (!lang || !draft) return;
                e.target.value = '';
                try {
                  const result = await translateDraft.mutateAsync({ draftId: draft.id, language: lang });
                  setDraftContent(result.translated);
                } catch { /* surfaced by mutation */ }
              }}
              disabled={translateDraft.isPending || !draft}
              className="win-select"
              style={{ width: 'auto', fontSize: 10 }}
              defaultValue=""
            >
              <option value="" disabled>
                {translateDraft.isPending ? '⌛ Translating...' : '🌐 Translate to...'}
              </option>
              <option value="English">English</option>
              <option value="French">French</option>
              <option value="Spanish">Spanish</option>
              <option value="German">German</option>
            </select>
          </div>

          <div className="win-divider" />

          {/* Action buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
            <button onClick={handleSaveDraft} disabled={updateDraft.isPending} className="win-button">
              {saved ? '✔ Saved!' : '💾 Save'}
            </button>
            <button onClick={handleCopy} className="win-button">
              {copied ? '✔ Copied!' : '📋 Copy'}
            </button>

            {draft?.published_status === 'published' && draft?.published_url ? (
              <a
                href={draft.published_url}
                target="_blank"
                rel="noopener noreferrer"
                className="win-button"
                style={{ textDecoration: 'none', display: 'inline-block' }}
              >
                ✔ Published — View on {draft.published_url.includes('threads.net') ? 'Threads' : 'X'}
              </a>
            ) : settings?.hasXCredentials ? (
              <button
                onClick={async () => {
                  if (!draft) return;
                  try {
                    await updateDraft.mutateAsync({ draftId: draft.id, content: draftContent });
                    const result = await publishDraft.mutateAsync(draft.id);
                    setDraft(result);
                  } catch { /* surfaced by mutation */ }
                }}
                disabled={publishDraft.isPending || !draft || draftContent.length > 280 || !draftContent}
                className="win-button"
              >
                {publishDraft.isPending ? '⌛ Publishing...' : '🐦 Publish to X'}
              </button>
            ) : (
              <button className="win-button" disabled title="Connect X account in Settings">
                🐦 Publish to X
              </button>
            )}

            {draft?.published_status !== 'published' && settings?.hasThreadsCredentials && (
              <button
                onClick={async () => {
                  if (!draft) return;
                  try {
                    await updateDraft.mutateAsync({ draftId: draft.id, content: draftContent });
                    const result = await publishDraftToThreads.mutateAsync(draft.id);
                    setDraft(result);
                  } catch { /* surfaced by mutation */ }
                }}
                disabled={publishDraftToThreads.isPending || !draft || draftContent.length > 500 || !draftContent}
                className="win-button"
              >
                {publishDraftToThreads.isPending ? '⌛ Publishing...' : '🧵 Publish to Threads'}
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
                  } catch { /* surfaced by mutation */ }
                }}
                disabled={scheduleDraft.isPending || !draft || draftContent.length > maxCharLimit || !draftContent}
                className="win-button"
              >
                {scheduleDraft.isPending ? '⌛ Scheduling...' : '🕐 Schedule'}
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
                    const adapted = await adaptDraft.mutateAsync({ draftId: draft.id, targetPlatform: platform });
                    setDraft(adapted);
                    setDraftContent(adapted.content || '');
                  } catch { /* surfaced by mutation */ }
                }}
                disabled={adaptDraft.isPending || !draft}
                className="win-select"
                style={{ width: 'auto', fontSize: 11 }}
                defaultValue=""
              >
                <option value="" disabled>
                  {adaptDraft.isPending ? '⌛ Adapting...' : '🔧 Adapt to...'}
                </option>
                <option value="x">X (280 chars)</option>
                <option value="threads">Threads (500 chars)</option>
              </select>
            )}
          </div>

          {draft?.published_status === 'queued' && draft?.scheduled_at && (
            <p style={{ fontSize: 11, color: '#800080', marginTop: 6 }}>
              🕐 Scheduled for {new Date(draft.scheduled_at * 1000).toLocaleString()}
            </p>
          )}

          {/* Errors */}
          {publishDraftToThreads.isError && (
            <p className="win-error-box" style={{ marginTop: 6 }}>
              {publishDraftToThreads.error instanceof Error ? publishDraftToThreads.error.message : 'Failed to publish to Threads'}
            </p>
          )}
          {publishDraft.isError && (
            <p className="win-error-box" style={{ marginTop: 6 }}>
              {publishDraft.error instanceof Error ? publishDraft.error.message : 'Failed to publish'}
            </p>
          )}
          {scheduleDraft.isError && (
            <p className="win-error-box" style={{ marginTop: 6 }}>
              {scheduleDraft.error instanceof Error ? scheduleDraft.error.message : 'Failed to schedule'}
            </p>
          )}

          {/* Regeneration */}
          <div className="win-divider" style={{ marginTop: 10 }} />
          <div style={{ marginTop: 6 }}>
            <WinLabel>Regeneration feedback:</WinLabel>
            <input
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="e.g. too generic, more technical, shorter..."
              className="win-input"
              style={{ marginBottom: 6 }}
            />
            <button
              onClick={handleRegenerate}
              disabled={regenerateDraft.isPending}
              className="win-button win-btn-primary"
            >
              {regenerateDraft.isPending ? '⌛ Regenerating...' : '🔄 Regenerate'}
            </button>
          </div>
        </WinPanel>
      )}
    </div>
  );
}

export default SourceDetailPage;
