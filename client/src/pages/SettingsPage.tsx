import { useState } from 'react';
import {
  useSettings,
  useUpdateSettings,
  useValidateApiKey,
  useBookmarklet,
  useSaveXCredentials,
  useValidateXConnection,
  useSchedule,
  useSaveSchedule,
  type ScheduleSlot,
} from '../hooks/use-settings';

function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const { data: bookmarkletData } = useBookmarklet();
  const updateSettings = useUpdateSettings();
  const validateKey = useValidateApiKey();
  const saveXCreds = useSaveXCredentials();
  const validateX = useValidateXConnection();
  const { data: scheduleData } = useSchedule();
  const saveSchedule = useSaveSchedule();
  const [scheduleSlots, setScheduleSlots] = useState<ScheduleSlot[] | null>(null);
  const [scheduleSaved, setScheduleSaved] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [analysisModel, setAnalysisModel] = useState('');
  const [draftingModel, setDraftingModel] = useState('');
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    message?: string;
  } | null>(null);
  const [xApiKey, setXApiKey] = useState('');
  const [xApiSecret, setXApiSecret] = useState('');
  const [xAccessToken, setXAccessToken] = useState('');
  const [xAccessTokenSecret, setXAccessTokenSecret] = useState('');
  const [xValidationResult, setXValidationResult] = useState<{
    valid: boolean;
    message?: string;
  } | null>(null);

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

  const xCredsComplete =
    xApiKey.trim() && xApiSecret.trim() && xAccessToken.trim() && xAccessTokenSecret.trim();

  const handleSaveXCredentials = async () => {
    if (!xCredsComplete) return;
    await saveXCreds.mutateAsync({
      apiKey: xApiKey.trim(),
      apiSecret: xApiSecret.trim(),
      accessToken: xAccessToken.trim(),
      accessTokenSecret: xAccessTokenSecret.trim(),
    });
    setXApiKey('');
    setXApiSecret('');
    setXAccessToken('');
    setXAccessTokenSecret('');
  };

  const handleValidateX = async () => {
    const creds = xCredsComplete
      ? {
          apiKey: xApiKey.trim(),
          apiSecret: xApiSecret.trim(),
          accessToken: xAccessToken.trim(),
          accessTokenSecret: xAccessTokenSecret.trim(),
        }
      : undefined;
    const result = await validateX.mutateAsync(creds);
    setXValidationResult(result);
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
          <p
            className={`mt-2 text-sm ${validationResult.valid ? 'text-green-600' : 'text-red-600'}`}
          >
            {validationResult.valid
              ? 'API key is valid!'
              : validationResult.message || 'API key is invalid'}
          </p>
        )}
      </section>

      {/* X (Twitter) API Credentials */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">X (Twitter) API Credentials</h2>
        <p className="text-sm text-gray-600 mb-4">
          {settings?.hasXCredentials
            ? 'X credentials are configured. Enter new credentials to replace them.'
            : 'Connect your X account to publish posts directly from Speak.'}
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">API Key</label>
            <input
              type="password"
              value={xApiKey}
              onChange={(e) => setXApiKey(e.target.value)}
              placeholder="API Key"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">API Secret</label>
            <input
              type="password"
              value={xApiSecret}
              onChange={(e) => setXApiSecret(e.target.value)}
              placeholder="API Secret"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Access Token</label>
            <input
              type="password"
              value={xAccessToken}
              onChange={(e) => setXAccessToken(e.target.value)}
              placeholder="Access Token"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Access Token Secret
            </label>
            <input
              type="password"
              value={xAccessTokenSecret}
              onChange={(e) => setXAccessTokenSecret(e.target.value)}
              placeholder="Access Token Secret"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSaveXCredentials}
              disabled={!xCredsComplete || saveXCreds.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {saveXCreds.isPending ? 'Saving...' : 'Save Credentials'}
            </button>
            <button
              onClick={handleValidateX}
              disabled={validateX.isPending}
              className="px-4 py-2 bg-gray-600 text-white rounded-md text-sm hover:bg-gray-700 disabled:opacity-50"
            >
              {validateX.isPending ? 'Validating...' : 'Validate Connection'}
            </button>
          </div>
        </div>
        {xValidationResult && (
          <p
            className={`mt-2 text-sm ${xValidationResult.valid ? 'text-green-600' : 'text-red-600'}`}
          >
            {xValidationResult.valid
              ? 'X connection is valid!'
              : xValidationResult.message || 'X credentials are invalid'}
          </p>
        )}
      </section>

      {/* Publishing Schedule */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Publishing Schedule</h2>
        <p className="text-sm text-gray-600 mb-4">
          Set your preferred publishing days and times. Suggested optimal times for X engagement are
          pre-filled as defaults.
        </p>
        <ScheduleEditor
          slots={scheduleSlots ?? scheduleData?.schedule.slots ?? []}
          defaults={scheduleData?.defaults ?? []}
          onChange={setScheduleSlots}
          onSave={async (slots) => {
            await saveSchedule.mutateAsync(slots);
            setScheduleSlots(null);
            setScheduleSaved(true);
            setTimeout(() => setScheduleSaved(false), 2000);
          }}
          isSaving={saveSchedule.isPending}
          saved={scheduleSaved}
        />
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
          Drag the button above to your browser's bookmarks bar. Click it on any page to capture it
          as a source.
        </p>
      </section>
    </div>
  );
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_LABELS: Record<string, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
};

function ScheduleEditor({
  slots,
  defaults,
  onChange,
  onSave,
  isSaving,
  saved,
}: {
  slots: ScheduleSlot[];
  defaults: ScheduleSlot[];
  onChange: (slots: ScheduleSlot[]) => void;
  onSave: (slots: ScheduleSlot[]) => void;
  isSaving: boolean;
  saved: boolean;
}) {
  const activeDays = new Set(slots.map((s) => s.day));
  const timeByDay = Object.fromEntries(slots.map((s) => [s.day, s.time]));

  const toggleDay = (day: string) => {
    if (activeDays.has(day)) {
      onChange(slots.filter((s) => s.day !== day));
    } else {
      const defaultSlot = defaults.find((d) => d.day === day);
      onChange([...slots, { day, time: defaultSlot?.time ?? '09:00' }]);
    }
  };

  const setTime = (day: string, time: string) => {
    onChange(slots.map((s) => (s.day === day ? { ...s, time } : s)));
  };

  const hasSlots = slots.length > 0;

  return (
    <div className="space-y-4">
      {slots.length === 0 && defaults.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <p className="text-sm text-blue-800">
            Suggested optimal times: Weekdays 9am and 12pm tend to get the most engagement on X.
          </p>
          <button
            onClick={() => onChange(defaults)}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Use suggested defaults
          </button>
        </div>
      )}
      <div className="flex gap-2 flex-wrap">
        {DAYS.map((day) => (
          <button
            key={day}
            onClick={() => toggleDay(day)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium ${
              activeDays.has(day)
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {DAY_LABELS[day]}
          </button>
        ))}
      </div>
      {hasSlots && (
        <div className="space-y-2">
          {DAYS.filter((day) => activeDays.has(day)).map((day) => (
            <div key={day} className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700 w-12">{DAY_LABELS[day]}</span>
              <input
                type="time"
                value={timeByDay[day] ?? '09:00'}
                onChange={(e) => setTime(day, e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
              />
            </div>
          ))}
        </div>
      )}
      <button
        onClick={() => onSave(slots)}
        disabled={isSaving}
        className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
      >
        {saved ? 'Saved!' : isSaving ? 'Saving...' : 'Save Schedule'}
      </button>
    </div>
  );
}

export default SettingsPage;
