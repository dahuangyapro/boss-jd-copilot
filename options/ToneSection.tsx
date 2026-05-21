import {
  TONE_LABELS,
  type AiSettings,
  type GreetingTone
} from "~lib/storage/options"

import { Field, S, Section, type Patcher } from "./ui"

const TONES = Object.keys(TONE_LABELS) as GreetingTone[]

export const ToneSection = ({
  settings,
  patch
}: {
  settings: AiSettings
  patch: Patcher
}) => (
  <Section title="招呼语风格">
    <Field label="语气">
      <select
        style={S.input}
        value={settings.tone}
        onChange={(e) => patch({ tone: e.target.value as GreetingTone })}>
        {TONES.map((t) => (
          <option key={t} value={t}>
            {TONE_LABELS[t]}
          </option>
        ))}
      </select>
    </Field>
  </Section>
)
