import { useQueue, useUnscheduleDraft, useRescheduleDraft, type Draft } from '../hooks/use-drafts';

function QueuePage() {
  const { data: drafts, isLoading } = useQueue();
  const unschedule = useUnscheduleDraft();
  const reschedule = useRescheduleDraft();

  if (isLoading) return <div className="text-gray-500">Loading queue...</div>;

  const queued = (drafts ?? []).filter((d) => d.published_status === 'queued');
  const published = (drafts ?? []).filter((d) => d.published_status === 'published');
  const failed = (drafts ?? []).filter((d) => d.published_status === 'failed');

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Publishing Queue</h1>

      {/* Queued */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Upcoming ({queued.length})</h2>
        {queued.length === 0 ? (
          <p className="text-sm text-gray-400">
            No drafts scheduled. Queue one from a source page.
          </p>
        ) : (
          <div className="space-y-3">
            {queued.map((draft) => (
              <QueueItem
                key={draft.id}
                draft={draft}
                onRemove={() => unschedule.mutate(draft.id)}
                onReschedule={(newTime) =>
                  reschedule.mutate({ draftId: draft.id, scheduledAt: newTime })
                }
              />
            ))}
          </div>
        )}
      </section>

      {/* Failed */}
      {failed.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-red-700 mb-3">Failed ({failed.length})</h2>
          <div className="space-y-3">
            {failed.map((draft) => (
              <div
                key={draft.id}
                className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start justify-between"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 truncate">{draft.content || '(empty)'}</p>
                  <p className="text-xs text-red-600 mt-1">{draft.feedback || 'Unknown error'}</p>
                </div>
                <button
                  onClick={() => {
                    const nextSlot = Math.floor(Date.now() / 1000) + 300;
                    reschedule.mutate({ draftId: draft.id, scheduledAt: nextSlot });
                  }}
                  className="ml-3 px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                >
                  Retry
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Published */}
      {published.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-green-700 mb-3">
            Published ({published.length})
          </h2>
          <div className="space-y-3">
            {published.map((draft) => (
              <div
                key={draft.id}
                className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start justify-between"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 truncate">{draft.content || '(empty)'}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Published{' '}
                    {draft.published_at ? new Date(draft.published_at * 1000).toLocaleString() : ''}
                  </p>
                </div>
                {draft.published_url && (
                  <a
                    href={draft.published_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-3 px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                  >
                    View
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function QueueItem({
  draft,
  onRemove,
  onReschedule,
}: {
  draft: Draft;
  onRemove: () => void;
  onReschedule: (newTime: number) => void;
}) {
  const scheduledDate = draft.scheduled_at ? new Date(draft.scheduled_at * 1000) : null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-start justify-between">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900 truncate">{draft.content || '(empty)'}</p>
        {scheduledDate && (
          <p className="text-xs text-purple-600 mt-1">
            Scheduled: {scheduledDate.toLocaleString()}
          </p>
        )}
        <p className="text-xs text-gray-400 mt-0.5">{draft.content?.length ?? 0}/280 chars</p>
      </div>
      <div className="ml-3 flex gap-2">
        <input
          type="datetime-local"
          className="text-xs border border-gray-300 rounded px-2 py-1"
          defaultValue={scheduledDate ? scheduledDate.toISOString().slice(0, 16) : ''}
          onChange={(e) => {
            const date = new Date(e.target.value);
            if (!isNaN(date.getTime())) {
              onReschedule(Math.floor(date.getTime() / 1000));
            }
          }}
        />
        <button
          onClick={onRemove}
          className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

export default QueuePage;
