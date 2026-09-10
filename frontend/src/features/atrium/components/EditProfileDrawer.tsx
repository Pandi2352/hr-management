import { useEffect, useRef, useState } from 'react';
import { Check, Eye, Image as ImageIcon, Loader2, Palette, Trash2, Upload, X } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { useToast } from '../../../components/ui/toast';
import { AvatarCropModal } from '../../profile/components/AvatarCropModal';
import { cn } from '../../../utils/cn';
import { atriumApi } from '../api/atrium.api';
import { ATRIUM_ACCENT_TOKENS, accentTokens, initialsOf } from '../atriumAccents';
import { MOOD_EMOJI_CHOICES, MOOD_PRESETS } from '../atriumMoods';
import {
  AtriumEditGlyph,
  AtriumFollowGlyph,
  AtriumSparkGlyph,
  AtriumSproutGlyph,
} from '../icons/AtriumIcons';
import type { AtriumAccent, AtriumProfile } from '../types/atrium.types';

interface EditProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  profile: AtriumProfile;
  onSaved: (profile: AtriumProfile) => void;
}

const BIO_LIMIT = 280;
const STATUS_LIMIT = 60;
const MAX_INTERESTS = 10;
const MAX_ASK_ME = 6;
const COVER_ASPECT = 3.2;

type TabKey = 'photos' | 'colour' | 'about' | 'mood';

const TABS: {
  key: TabKey;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: 'photos', label: 'Photos', hint: 'Portrait and cover', icon: ImageIcon },
  { key: 'colour', label: 'Colour', hint: 'Your accent', icon: Palette },
  { key: 'about', label: 'About you', hint: 'Bio and topics', icon: AtriumEditGlyph },
  { key: 'mood', label: 'Today', hint: 'Mood and status', icon: AtriumSparkGlyph },
];

/**
 * The Atrium profile editor.
 *
 * A fixed 880×600 dialog rather than one that grows with its content. The
 * editor has four separate jobs, and a panel tall enough to hold all of them at
 * once runs off the bottom of the screen with Save beyond reach. Here the frame
 * never changes size as you move between tabs, so the footer stays exactly
 * where your hand expects it and only the middle scrolls.
 *
 * Photos save the moment they are cropped, because an upload is a discrete act
 * with its own success or failure. Everything else stays a draft until Save, so
 * a cancelled edit changes nothing.
 */
export function EditProfileDrawer({ isOpen, onClose, profile, onSaved }: EditProfileDrawerProps) {
  const toast = useToast();
  const [tab, setTab] = useState<TabKey>('photos');

  const [bio, setBio] = useState(profile.bio);
  const [pronouns, setPronouns] = useState(profile.pronouns);
  const [location, setLocation] = useState(profile.location);
  const [interests, setInterests] = useState<string[]>(profile.interests);
  const [askMeAbout, setAskMeAbout] = useState<string[]>(profile.askMeAbout);
  const [accent, setAccent] = useState<AtriumAccent>(profile.accent);
  const [moodEmoji, setMoodEmoji] = useState(profile.mood?.emoji ?? '');
  const [moodText, setMoodText] = useState(profile.mood?.text ?? '');
  const [isSaving, setIsSaving] = useState(false);

  // Live copy of the server profile, so an uploaded photo appears immediately.
  const [current, setCurrent] = useState(profile);

  const [cropKind, setCropKind] = useState<'photo' | 'cover' | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const photoInput = useRef<HTMLInputElement | null>(null);
  const coverInput = useRef<HTMLInputElement | null>(null);

  // Re-seed on open, so a cancelled edit never leaks into the next one.
  useEffect(() => {
    if (!isOpen) return;
    setTab('photos');
    setCurrent(profile);
    setBio(profile.bio);
    setPronouns(profile.pronouns);
    setLocation(profile.location);
    setInterests(profile.interests);
    setAskMeAbout(profile.askMeAbout);
    setAccent(profile.accent);
    setMoodEmoji(profile.mood?.emoji ?? '');
    setMoodText(profile.mood?.text ?? '');
  }, [isOpen, profile]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      // Escape belongs to the crop dialog while that is open.
      if (e.key === 'Escape' && !cropSrc) onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose, cropSrc]);

  if (!isOpen) return null;

  const tokens = accentTokens(accent);

  const pickFile = (kind: 'photo' | 'cover', file?: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Pick an image under 5MB.', 'Too large');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCropKind(kind);
      setCropSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCropSave = async (cropped: File) => {
    if (!cropKind) return;
    setIsUploading(true);
    try {
      const saved = await atriumApi.uploadImage(cropKind, cropped);
      setCurrent(saved);
      onSaved(saved);
      toast.success(cropKind === 'cover' ? 'Cover updated.' : 'Photo updated.', 'Saved');
      setCropSrc(null);
      setCropKind(null);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || 'That upload did not go through.',
        'Upload failed',
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = async (kind: 'photo' | 'cover') => {
    setIsUploading(true);
    try {
      const saved = await atriumApi.removeImage(kind);
      setCurrent(saved);
      onSaved(saved);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not remove that image.', 'Failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const saved = await atriumApi.updateMyProfile({
        bio,
        pronouns,
        location,
        interests,
        askMeAbout,
        accent,
        moodEmoji,
        moodText,
      });
      onSaved(saved);
      toast.success('Your Atrium profile is updated.', 'Saved');
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not save your profile.', 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={onClose} />

        {/* Fixed size. Only the middle panel scrolls; the frame never moves. */}
        <div className="relative z-10 flex h-[600px] max-h-[92vh] w-[880px] max-w-[96vw] flex-col overflow-hidden rounded-md border border-hairline bg-surface">
          <header className="flex shrink-0 items-center justify-between border-b border-hairline px-5 py-3">
            <div>
              <h2 className="text-[15px] font-bold text-ink">Make it yours</h2>
              <p className="text-[11.5px] text-ink-3">
                This is the version of you the whole company sees in Atrium.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="flex min-h-0 flex-1">
            {/* Tabs down the side, so the panel keeps its full height */}
            <nav className="flex w-[188px] shrink-0 flex-col gap-1 border-r border-hairline p-2.5">
              {TABS.map((item) => {
                const active = tab === item.key;
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setTab(item.key)}
                    className={cn(
                      'flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors',
                      active ? cn(tokens.soft, tokens.text) : 'text-ink-2 hover:bg-surface-2',
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="min-w-0">
                      <span className="block truncate text-[12.5px] font-semibold">
                        {item.label}
                      </span>
                      <span className="block truncate text-[10.5px] text-ink-3">{item.hint}</span>
                    </span>
                  </button>
                );
              })}

              <div className="mt-auto rounded-md bg-surface-2 p-2.5">
                <p className="text-[10.5px] leading-relaxed text-ink-3">
                  Photos save as soon as you crop them. Everything else saves when you press Save.
                </p>
              </div>
            </nav>

            <div className="min-w-0 flex-1 overflow-y-auto p-5">
              {tab === 'photos' && (
                <PhotosTab
                  profile={current}
                  accent={accent}
                  isBusy={isUploading}
                  onPickPhoto={() => photoInput.current?.click()}
                  onPickCover={() => coverInput.current?.click()}
                  onRemove={handleRemoveImage}
                />
              )}

              {tab === 'colour' && (
                <ColourTab profile={current} accent={accent} onChange={setAccent} />
              )}

              {tab === 'about' && (
                <AboutTab
                  bio={bio}
                  setBio={setBio}
                  pronouns={pronouns}
                  setPronouns={setPronouns}
                  location={location}
                  setLocation={setLocation}
                  askMeAbout={askMeAbout}
                  setAskMeAbout={setAskMeAbout}
                  interests={interests}
                  setInterests={setInterests}
                  accent={accent}
                />
              )}

              {tab === 'mood' && (
                <MoodTab
                  emoji={moodEmoji}
                  text={moodText}
                  setEmoji={setMoodEmoji}
                  setText={setMoodText}
                  accent={accent}
                />
              )}
            </div>
          </div>

          <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-hairline px-5 py-3">
            <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-3">
              <Eye className="h-3.5 w-3.5" />
              Visible to everyone in the organization
            </span>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="button" onClick={handleSave} isLoading={isSaving}>
                Save
              </Button>
            </div>
          </footer>
        </div>
      </div>

      <input
        ref={photoInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          pickFile('photo', e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <input
        ref={coverInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          pickFile('cover', e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      <AvatarCropModal
        isOpen={!!cropSrc}
        imageSrc={cropSrc}
        onClose={() => {
          setCropSrc(null);
          setCropKind(null);
        }}
        onCropSave={handleCropSave}
        isSaving={isUploading}
        aspect={cropKind === 'cover' ? COVER_ASPECT : 1}
        shape={cropKind === 'cover' ? 'rect' : 'circle'}
        title={cropKind === 'cover' ? 'Crop your cover' : 'Crop your photo'}
        subtitle="Drag to reposition · Scroll or use the slider to zoom"
        exportWidth={cropKind === 'cover' ? 1280 : 512}
        confirmLabel="Crop & Upload"
      />
    </>
  );
}

/* ── Photos ─────────────────────────────────────────────────────────────── */

function PhotosTab({
  profile,
  accent,
  isBusy,
  onPickPhoto,
  onPickCover,
  onRemove,
}: {
  profile: AtriumProfile;
  accent: AtriumAccent;
  isBusy: boolean;
  onPickPhoto: () => void;
  onPickCover: () => void;
  onRemove: (kind: 'photo' | 'cover') => void;
}) {
  const tokens = accentTokens(accent);

  return (
    <div className="space-y-4">
      <SectionTitle
        title="Your cover"
        hint="A wide banner across the top of your profile. Your accent colour shows through when there is none."
      />

      {/* The real header, so nobody has to imagine the result */}
      <div className="overflow-hidden rounded-md border border-hairline">
        <div
          className={cn(
            'relative flex h-[132px] items-end bg-cover bg-center p-3',
            !profile.coverUrl && tokens.block,
          )}
          style={profile.coverUrl ? { backgroundImage: `url(${profile.coverUrl})` } : undefined}
        >
          {profile.coverUrl && <div className="absolute inset-0 bg-slate-900/25" />}

          <div className="relative flex items-end gap-3">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 border-white/70">
              {profile.photoUrl ? (
                <img src={profile.photoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div
                  className={cn(
                    'flex h-full w-full items-center justify-center text-lg font-black text-white',
                    tokens.block,
                  )}
                >
                  {initialsOf(profile.displayName)}
                </div>
              )}
            </div>
            <div className="pb-1">
              <div className="text-[13px] font-bold text-white">{profile.displayName}</div>
              <div className="text-[11px] text-white/80">
                {profile.designationTitle || 'Team member'}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-hairline bg-surface p-2.5">
          <ImageAction icon={Upload} label="Change cover" onClick={onPickCover} disabled={isBusy} />
          {profile.coverUrl && (
            <ImageAction
              icon={Trash2}
              label="Remove cover"
              onClick={() => onRemove('cover')}
              disabled={isBusy}
              danger
            />
          )}
          <span className="ml-auto text-[10.5px] text-ink-3">1280 × 400 · JPG, PNG or WEBP</span>
        </div>
      </div>

      <SectionTitle
        title="Your photo"
        hint="Separate from the picture on your HR record, so this one can be as relaxed as you like."
      />

      <div className="flex items-center gap-4 rounded-md border border-hairline bg-surface p-3">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md">
          {profile.photoUrl ? (
            <img src={profile.photoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div
              className={cn(
                'flex h-full w-full items-center justify-center text-2xl font-black text-white',
                tokens.block,
              )}
            >
              {initialsOf(profile.displayName)}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[11.5px] leading-relaxed text-ink-2">
            {profile.photoUrl
              ? 'Colleagues see this everywhere in Atrium.'
              : 'With no photo, your monogram sits on your accent colour. That works fine — a photo just makes you easier to spot.'}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <ImageAction
              icon={Upload}
              label={profile.photoUrl ? 'Change photo' : 'Upload photo'}
              onClick={onPickPhoto}
              disabled={isBusy}
            />
            {profile.photoUrl && (
              <ImageAction
                icon={Trash2}
                label="Remove"
                onClick={() => onRemove('photo')}
                disabled={isBusy}
                danger
              />
            )}
            {isBusy && <Loader2 className="h-3.5 w-3.5 animate-spin text-ink-3" />}
          </div>
        </div>
      </div>
    </div>
  );
}

function ImageAction({
  icon: Icon,
  label,
  onClick,
  disabled,
  danger,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11.5px] font-semibold transition-colors disabled:opacity-50',
        danger
          ? 'border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/40'
          : 'border-hairline text-ink-2 hover:bg-surface-2 hover:text-ink',
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

/* ── Colour ─────────────────────────────────────────────────────────────── */

function ColourTab({
  profile,
  accent,
  onChange,
}: {
  profile: AtriumProfile;
  accent: AtriumAccent;
  onChange: (accent: AtriumAccent) => void;
}) {
  const tokens = accentTokens(accent);

  return (
    <div className="space-y-4">
      <SectionTitle
        title="Your colour"
        hint="It marks you across the directory, your profile, every list and the rail. Pick the one you want to be found by."
      />

      {/* A fixed six-wide grid: the palette reads as a palette instead of
          wrapping into an orphan row. */}
      <div className="grid grid-cols-6 gap-2">
        {(Object.keys(ATRIUM_ACCENT_TOKENS) as AtriumAccent[]).map((key) => {
          const t = ATRIUM_ACCENT_TOKENS[key];
          const selected = key === accent;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              aria-label={t.label}
              aria-pressed={selected}
              className={cn(
                'flex h-12 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-md transition-transform hover:scale-105',
                t.block,
                selected && cn('ring-2 ring-offset-2 ring-offset-surface', t.ring),
              )}
            >
              {selected && <Check className="h-3.5 w-3.5 text-white" />}
              <span className="text-[9.5px] font-bold uppercase tracking-wide text-white/90">
                {t.label}
              </span>
            </button>
          );
        })}
      </div>

      <SectionTitle title="How it looks" hint="Your card in the directory, live." />

      <div className="w-56 overflow-hidden rounded-md border border-hairline bg-surface">
        <div className={cn('flex h-20 items-center justify-center', tokens.block)}>
          {profile.photoUrl ? (
            <img src={profile.photoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-3xl font-black text-white/95">
              {initialsOf(profile.displayName)}
            </span>
          )}
        </div>
        <div className="p-2.5">
          <div className="truncate text-[12.5px] font-bold text-ink">{profile.displayName}</div>
          <div className={cn('truncate text-[11px] font-medium', tokens.text)}>
            {profile.designationTitle || 'Team member'}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── About ──────────────────────────────────────────────────────────────── */

function AboutTab({
  bio,
  setBio,
  pronouns,
  setPronouns,
  location,
  setLocation,
  askMeAbout,
  setAskMeAbout,
  interests,
  setInterests,
  accent,
}: {
  bio: string;
  setBio: (v: string) => void;
  pronouns: string;
  setPronouns: (v: string) => void;
  location: string;
  setLocation: (v: string) => void;
  askMeAbout: string[];
  setAskMeAbout: (v: string[]) => void;
  interests: string[];
  setInterests: (v: string[]) => void;
  accent: AtriumAccent;
}) {
  const tokens = accentTokens(accent);
  const remaining = BIO_LIMIT - bio.length;

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-1 flex items-baseline justify-between">
          <label className="text-xs font-semibold text-ink">Bio</label>
          <span
            className={cn(
              'text-[10.5px]',
              remaining < 20 ? 'font-semibold text-amber-600' : 'text-ink-3',
            )}
          >
            {remaining}
          </span>
        </div>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, BIO_LIMIT))}
          rows={3}
          placeholder="A line or two about you — what you work on, what you enjoy."
          className="w-full resize-none rounded-md border border-hairline bg-surface px-3 py-2 text-xs text-ink outline-none placeholder:text-ink-3 focus:border-ink-3"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Pronouns"
          value={pronouns}
          onChange={(e) => setPronouns(e.target.value)}
          placeholder="she/her"
        />
        <Input
          label="Where you work from"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Chennai · Remote"
        />
      </div>

      <div className={cn('rounded-md border p-3', tokens.border, tokens.soft)}>
        <div className="mb-2 flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-ink-3">
          <AtriumSparkGlyph className="h-3.5 w-3.5" />
          The best field on your profile
        </div>
        <TagField
          label="Ask me about"
          hint="What colleagues can come to you for. This is what people search."
          tags={askMeAbout}
          onChange={setAskMeAbout}
          max={MAX_ASK_ME}
          accent={accent}
          placeholder="e.g. Kubernetes, hiring, onboarding"
        />
      </div>

      <div>
        <div className="mb-2 flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-ink-3">
          <AtriumSproutGlyph className="h-3.5 w-3.5" />
          Outside work
        </div>
        <TagField
          label="Interests"
          hint="The fun half. Nothing here has to be impressive."
          tags={interests}
          onChange={setInterests}
          max={MAX_INTERESTS}
          accent={accent}
          placeholder="e.g. filter coffee, trail running"
        />
      </div>
    </div>
  );
}

/* ── Mood ───────────────────────────────────────────────────────────────── */

function MoodTab({
  emoji,
  text,
  setEmoji,
  setText,
  accent,
}: {
  emoji: string;
  text: string;
  setEmoji: (v: string) => void;
  setText: (v: string) => void;
  accent: AtriumAccent;
}) {
  const tokens = accentTokens(accent);
  const isSet = Boolean(emoji || text);

  return (
    <div className="space-y-4">
      <SectionTitle
        title="How's today going?"
        hint="It sits on your card until midnight, then clears itself. Nobody has to remember to take it down."
      />

      {/* Live preview of the badge colleagues will actually see */}
      <div className="flex items-center gap-3 rounded-md border border-hairline bg-surface p-3">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-ink-3">
          Preview
        </span>
        {isSet ? (
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11.5px] font-medium',
              tokens.soft,
              tokens.text,
            )}
          >
            <span className="text-sm leading-none">{emoji || '💬'}</span>
            {text || 'No words, just the mood'}
          </span>
        ) : (
          <span className="text-[11.5px] text-ink-3">Nothing set. Your card stays as it is.</span>
        )}
        {isSet && (
          <button
            type="button"
            onClick={() => {
              setEmoji('');
              setText('');
            }}
            className="ml-auto cursor-pointer text-[11px] font-semibold text-ink-3 transition-colors hover:text-rose-600"
          >
            Clear
          </button>
        )}
      </div>

      <SectionTitle title="One tap" hint="Pick one, then edit the words if you want." />

      <div className="grid grid-cols-2 gap-2">
        {MOOD_PRESETS.map((preset) => {
          const active = preset.emoji === emoji && preset.text === text;
          return (
            <button
              key={preset.text}
              type="button"
              onClick={() => {
                setEmoji(preset.emoji);
                setText(preset.text);
              }}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-2 text-left transition-colors',
                active
                  ? cn(tokens.border, tokens.soft, tokens.text)
                  : 'border-hairline text-ink-2 hover:bg-surface-2',
              )}
            >
              <span className="text-base leading-none">{preset.emoji}</span>
              <span className="truncate text-[11.5px] font-medium">{preset.text}</span>
            </button>
          );
        })}
      </div>

      <SectionTitle title="Or say it your way" hint="Pick an emoji and write your own line." />

      <div className="space-y-2">
        <div className="flex flex-wrap gap-1">
          {MOOD_EMOJI_CHOICES.map((choice) => (
            <button
              key={choice}
              type="button"
              onClick={() => setEmoji(choice)}
              aria-label={`Use ${choice}`}
              className={cn(
                'flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-base transition-colors',
                choice === emoji ? cn(tokens.soft, 'ring-1', tokens.ring) : 'hover:bg-surface-2',
              )}
            >
              {choice}
            </button>
          ))}
        </div>

        <div className="flex items-baseline justify-between pt-1">
          <label className="text-xs font-semibold text-ink">Your status</label>
          <span className="text-[10.5px] text-ink-3">{STATUS_LIMIT - text.length}</span>
        </div>
        <Input
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, STATUS_LIMIT))}
          placeholder="Say anything — it disappears tonight"
        />
      </div>
    </div>
  );
}

/* ── Shared bits ────────────────────────────────────────────────────────── */

function SectionTitle({ title, hint }: { title: string; hint: string }) {
  return (
    <div>
      <h3 className="text-[12.5px] font-bold text-ink">{title}</h3>
      <p className="text-[11px] leading-relaxed text-ink-3">{hint}</p>
    </div>
  );
}

/** Chip editor — add on Enter, remove with the ×. */
function TagField({
  label,
  hint,
  tags,
  onChange,
  max,
  accent,
  placeholder,
}: {
  label: string;
  hint: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  max: number;
  accent: AtriumAccent;
  placeholder: string;
}) {
  const [draft, setDraft] = useState('');
  const tokens = accentTokens(accent);

  const add = () => {
    const value = draft.trim().slice(0, 32);
    if (!value) return;
    // Case-insensitive de-dupe: "React" and "react" are one topic.
    if (tags.some((t) => t.toLowerCase() === value.toLowerCase())) {
      setDraft('');
      return;
    }
    if (tags.length >= max) return;
    onChange([...tags, value]);
    setDraft('');
  };

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <label className="text-xs font-semibold text-ink">{label}</label>
        <span className="text-[10.5px] text-ink-3">
          {tags.length}/{max}
        </span>
      </div>
      <p className="mb-2 text-[11px] text-ink-3">{hint}</p>

      {tags.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className={cn(
                'inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11.5px] font-medium',
                tokens.soft,
                tokens.text,
              )}
            >
              {tag}
              <button
                type="button"
                onClick={() => onChange(tags.filter((t) => t !== tag))}
                aria-label={`Remove ${tag}`}
                className="cursor-pointer opacity-60 transition-opacity hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {tags.length < max && (
        <div className="flex items-center gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add();
              }
            }}
            placeholder={placeholder}
            className="text-xs"
          />
          <Button type="button" variant="outline" size="sm" onClick={add} disabled={!draft.trim()}>
            <AtriumFollowGlyph className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
