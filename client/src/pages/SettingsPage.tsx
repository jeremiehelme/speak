import { useState } from 'react';
import { useSettings, useUpdateSettings, useValidateApiKey, useBookmarklet } from '../hooks/use-settings';

function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const { data: bookmarkletData } = useBookmarklet();
  const updateSettings = useUpdateSettings();
  const validateKey = useValidateApiKey();
  const [apiKey, setApiKey] = useState('');
  const [analysisModel, setAnalysisModel] = useState('');
  const [draftingModel, setDraftingModel] = useState('');
  const [validationResult, setValidationResult] = useState<{ valid: boolean; message?: string } | null>(null);

  if (isLoading) return <div className="text-gray-500">Loading settings...</div>;

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) return;
    await updateSettings.mutateAsync({ anthropic_api_key: apiKey });
    setApiKey('');
  };

  const handleValidate = async () => {
    const keyToValidate = apiKey.trim() || undefined;
    const result = await validateKey.mutateAsync(keyToValidate ?? '');
    setValidationResult(result);
  };

  const handleSaveModels = async () => {
    const updates: Record<string, string> = {};
    if (analysisModel) updates['analysis_model'] = analysisModel;
    if (draftingModel) updates['drafting_model'] = draftingModel;
    if (Object.keys(updates).length > 0) {
      await updateSettings.mutateAsync(updates);
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {/* API Key Section */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Anthropic API Key</h2>
        <p className="text-sm text-gray-600 mb-4">
          {settings?.hasApiKey
            ? 'API key is configured. Enter a new key to replace it.'
            : 'No API key configured. Enter your Anthropic API key to enable AI features.'}
        </p>
        <div className="flex gap-2">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-ant-..."
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            onClick={handleSaveApiKey}
            disabled={!apiKey.trim() || updateSettings.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            Save
          </button>
          <button
            onClick={handleValidate}
            disabled={validateKey.isPending}
            className="px-4 py-2 bg-gray-600 text-white rounded-md text-sm hover:bg-gray-700 disabled:opacity-50"
          >
            {validateKey.isPending ? 'Validating...' : 'Validate'}
          </button>
        </div>
        {validationResult && (
          <p className={`mt-2 text-sm ${validationResult.valid ? 'text-green-600' : 'text-red-600'}`}>
            {validationResult.valid ? 'API key is valid!' : validationResult.message || 'API key is invalid'}
          </p>
        )}
      </section>

      {/* LLM Provider Settings */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">LLM Provider Settings</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Analysis Model</label>
            <select
              value={analysisModel || settings?.analysis_model || 'claude-haiku-4-5-20251001'}
              onChange={(e) => setAnalysisModel(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="claude-haiku-4-5-20251001">Claude Haiku (fast, cheaper)</option>
              <option value="claude-sonnet-4-6">Claude Sonnet (balanced)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Drafting Model</label>
            <select
              value={draftingModel || settings?.drafting_model || 'claude-sonnet-4-6'}
              onChange={(e) => setDraftingModel(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="claude-sonnet-4-6">Claude Sonnet (balanced)</option>
              <option value="claude-haiku-4-5-20251001">Claude Haiku (fast, cheaper)</option>
            </select>
          </div>
          <button
            onClick={handleSaveModels}
            disabled={updateSettings.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            Save Model Settings
          </button>
        </div>
      </section>
      {/* Bookmarklet Section */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Bookmarklet</h2>
        <p className="text-sm text-gray-600 mb-4">
          Drag this link to your bookmarks bar to capture sources from any page:
        </p>
        {bookmarkletData?.code ? (
          <a
            href={bookmarkletData.code}
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 no-underline"
            onClick={(e) => e.preventDefault()}
            draggable
          >
            Speak Capture
          </a>
        ) : (
          <p className="text-sm text-gray-400">Loading bookmarklet...</p>
        )}
        <p className="text-xs text-gray-500 mt-2">
          Drag the button above to your browser's bookmarks bar. Click it on any page to capture it as a source.
        </p>
      </section>
    </div>
  );
}

export default SettingsPage;
