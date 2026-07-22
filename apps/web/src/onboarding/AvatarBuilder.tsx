import { useState } from "react";
import { createRng, type AvatarDoc } from "@atrium/core";
import {
  ACCESSORIES,
  EYE_COLORS,
  HAIR_COLORS,
  HAIR_STYLES,
  OUTFIT_COLORS,
  randomAvatar,
  SKIN_TONES,
} from "@atrium/avatar";
import { AvatarStage } from "../components/AvatarStage";

type Tab = "skin" | "hair" | "outfit" | "extras";

const TABS: { id: Tab; label: string }[] = [
  { id: "skin", label: "Skin" },
  { id: "hair", label: "Hair" },
  { id: "outfit", label: "Outfit" },
  { id: "extras", label: "Extras" },
];

function Swatches({
  colors,
  value,
  onPick,
  label,
}: {
  colors: readonly string[];
  value: string;
  onPick: (hex: string) => void;
  label: string;
}) {
  return (
    <div className="builder-row">
      <span className="builder-label">{label}</span>
      <div className="swatches">
        {colors.map((hex) => (
          <button
            key={hex}
            type="button"
            className={`swatch${value === hex ? " selected" : ""}`}
            style={{ background: hex }}
            onClick={() => onPick(hex)}
            aria-label={`${label} ${hex}`}
          />
        ))}
      </div>
    </div>
  );
}

function Options({
  options,
  value,
  onPick,
  label,
}: {
  options: readonly { id: string; label: string }[];
  value: string;
  onPick: (id: string) => void;
  label: string;
}) {
  return (
    <div className="builder-row">
      <span className="builder-label">{label}</span>
      <div className="options">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            className={`option${value === o.id ? " selected" : ""}`}
            onClick={() => onPick(o.id)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export interface AvatarBuilderProps {
  value: AvatarDoc;
  onChange: (doc: AvatarDoc) => void;
}

export function AvatarBuilder({ value, onChange }: AvatarBuilderProps) {
  const [tab, setTab] = useState<Tab>("skin");
  const set = (patch: Partial<AvatarDoc>) => onChange({ ...value, ...patch });

  return (
    <div className="builder">
      <div className="builder-preview">
        <AvatarStage doc={value} turntable />
        <button
          type="button"
          className="btn small"
          onClick={() => onChange(randomAvatar(createRng(crypto.randomUUID())))}
        >
          🎲 surprise me
        </button>
      </div>
      <div className="builder-controls">
        <div className="tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`tab${tab === t.id ? " selected" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "skin" && (
          <>
            <Swatches
              label="Skin"
              colors={SKIN_TONES}
              value={value.skin}
              onPick={(skin) => set({ skin })}
            />
            <Swatches
              label="Eyes"
              colors={EYE_COLORS}
              value={value.eyeColor}
              onPick={(eyeColor) => set({ eyeColor })}
            />
          </>
        )}

        {tab === "hair" && (
          <>
            <Options
              label="Style"
              options={HAIR_STYLES}
              value={value.hairStyle}
              onPick={(hairStyle) => set({ hairStyle })}
            />
            <Swatches
              label="Color"
              colors={HAIR_COLORS}
              value={value.hairColor}
              onPick={(hairColor) => set({ hairColor })}
            />
          </>
        )}

        {tab === "outfit" && (
          <>
            <Swatches
              label="Top"
              colors={OUTFIT_COLORS}
              value={value.top}
              onPick={(top) => set({ top })}
            />
            <Swatches
              label="Bottom"
              colors={OUTFIT_COLORS}
              value={value.bottom}
              onPick={(bottom) => set({ bottom })}
            />
            <Swatches
              label="Shoes"
              colors={OUTFIT_COLORS}
              value={value.shoes}
              onPick={(shoes) => set({ shoes })}
            />
          </>
        )}

        {tab === "extras" && (
          <Options
            label="Accessory"
            options={ACCESSORIES}
            value={value.accessory}
            onPick={(accessory) => set({ accessory })}
          />
        )}
      </div>
    </div>
  );
}
