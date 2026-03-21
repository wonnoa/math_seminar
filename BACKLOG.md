# Journey Map Backlog

Linear Algebra journey map page backlog.

## Current State

- Static journey map layout is implemented
- Chapter cards and center nodes are visually themed
- Section rows support `Not Started -> In Progress -> Done`
- Section progress is stored in `localStorage`
- `Review Exercises` are shown as optional and are not tracked

## P0

- [ ] Remove the chapter-card shake or lift reaction when a section row is clicked
- [ ] Remove the explicit `Idle` status pill from section rows and express inactive state through the section card color only
- [ ] Rework the overall color theme for the page so the journey map feels more cohesive
- [ ] Add a `Reset Progress` action to clear all saved section states
- [ ] Add a small legend explaining the three section states
- [ ] Improve mobile layout for long section titles and status pills
- [ ] Make the current progress summary more obvious near the top of the page
- [ ] Prevent accidental progress changes by adding a subtle interaction hint or confirmation pattern

## P1

- [ ] Add chapter-level progress bars based on tracked sections
- [ ] Add collapse/expand behavior for chapter cards to reduce scroll length
- [ ] Add filtering controls for `All`, `Doing`, and `Done`
- [ ] Add a quick jump list for chapters with progress counts
- [ ] Highlight the first unfinished section in each chapter

## P2

- [ ] Add export/import for progress data
- [ ] Support multiple study profiles or books
- [ ] Add chapter notes or short reflections
- [ ] Add a study streak or last-updated timestamp
- [ ] Add soft completion animations for sections and chapters

## Later Ideas

- [ ] Link each section to its own detail page or study note
- [ ] Add AI-assisted explanations from the journey map
- [ ] Add estimated difficulty or study time per section
- [ ] Add calendar-based study planning
- [ ] Turn the journey map into a reusable template for other textbooks

## Non-Goals For Now

- Authentication
- Server-side persistence
- Collaboration
- Full LMS-style dashboard
