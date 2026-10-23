# ByeBi Design System

## Purpose

This document is the UI/UX authority for ByeBi. It defines how the shared product should look, respond, communicate state, and distinguish its brand variants. Product intent belongs in [PRD.md](PRD.md); technical ownership belongs in [ARCHITECTURE.md](ARCHITECTURE.md).

## Principles

- One coherent product, expressed through two brand variants.
- Clear next actions over decorative complexity.
- Honest provider, price, and booking language.
- Mobile-first layouts that scale without changing meaning.
- Reusable primitives and semantic tokens over page-specific styling.
- Accessible states and feedback built into every core interaction.

## Shared visual foundation

The current foundation is defined in `client/src/index.css`, `tailwind.config.ts`, and `client/src/components/ui/`.

- Body type: Inter with system fallbacks.
- Display and heading type: Poppins with system fallbacks.
- Base background: warm off-white.
- Surfaces: white, muted neutral, and dark inverse.
- Semantic colors: primary, secondary, muted, success, warning, danger, border, and focus ring.
- Radius scale: `0.5rem`, `0.75rem`, and `1.25rem`.
- Elevation: `shadow-soft` for default surfaces and `shadow-raised` for emphasized interaction.

Use semantic token classes such as `bg-background`, `text-foreground`, `bg-primary`, and `border-border`. Avoid hard-coded brand colors in new shared components.

## ByeBro and ByeBride variants

The selected brand is applied through `html[data-brand]` and persisted as `selectedBrand`.

- ByeBro uses the red primary family.
- ByeBride uses the pink primary family.
- Both variants share layout, component structure, responsive behavior, state semantics, and feature logic.
- Imagery, icons, examples, copy, and tone may vary when they preserve the same task and information hierarchy.
- A brand change must not produce a different capability or hidden workflow.

Brand voice: ByeBro is direct, playful and collaborative; ByeBride is attentive, warm and imaginative. Do not associate either voice with presumed interests or group composition. In the preference editor, expose every editorial outline to both variants, with no preselection. Preview, explicit field replacement and final review save are distinct actions. State that applying replaces both preference fields, that notes remain editable, and that outlines are neither bookable packages nor partner filters. Keep controls at least 44 px high, labels visible, copy wrapping and keyboard focus on the first editable preference field after application.

Prefer token overrides and data-driven content. Do not fork a shared feature component solely to change color or copy.

## Layout

Use the existing width primitives:

- `.page-container` — general pages, maximum width `1200px`.
- `.product-container` — focused product flows, maximum width `960px`.
- `.reading-container` — long-form content, maximum width `720px`.

All provide responsive horizontal padding. Keep one dominant content column on narrow screens. On wider screens, introduce multiple columns only when comparison or supporting context benefits from proximity.

Maintain a visible skip target and use `main#main-content` for the primary page region. Route changes should return focus/scroll to meaningful content rather than leaving the user in a stale position.

## Spacing

Use the Tailwind spacing scale consistently.

- `gap-2` / `space-y-2` for tightly related controls or metadata.
- `gap-3` to `gap-4` for form fields, card internals, and action groups.
- `gap-6` to `gap-8` for sections and card groups.
- `py-12` to `py-16` for major page sections when viewport space allows.

Card primitives currently use `p-6`. Compact cards may reduce padding, but related instances should remain consistent. Do not solve hierarchy by adding arbitrary one-off margins.

## Typography

- Use display type for headings and sans type for body and controls.
- Keep one `h1` that names the page or task.
- Follow heading order without skipping levels for visual size.
- Use concise labels and body copy; provider conditions and errors must remain readable, not reduced to decorative microcopy.
- Do not encode hierarchy through color alone; combine size, weight, spacing, and semantics.

## Responsive behavior

- Start with the smallest supported viewport and enhance at Tailwind breakpoints.
- Primary actions should remain visible, readable, and easy to tap.
- Stack action groups and comparison cards when horizontal space is insufficient.
- Preserve logical DOM and keyboard order when visual layout changes.
- Avoid fixed widths that cause horizontal scrolling.
- Dialogs and sheets must remain usable with an on-screen keyboard and long localized copy.
- Test navigation, Planner, provider cards, authentication, and save actions on mobile and desktop.

## Accessibility

- Use native interactive elements whenever possible.
- Every input has a programmatic label and associated validation message.
- Every icon-only control has an accessible name.
- Use visible `focus-visible` rings; never remove focus without an equivalent replacement.
- Dialogs trap focus, expose their title/description, and return focus on close.
- Announce asynchronous success and failure where appropriate.
- Selected, disabled, loading, unavailable, and error states require text or semantics beyond color.
- Images need meaningful alternative text or empty alt text when decorative.
- Respect reduced-motion preferences for nonessential motion.
- Maintain readable contrast in both brand themes and on inverse surfaces.

## Buttons and links

Use `client/src/components/ui/button.tsx` and its established variants before creating custom button styling:

- `default` / `primary` — dominant in-product action.
- `secondary` — supporting action.
- `outline`, `quiet`, or `ghost` — lower-emphasis controls.
- `external` — neutral external-provider handoff where appropriate.
- `destructive` — irreversible or damaging action.
- `link` — inline navigation, not a substitute for every secondary button.

Button labels begin with a clear verb. Disabled controls still explain unmet prerequisites nearby. Loading buttons retain their width and communicate progress.

### CTA hierarchy

On discovery and entry surfaces:

- Primary: AI Planner.
- The homepage action uses a clear planning verb and remains usable with an empty optional message. Explain that users can type an idea or open guided inspiration. Preserve visible labels and wrapping helper text on mobile.
- Secondary: explore or compare.

On provider-option surfaces:

- Primary: the next explicit action for the selected option.
- That action may be an external partner handoff.

External actions must name the provider, show an external-link cue when useful, and never imply internal ByeBi booking. A page may have several provider actions, but the current decision should remain visually dominant.

On Travel Options, repeat the route/destination, dates and real group size near the relevant flight/hotel action. Keep provider-specific limitations adjacent and distinguish the group size from a capped external search. Place any affiliate disclosure before the action. Destination-level activity handoffs must not imply that trip dates or interests have filtered live results.

## Cards

Use the shared Card primitive and its variants:

- `default` — static grouped information.
- `interactive` — selectable or navigable content with hover/focus affordance.
- `selected` — the user's explicit current selection.

Clickable cards need keyboard-equivalent interaction. Keep the click target unambiguous; avoid nesting conflicting controls. Use consistent order for title, descriptive metadata, price/status, and action.

## Optional editorial program editor

The review summary exposes a collapsible optional editor. Distinguish ideas from explicitly scheduled items, show that feasibility is unverified and avoid implying inventory or booking. Require a day and named calendar slot for addition; keep optional duration editable rather than inventing it. An occupied slot must prompt another choice or explicit removal, never silent replacement. Context changes require review and visible corrections before applying the new context; preserve unrelated item details. Program revision conflicts require reloading/review instead of replaying an action automatically. The optional editor must not block the existing brief, search or save journey. Keep the local-only scope and unverified feasibility visible, with no claim of Trip Hub synchronization. New program controls use at least 44 px height. A successful activity write returns focus to the program heading. Validation failures keep the form editable; storage/conflict failures require explicit reload rather than replaying a write.

## Planner UI

The Planner collects intent progressively and ends in a reviewable travel brief.

- Show which fields are known, missing, or invalid.
- Destination inspiration uses at most two stacked, keyboard-operable buttons with a destination label and a short editorial reason. State that these are ideas, not live offers, and that choosing updates the draft without booking. Inspire me and More ideas never select automatically. Keep free-text input available for other destinations. After an explicit choice, return focus to the message field or the review heading when the brief is complete.
- Let the user edit structured values without restarting the conversation.
- Present budget explicitly as **per person** near both input and review value.
- Keep brand and party type aligned without asking users to resolve internal mappings.
- Distinguish conversational text from validated Planner state.
- Do not enable continuation until required fields satisfy the shared contract.
- Preserve a valid draft across refresh using the versioned Planner storage contract.
- Closing and reopening resumes the current brand's draft. Keep an obvious **New trip** action available in both collection and review states; it starts fresh only after that explicit action and must not delete Saved Trips.
- Review mode exposes clear **Edit**, **Save changes**, and **Cancel editing** actions. Cancel restores the last validated values, continuation stays disabled while editing or invalid, and field-specific validation remains adjacent to the affected control.

Saved preference updates show the saved and draft versions side by side on wider screens and stacked on mobile. Use visible Update saved preferences or Remove saved preferences labels, with explicit replacement/removal and shared-link impact copy before the action. Loading, failure, conflict and successful alignment must have readable status text. On conflict, reload the current saved version for comparison and require another click; never overwrite automatically. Controls wrap at narrow widths and keep a minimum height of 44 px. No autosave or booking implication.

The AI must not appear to have completed a booking or verified provider availability when it has only updated intent.

## Saved Trip and Trip Hub UI

Saved Trip surfaces summarize durable planning context and coordination state, not provider booking records.

- The Dashboard should route users into the dedicated Trip Hub rather than recreating provider workflows inside each trip card.
- The Trip Hub may expose a manual organization checklist for flights, hotels, and activities.
- Checklist state means only that the owner marked an item as handled; it must never be presented as provider-verified booking status.
- Checklist state for authenticated Saved Trips is durable account-owned coordination state and should survive browser/device changes.
- The checklist is still manual user state, not provider evidence; persistence must not make it look provider-verified.
- Use **Travel Options / Opzioni di viaggio** for the current partner-handoff surface. Avoid user-facing “checkout” language for travel.
- Sharing remains read-only and must not expose the owner's private organization checklist state.

## Provider UI

The current Travel Options surface is handoff-only: ByeBi does not display live flight or hotel inventory.

Each current travel handoff should communicate:

- the external provider name;
- the route or destination context being handed off;
- relevant dates and party size when useful;
- that prices and availability are confirmed on the external provider;
- that the next action opens an external site.

Do not show selectable flight/hotel result cards, internal price labels, or availability badges unless a verified live provider integration exists. If live Provider Results are reintroduced later, selection styling means “chosen in ByeBi,” never “reserved,” and freshness/price scope must be explicit.

## Loading, error, and empty states

### Loading

- Preserve layout to minimize shift.
- Use skeletons for structured result lists and spinners for short, localized actions.
- State what is loading when delay affects the user's decision.
- Disable duplicate submission while preserving context.

### Error

- Explain what failed in user terms without leaking provider payloads or internals.
- Preserve valid Planner input and unaffected provider sections.
- Offer retry only when retry is meaningful.
- Never replace provider failure with invented results.

### Empty

- Distinguish no matching results from provider unavailable and unsupported destination.
- Suggest a concrete next action: adjust inputs, retry, explore alternatives, or use an identified provider search.
- Avoid dead ends and generic “something went wrong” copy when a specific state is known.

## Price semantics

Price labels must state what the number represents.

- Planner budget: **per person**.
- Current Travel Options do not display live flight or hotel prices inside ByeBi; users verify current prices on Aviasales and Booking.com.
- GetYourGuide prices, when visited through the destination handoff, are owned by GetYourGuide and are not represented as ByeBi inventory.
- Merchandise is a separate commerce flow; show item, shipping, and total amounts according to Stripe/Printful requirements.
- If a verified live travel provider is integrated in the future, every displayed price must name its provider context and explicit scope, and stale values must not be presented as current.

Never derive an unlabeled group total from `budgetPerPerson`, and never compare differently scoped prices as though they were equivalent.

## External handoff presentation

- Name the destination in the CTA, for example “Continue on Aviasales.”
- Open approved providers through the existing safe external-navigation path.
- Use `target="_blank"` with safe `rel` attributes where an anchor is appropriate.
- Show affiliate disclosure when the link may be monetized.
- Track the provider click without delaying navigation.
- Do not display ByeBi success or booking confirmation after redirect initiation.

## Localization

All product copy uses translation keys from `client/src/locales/it.json`, `en.json`, and `es.json`.

- Add or change equivalent keys in all three files.
- Design for text expansion and wrapping.
- Do not build sentences from fragments with language-specific order assumptions.
- Format dates, numbers, and currency for the active locale while preserving canonical values.
- Keep provider names and canonical domain enums stable across locales.

## Component reuse

- Prefer primitives in `client/src/components/ui/` and existing product components.
- Extend semantic variants before duplicating markup with page-specific colors.
- Shared behavior belongs in one component or hook; brand content belongs in props, tokens, or data.
- Keep provider link construction, analytics, state validation, and authorization out of visual components when a dedicated boundary exists.
- New reusable components require accessible states and representative tests.

Existing bespoke surfaces are implementation evidence, not permission to copy legacy patterns into new work.

### Optional budget editor in Planner review

Keep allocation controls in a collapsible section outside the brief form. Label all six inputs in EUR per person for the whole trip; preserve blank versus zero and validate whole non-negative euros up to 100,000. Distinguish unsaved preview from confirmed local save; focus the summary after success. Use text for incomplete state, unknown cap and excess, never color alone. Show old and current context when review is required and preserve values until explicit confirmation. A storage conflict preserves unsaved fields and offers explicit reload. Save/replacement, clear-fields and reload controls wrap at mobile widths and have at least 44px touch targets. Explain device-only persistence in IT/EN/ES, including at the Saved Trip boundary.

### Candidate image covers

Use the supplied image URL when valid, with a readable overlay identifying its URL host. This names the image host, not its author or licensing status. Keep the image decorative when the card title already identifies the candidate. On missing/failed images use the existing category illustration and explicit illustrative label; do not substitute unrelated hotel or activity photos. Keep the image host contained on narrow screens with truncation and full host available as its title. The editor explains metadata, manual replacement and fallback in all three languages.

### Google sign-in entry and callback

Use one localized Continue with Google control above the login/register tabs, at least 48px high, with the unmodified official Google G asset on white. The asset is embedded locally, not requested from Google before click. Preserve standard Google colors rather than recoloring by ByeBro/ByeBride. Keep a visible focus ring, wrapping text and an accessible pending label. Temporarily disable password/register submission during OAuth start and suppress repeated clicks. On failure show a short localized message and retain email/password access. Explain that returning after authentication does not save a trip. Callback progress and errors use status/alert roles and offer a clear retry link. Final branding/typography and real-provider UX must be validated before enabling the feature externally.

### Trip Hub budget and program

Expose clearly named Budget and Program sections in the existing Trip Hub, in a single mobile column and two-column budget fields on wider screens. Keep EUR/per-person/whole-trip semantics adjacent to controls and distinguish planning from actual Splitta expenses. Show allocated, remaining, excess and derived group cap, including incomplete/unknown states. Group activities by localized day and order morning/afternoon/evening; reuse the labeled activity form, optional duration and editorial ideas. An occupied slot never replaces another activity.

Changes to fields and activity actions remain unsaved until the explicit Save budget and program action. Show pending, saved, error and conflict text; preserve drafts on failure. Reload explicitly discards edits and fetches saved data. State owner-only cross-device persistence and exclusion from shared links. Offer local import only before first save, with a full preview and identity warning, followed by explicit use and save; keep local data intact. Controls wrap and have minimum 44px touch targets.

### AI program review in Trip Hub

Place the optional AI proposal action within Program, adjacent to the existing unverified-editorial copy. Show localized pending/error states (including no free slots and rate limiting), an explicit OpenAI data-use disclosure, and a focused review heading followed by every proposed date, named slot and catalog title. Explain that confirmation adds unsaved changes and that persistence requires Save budget and program. Offer explicit confirm and discard controls, with wrapping text and minimum 44px touch targets. Keep existing activities visible and editable through the established form after confirmation. Discard previews when the input context changes; block confirmation during conflicts or activity editing. Keep all copy aligned in IT/EN/ES, with the same behavior across brands.
