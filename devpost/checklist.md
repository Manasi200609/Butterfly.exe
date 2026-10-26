---
doc: checklist
status: draft
---

# Build Checklist

Build mode: fast (retrospective record of the already implemented proof of concept)

## Slices

- [x] **1. City experiment loop**
  Becomes usable: A user selects City, sees its starting state, closes a road, runs paired scenarios, compares measured traffic and inspects evidence.
  Why now: This is the proof-of-concept kernel and the primary demonstration.
  PRD ref: `prd.md > The Core Journey`, `prd.md > City road-closure experiment`
  Spec ref: `spec.md > The Core Journey Through the System`, `spec.md > Components`, `spec.md > API Contract`
  Build: Implemented bounded City rules, supported closure intervention, paired baseline/modified run, measurements, event records, comparison and evidence display.
  Verify (mechanical): Previously reported production build success and 28 passing backend tests; City closure behavior is covered by the simulation tests. Results were not rerun during this documentation-only pass.
  Learner check: Pending final hands-on review; see `Hands-on Checkpoints`.
  Commit: Existing project history not available in this workspace copy.

- [x] **2. Ecosystem and Unknown worlds**
  Becomes usable: Users can switch to both additional worlds, apply supported model changes, and inspect simulation-backed state and measures.
  Why now: Completes the three-world discovery concept after proving the core loop.
  PRD ref: `prd.md > Ecosystem experiment`, `prd.md > Unknown experiment`
  Spec ref: `spec.md > Components`, `spec.md > Data Model`
  Build: Implemented bounded ecosystem resource/population rules and Unknown agent/resource/connection rules with trajectories, events and metrics.
  Verify (mechanical): Previously reported 28 passing backend tests and a passing production build. These checks were not rerun during this documentation-only pass.
  Learner check: Pending final hands-on review.
  Commit: Existing project history not available in this workspace copy.

- [x] **3. Native WebGL scenes and shared comparison experience**
  Becomes usable: The browser renders distinct interactive 3D worlds from API definitions and experiment output, with comparison, evidence and suggestions.
  Why now: Makes the measured consequences explorable rather than decorative.
  PRD ref: `prd.md > Screens and Layout`, `prd.md > Comparison, evidence, and suggestions`
  Spec ref: `spec.md > Components`, `spec.md > Look and Feel`
  Build: Implemented the shared React/Vite lifecycle and procedural native WebGL renderer; no Three.js or React Three Fiber is used.
  Verify (mechanical): Previously reported production build success and browser-based world/render/API verification. Browser verification was not repeated in this pass.
  Learner check: Pending final hands-on review.
  Commit: Existing project history not available in this workspace copy.

## Hands-on Checkpoints

- [ ] Early usable behavior explored — not recorded in this workspace.
- [ ] Final kick-the-tires exploration and feedback completed — learner should run the City closure journey and switch through Ecosystem and Unknown.

## Final Review

- [ ] Final review complete — learner feedback and readiness confirmation are still needed.

## Code Tour and App Map

- [ ] Learning activity complete — not recorded; do not infer completion from code/tests.
- [ ] Optional edit and transfer reflection addressed — not recorded.
- [ ] `devpost/app-map.html` generated from finished code, checked, and shown — not present.

Activity and evidence: Implementation exists in `server/src/simulation/` and `client/src/components/world3d/renderer.js`; prior reported evidence is recorded above. A learner code tour and map remain outstanding.
Route and stops: Pending guided code tour through the experiment request, paired simulation, surprise evidence, and client scene mapping.
Edit outcome: Not attempted.
Reflection: Not offered in this pass.
Activity mode: Pending.

## Submission

- [ ] **Public repository** — create or use a GitHub repository, inspect tracked files and history for secrets/private material, keep `devpost/learner-profile.md` private, rotate the credentials formerly present in `server/.env.example`, and verify the repository URL is publicly readable. No Git metadata or public repository is present in this workspace copy.
- [ ] **Demo video** — record an accessible video under 3 minutes that shows the City baseline, road closure, modified result, measured comparison and evidence; briefly show the other worlds. Check the actual Devpost form's accepted format and visibility.
- [ ] **Project description** — learner writes the project name and short description in their own words.
- [ ] **Submission questions** — learner completes all required fields in the current Devpost form and the exit survey; do not reuse the entry survey.
- [ ] **Submit** — provide the public GitHub URL and accessible demo video, complete the form and exit survey, then submit on Devpost. Deployment and peer feedback are optional.

## Revisions
