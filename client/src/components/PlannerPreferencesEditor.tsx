import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/contexts/LanguageContext";
import type { PlannerDraft, PlannerBrand } from "@shared/plannerSchemas";

const styleIds = ["team", "tribute", "discovery"] as const;
type StyleId = typeof styleIds[number];

/** Editorial input aids only: the parent review validates and saves explicit edits. */
export default function PlannerPreferencesEditor({ brand, preferences, error }: {
  brand: PlannerBrand; preferences: PlannerDraft["preferences"]; error?: string;
}) {
  const { t } = useTranslation();
  const [style, setStyle] = useState<StyleId | "">("");
  const [archetype, setArchetype] = useState(preferences?.archetype ?? "");
  const [interests, setInterests] = useState(preferences?.interests.join(", ") ?? "");
  const archetypeRef = useRef<HTMLInputElement>(null);
  const order: StyleId[] = brand === "byebride" ? ["tribute", "team", "discovery"] : [...styleIds];

  const applyStyle = () => {
    if (!style) return;
    setArchetype(t(`planner.styles.${style}.title`));
    setInterests(t(`planner.styles.${style}.notes`));
    archetypeRef.current?.focus();
  };

  return <>
    <fieldset className="col-span-full min-w-0 space-y-3 rounded-lg border border-border bg-muted/30 p-3">
      <legend className="px-1 text-sm font-semibold">{t("planner.styles.title")}</legend>
      <p className="text-sm">{t(`planner.styles.${brand}.intro`)}</p>
      <p id="planner-style-help" className="text-sm text-muted-foreground">{t("planner.styles.help")}</p>
      <label className="block text-sm font-medium">
        <span className="mb-1 block">{t("planner.styles.choose")}</span>
        <select value={style} onChange={(event) => setStyle(event.target.value as StyleId | "")}
          aria-describedby="planner-style-help" className="min-h-11 w-full min-w-0 rounded-md border border-input bg-background px-3 text-foreground">
          <option value="">{t("planner.styles.none")}</option>
          {order.map((id) => <option key={id} value={id}>{t(`planner.styles.${id}.title`)}</option>)}
        </select>
      </label>
      {style && <div className="space-y-2 text-sm" aria-live="polite">
        <p>{t(`planner.styles.${style}.description`)}</p>
        <p className="text-muted-foreground">{t("planner.styles.replace")}</p>
      </div>}
      <Button type="button" variant="outline" disabled={!style} onClick={applyStyle} className="h-auto min-h-11 w-full whitespace-normal">{t("planner.styles.apply")}</Button>
    </fieldset>
    <label className="block min-w-0 text-sm font-medium"><span className="mb-1 block">{t("planner.experienceType")}</span>
      <Input ref={archetypeRef} name="archetype" value={archetype} maxLength={100} onChange={(event) => setArchetype(event.target.value)} />
    </label>
    <label className="block min-w-0 text-sm font-medium"><span className="mb-1 block">{t("planner.interests")}</span>
      <Textarea name="interests" rows={3} value={interests} onChange={(event) => setInterests(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? "preferences-error" : undefined} />
      {error && <span id="preferences-error" className="mt-1 block text-xs text-destructive">{error}</span>}
    </label>
  </>;
}
