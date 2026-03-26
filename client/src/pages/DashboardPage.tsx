import { useState } from 'react';
import { useSources } from '../hooks/use-sources';
import SourceCard from '../components/SourceCard';

function DashboardPage() {
  const [search, setSearch] = useState('');
  const { data: sources, isLoading, error } = useSources(search || undefined);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <a
          href="/capture"
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
        >
          Capture Source
        </a>
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search sources by title, URL, or content..."
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
      />

      {isLoading && <p className="text-gray-500">Loading sources...</p>}
      {error && <p className="text-red-600">Error: {(error as Error).message}</p>}

      {sources && sources.length === 0 && (
        <div className="text-center py-12">
          {search ? (
            <p className="text-gray-600">
              No sources found for "<span className="font-medium">{search}</span>"
            </p>
          ) : (
            <div>
              <p className="text-gray-600">No sources yet. Capture your first source to get started.</p>
              <a
                href="/capture"
                className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
              >
                Capture Your First Source
              </a>
            </div>
          )}
        </div>
      )}

      {sources && sources.length > 0 && (
        <div className="space-y-3">
          {sources.map((source) => (
            <SourceCard key={source.id} source={source} />
          ))}
        </div>
      )}
    </div>
  );
}

export default DashboardPage;
