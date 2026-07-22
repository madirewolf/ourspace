import { useRef, useState } from "react";
import type {
  MoodboardModule,
  MoodItem,
  MusicModule,
  PhotoItem,
  PhotosModule,
  TextModule,
} from "@atrium/core";
import { makeId } from "../ids";
import { fileToDataUrl } from "../imageUtils";
import { sampleArt } from "../sampleArt";
import { useApp } from "../store";

function useFilePicker(accept: string, onFiles: (files: File[]) => void) {
  const ref = useRef<HTMLInputElement>(null);
  const input = (
    <input
      ref={ref}
      type="file"
      accept={accept}
      multiple
      hidden
      onChange={(e) => {
        const files = Array.from(e.target.files ?? []);
        if (files.length > 0) onFiles(files);
        e.target.value = "";
      }}
    />
  );
  return { input, open: () => ref.current?.click() };
}

/** Convert files one by one; a HEIC in the batch must not sink the JPEGs. */
async function convertEach<T>(
  files: File[],
  convert: (file: File) => Promise<T>,
): Promise<{ converted: T[]; failed: number }> {
  const converted: T[] = [];
  let failed = 0;
  for (const file of files) {
    try {
      converted.push(await convert(file));
    } catch {
      failed++;
    }
  }
  return { converted, failed };
}

function failureNotice(failed: number): string | null {
  if (failed === 0) return null;
  return failed === 1
    ? "1 file couldn't be read (format not supported by this browser)"
    : `${failed} files couldn't be read (format not supported by this browser)`;
}

export function PhotosView({ module, editing }: { module: PhotosModule; editing: boolean }) {
  const updateModule = useApp((s) => s.updateModule);
  const appendPhotos = useApp((s) => s.appendPhotos);
  const setScreen = useApp((s) => s.setScreen);
  const [notice, setNotice] = useState<string | null>(null);

  const { input, open } = useFilePicker("image/*", async (files) => {
    const { converted, failed } = await convertEach(files.slice(0, 8), async (file) => {
      const src = await fileToDataUrl(file);
      return { id: makeId(), src, caption: file.name } satisfies PhotoItem;
    });
    if (converted.length > 0) appendPhotos(module.id, converted);
    setNotice(failureNotice(failed));
  });

  return (
    <div>
      {module.items.length > 0 ? (
        <div className="photo-grid">
          {module.items.map((item) => (
            <figure key={item.id} className="photo">
              <img src={item.src} alt={item.caption ?? "artwork"} loading="lazy" />
              {editing && (
                <button
                  type="button"
                  className="photo-remove"
                  aria-label="Remove"
                  onClick={() =>
                    updateModule({ ...module, items: module.items.filter((i) => i.id !== item.id) })
                  }
                >
                  ✕
                </button>
              )}
            </figure>
          ))}
        </div>
      ) : (
        <p className="empty-hint">Nothing on the walls yet.</p>
      )}
      {notice && <p className="module-notice">{notice}</p>}
      <div className="module-actions">
        {module.items.length > 0 && (
          <button
            type="button"
            className="btn primary"
            onClick={() => setScreen({ name: "gallery", moduleId: module.id })}
          >
            🚶 Walk this room
          </button>
        )}
        {editing && (
          <>
            <button type="button" className="btn small" onClick={open}>
              + Add images
            </button>
            <button
              type="button"
              className="btn small"
              onClick={() =>
                appendPhotos(module.id, [
                  {
                    id: makeId(),
                    src: sampleArt(`${module.id}:${module.items.length}:${makeId()}`),
                    caption: "Sample piece",
                  },
                ])
              }
            >
              ✨ Conjure sample art
            </button>
          </>
        )}
      </div>
      {input}
    </div>
  );
}

export function MusicView({ module, editing }: { module: MusicModule; editing: boolean }) {
  const updateModule = useApp((s) => s.updateModule);
  const { input, open } = useFilePicker("audio/*", (files) => {
    const tracks = [...module.tracks];
    for (const file of files.slice(0, 6)) {
      tracks.push({
        id: makeId(),
        title: file.name.replace(/\.[^.]+$/, ""),
        src: URL.createObjectURL(file),
      });
    }
    updateModule({ ...module, tracks });
  });

  const removeTrack = (id: string) => {
    const track = module.tracks.find((t) => t.id === id);
    // Object URLs pin the underlying file in memory until revoked.
    if (track?.src?.startsWith("blob:")) URL.revokeObjectURL(track.src);
    updateModule({ ...module, tracks: module.tracks.filter((t) => t.id !== id) });
  };

  return (
    <div>
      {module.tracks.length > 0 ? (
        <ul className="tracks">
          {module.tracks.map((track, i) => (
            <li key={track.id} className="track">
              <span className="track-n">{String(i + 1).padStart(2, "0")}</span>
              <span className="track-title">{track.title}</span>
              {track.src ? (
                <audio controls src={track.src} preload="none" />
              ) : (
                <span className="track-missing">file lives in your last session — re-add it</span>
              )}
              {editing && (
                <button
                  type="button"
                  className="btn tiny"
                  aria-label="Remove track"
                  onClick={() => removeTrack(track.id)}
                >
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty-hint">No sounds yet.</p>
      )}
      {editing && (
        <div className="module-actions">
          <button type="button" className="btn small" onClick={open}>
            + Add audio
          </button>
          <span className="module-notice quiet">
            audio stays for this session only until real accounts arrive
          </span>
        </div>
      )}
      {input}
    </div>
  );
}

export function MoodboardView({ module, editing }: { module: MoodboardModule; editing: boolean }) {
  const updateModule = useApp((s) => s.updateModule);
  const appendMoodItems = useApp((s) => s.appendMoodItems);
  const [noteDraft, setNoteDraft] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const { input, open } = useFilePicker("image/*", async (files) => {
    const { converted, failed } = await convertEach(files.slice(0, 6), async (file) => {
      const src = await fileToDataUrl(file, 700);
      return { id: makeId(), kind: "image", src } satisfies MoodItem;
    });
    if (converted.length > 0) appendMoodItems(module.id, converted);
    setNotice(failureNotice(failed));
  });

  const remove = (id: string) =>
    updateModule({ ...module, items: module.items.filter((i) => i.id !== id) });

  return (
    <div>
      {module.items.length > 0 ? (
        <div className="mood-grid">
          {module.items.map((item) => (
            <div key={item.id} className={`mood mood-${item.kind}`}>
              {item.kind === "color" && (
                <div className="mood-color" style={{ background: item.value }}>
                  <code>{item.value}</code>
                </div>
              )}
              {item.kind === "image" && <img src={item.src} alt="inspiration" loading="lazy" />}
              {item.kind === "note" && <p>{item.text}</p>}
              {editing && (
                <button
                  type="button"
                  className="photo-remove"
                  aria-label="Remove"
                  onClick={() => remove(item.id)}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="empty-hint">A blank corkboard.</p>
      )}
      {notice && <p className="module-notice">{notice}</p>}
      {editing && (
        <div className="module-actions">
          <button type="button" className="btn small" onClick={open}>
            + Image
          </button>
          <label className="btn small color-btn">
            + Color
            <input
              type="color"
              hidden
              onChange={(e) =>
                appendMoodItems(module.id, [{ id: makeId(), kind: "color", value: e.target.value }])
              }
            />
          </label>
          <input
            className="note-input"
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder="pin a note…"
            onKeyDown={(e) => {
              if (e.key === "Enter" && noteDraft.trim() !== "") {
                appendMoodItems(module.id, [
                  { id: makeId(), kind: "note", text: noteDraft.trim() },
                ]);
                setNoteDraft("");
              }
            }}
          />
        </div>
      )}
      {input}
    </div>
  );
}

export function TextView({ module, editing }: { module: TextModule; editing: boolean }) {
  const updateModule = useApp((s) => s.updateModule);
  return editing ? (
    <textarea
      className="text-module-input"
      value={module.body}
      rows={Math.max(4, module.body.split("\n").length + 1)}
      onChange={(e) => updateModule({ ...module, body: e.target.value })}
      placeholder="Write here…"
    />
  ) : (
    <div className="text-module">
      {module.body.split("\n\n").map((para, i) => (
        <p key={i}>{para}</p>
      ))}
    </div>
  );
}
