import { useRef, useState, type ChangeEvent } from 'react';
import { Avatar } from './Avatar';
import { mediaUrl, uploadImage } from '../lib/media';
import { socialApi, type StoryGroup } from '../lib/social';

interface Props {
  groups: StoryGroup[];
  onChanged: () => void;
}

export function StoriesBar({ groups, onChanged }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [viewer, setViewer] = useState<StoryGroup | null>(null);
  const [index, setIndex] = useState(0);

  async function onPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      await socialApi.createStory(url);
      onChanged();
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function open(group: StoryGroup) {
    setViewer(group);
    setIndex(0);
  }

  function advance() {
    if (!viewer) return;
    if (index + 1 < viewer.stories.length) setIndex((i) => i + 1);
    else setViewer(null);
  }

  return (
    <div className="stories">
      <button
        className="story-add"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
      >
        <div className="story-add-circle">{uploading ? '…' : '+'}</div>
        <span>Tu story</span>
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={onPick}
      />

      {groups.map((g) => (
        <button key={g.author.id} className="story-item" onClick={() => open(g)}>
          <div className="story-ring">
            <Avatar name={g.author.displayName} src={g.author.avatarUrl} size={56} />
          </div>
          <span>{g.author.displayName.split(' ')[0]}</span>
        </button>
      ))}

      {viewer && (
        <div className="story-viewer" onClick={advance}>
          <img src={mediaUrl(viewer.stories[index].imageUrl)} alt="story" />
          <div className="story-viewer-name">{viewer.author.displayName}</div>
        </div>
      )}
    </div>
  );
}
