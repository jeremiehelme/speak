import { useState } from 'react';
import {
  useSettings,
  useUpdateSettings,
  useValidateApiKey,
  useBookmarklet,
} from '../hooks/use-settings';
import { useUpdateProfile } from '../hooks/use-profile';
import { useNavigate } from 'react-router-dom';

function OnboardingPage() {
  const navigate = useNavigate();
  useSettings();
  const updateSettings = useUpdateSettings();
  const validateKey = useValidateApiKey();
  const updateProfile = useUpdateProfile();
  const { data: bookmarkletData } = useBookmarklet();

  const [step, setStep] = useState(1);
  const [apiKey, setApiKey] = useState('');
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    message?: string;
  } | null>(null);
  const [voiceDescription, setVoiceDescription] = useState('');
  const [examplePosts, setExamplePosts] = useState('');
  const [generalOpinions, setGeneralOpinions] = useState('');

  const handleValidateAndSave = async () => {
    if (!apiKey.trim()) return;
    const result = await validateKey.mutateAsync(apiKey);
    setValidationResult(result);
    if (result.valid) {
      await updateSettings.mutateAsync({ anthropic_api_key: apiKey });
      setStep(2);
    }
  };

  const handleSaveProfile = async () => {
    await updateProfile.mutateAsync({
      voiceDescription,
      examplePosts,
      generalOpinions,
    });
    setStep(3);
  };

  const handleFinish = () => {
    navigate('/capture');
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Welcome to Speak</h1>
      <div className="flex gap-2 mb-6">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-2 flex-1 rounded-full ${s <= step ? 'bg-blue-600' : 'bg-gray-200'}`}
          />
        ))}
      </div>

      {step === 1 && (
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Step 1: API Key</h2>
          <p className="text-sm text-gray-600 mb-4">
            Enter your Anthropic API key to power AI features.
          </p>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-ant-..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm mb-3"
          />
          <button
            onClick={handleValidateAndSave}
            disabled={!apiKey.trim() || validateKey.isPending}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {validateKey.isPending ? 'Validating...' : 'Validate & Continue'}
          </button>
          {validationResult && !validationResult.valid && (
            <p className="mt-2 text-sm text-red-600">
              {validationResult.message || 'Invalid API key. Please try again.'}
            </p>
          )}
        </section>
      )}

      {step === 2 && (
        <section className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Step 2: Your Voice</h2>
          <p className="text-sm text-gray-600">
            Help Speak learn how you write. All fields are optional.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Voice Description
            </label>
            <textarea
              value={voiceDescription}
              onChange={(e) => setVoiceDescription(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="Direct, technical, no buzzwords..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Example Posts (2-3)
            </label>
            <textarea
              value={examplePosts}
              onChange={(e) => setExamplePosts(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="Paste posts you've written..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">General Opinions</label>
            <textarea
              value={generalOpinions}
              onChange={(e) => setGeneralOpinions(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              placeholder="AI hype is overblown but the technology is real..."
            />
          </div>
          <button
            onClick={handleSaveProfile}
            disabled={updateProfile.isPending}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {updateProfile.isPending ? 'Saving...' : 'Save & Continue'}
          </button>
        </section>
      )}

      {step === 3 && (
        <section className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Step 3: Install Bookmarklet</h2>
          <p className="text-sm text-gray-600">
            Drag this button to your bookmarks bar for one-click capture:
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
            <p className="text-sm text-gray-400">Loading...</p>
          )}
          <p className="text-xs text-gray-500">You can always find this in Settings later.</p>
          <button
            onClick={handleFinish}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
          >
            Capture Your First Source
          </button>
        </section>
      )}
    </div>
  );
}

export default OnboardingPage;
