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
- Secondary: explore or compare.

On provider-option surfaces:

- Primary: the next explicit action for the selected option.
- That action may be an external partner handoff.

External actions must name the provider, show an external-link cue when useful, and never imply internal ByeBi booking. A page may have several provider actions, but the current decision should remain visually dominant.

## Cards

Use the shared Card primitive and its variants:

- `default` — static grouped information.
- `interactive` — selectable or navigable content with hover/focus affordance.
- `selected` — the user's explicit current selection.

Clickable cards need keyboard-equivalent interaction. Keep the click target unambiguous; avoid nesting conflicting controls. Use consistent order for title, descriptive metadata, price/status, and action.

## Planner UI

The Planner collects intent progressively and ends in a reviewable travel brief.

- Show which fields are known, missing, or invalid.
- Let the user edit structured values without restarting the conversation.
- Present budget explicitly as **per person** near both input and review value.
- Keep brand and party type aligned without asking users to resolve internal mappings.
- Distinguish conversational text from validated Planner state.
- Do not enable continuation until required fields satisfy the shared contract.
- Preserve a valid draft across refresh using the versioned Planner storage contract.

The AI must not appear to have completed a booking or verified provider availability when it has only updated intent.

## Provider UI

Provider options are evidence-backed, external choices.

Each result or handoff should communicate, when available:

- provider name;
- route, property, activity, or option identity;
- relevant dates and party size;
- price and currency with explicit scope;
- live, unavailable, or incomplete data status;
- whether the next action opens an external site.

Selection styling means “chosen in ByeBi,” not “reserved.” Do not use confirmation language, checkmarks, or success colors in a way that implies an external booking has completed.

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
- Flight result: provider-reported fare and currency; identify per-person or party scope from the contract before display.
- Hotel result: provider-reported `priceTotal`, displayed as the total stay for the contract's explicit quoted occupancy. When the quote covers fewer people than the Planner group, state that it is not the full-group total.
- Merchandise: separate commerce flow; show item, shipping, and total amounts according to Stripe/Printful requirements.
- Estimates are labeled estimates; live results are labeled with provider context; stale values are not presented as current.

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
