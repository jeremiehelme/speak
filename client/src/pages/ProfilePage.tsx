import { useState, useEffect } from 'react';
import { useProfile, useUpdateProfile } from '../hooks/use-profile';

function ProfilePage() {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const [voiceDescription, setVoiceDescription] = useState('');
  const [examplePosts, setExamplePosts] = useState('');
  const [generalOpinions, setGeneralOpinions] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setVoiceDescription(profile.voice_description ?? '');
      setExamplePosts(profile.example_posts ?? '');
      setGeneralOpinions(profile.general_opinions ?? '');
    }
  }, [profile]);

  if (isLoading) return <div className="text-gray-500">Loading profile...</div>;

  const handleSave = async () => {
    await updateProfile.mutateAsync({
      voiceDescription,
      examplePosts,
      generalOpinions,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Voice Profile</h1>

      <section className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Voice / Tone Description
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Describe how you write. E.g., "Direct, technical, no buzzwords. Occasional dry humor."
          </p>
          <textarea
            value={voiceDescription}
            onChange={(e) => setVoiceDescription(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="Describe your writing voice..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Example Posts (2-3 samples)
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Paste posts you've written or admire. Separate them with a blank line.
          </p>
          <textarea
            value={examplePosts}
            onChange={(e) => setExamplePosts(e.target.value)}
            rows={6}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="Paste your example posts here..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            General Opinions & Stances
          </label>
          <p className="text-xs text-gray-500 mb-2">
            What are your core beliefs relevant to your content? E.g., "AI hype is overblown but the technology is real."
          </p>
          <textarea
            value={generalOpinions}
            onChange={(e) => setGeneralOpinions(e.target.value)}
            rows={4}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="Share your opinions and stances..."
          />
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={updateProfile.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {updateProfile.isPending ? 'Saving...' : 'Save Profile'}
          </button>
          {saved && <span className="text-sm text-green-600">Voice profile updated</span>}
        </div>
      </section>
    </div>
  );
}

export default ProfilePage;
