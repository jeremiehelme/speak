import type { Source } from '../hooks/use-sources';

interface SourceCardProps {
  source: Source;
}

function SourceCard({ source }: SourceCardProps) {
  const date = new Date(source.created_at * 1000).toLocaleDateString();

  return (
    <a
      href={`/source/${source.id}`}
      className="block bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900 truncate">
            {source.title || source.url || 'Untitled'}
          </h3>
          {source.analysis_summary && (
            <p className="text-xs text-gray-600 mt-1 line-clamp-2">{source.analysis_summary}</p>
          )}
        </div>
        <div className="ml-4 flex-shrink-0 text-right">
          {source.category && (
            <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
              {source.category}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
        <span>{date}</span>
        <span className={`px-1.5 py-0.5 rounded text-xs ${
          source.analysis_status === 'complete' ? 'bg-green-100 text-green-700' :
          source.analysis_status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
          'bg-red-100 text-red-700'
        }`}>
          {source.analysis_status}
        </span>
      </div>
    </a>
  );
}

export default SourceCard;
