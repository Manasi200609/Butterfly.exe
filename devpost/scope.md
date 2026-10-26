---
doc: scope
status: draft
---

# Butterfly.exe

One line: Butterfly.exe is an interactive 3D discovery lab where curious learners change a rule in a simulated world and investigate the consequences measured by the simulation.

## The Unique Kernel

The worlds are evidence views of the actual simulation: users can trace a change from intervention to measured outcome, compare it with a baseline, and inspect recorded evidence instead of watching decorative animation or accepting guessed explanations. The current client renders its scenes with native WebGL; it does not use Three.js or React Three Fiber.

## Who It's For

Curious students, visual learners, and people interested in complex systems who do not need coding, advanced mathematics, or prior simulation experience. They want to understand how small changes can produce consequences they did not expect; how they learn about those relationships today is not established.

## The Core Loop

Choose a world, change one supported rule, run a seeded experiment, compare the modified result with its baseline, inspect what changed and the simulation evidence, then try another experiment.

## Inspiration & Identity

An interactive discovery lab that feels like exploring miniature, living worlds rather than using a conventional dashboard. Keep the existing Butterfly.exe dark editorial identity, with distinct visual character for the City, Ecosystem, and Unknown.

## Why This Matters to the Learner

The learner wants to practice a disciplined plan-first workflow, understand decisions behind generated code, and learn to connect performant interactive 3D environments to a real simulation engine.

## What "Working" Looks Like

In a short session, a first-time user can close a City road, run the experiment, compare baseline and modified traffic, and inspect recorded route, congestion, and travel measurements to understand what changed. The surprise should come from measured simulation outcomes, not fabricated events or explanation.

## The POC Boundary

Use three distinct interactive 3D views connected to the deterministic simulation and API. The required end-to-end demonstration is a City baseline, a road-closure intervention, a modified run from equivalent initial conditions, measured comparison, and inspection of route/event evidence. Keep Ecosystem and Unknown views grounded in their implemented state, supported interventions, events, and metrics. Preserve the shared experiment lifecycle, comparison, evidence, and follow-up suggestions. The implemented scenes use native WebGL and procedural geometry; no external assets are required.

## Later

Higher scientific fidelity, more simulation mechanics, more worlds, richer assets and animation beyond what the current simulation data supports, and deployment.

## Explicitly Cut

- Decorative 3D effects that do not correspond to returned state or results; they undermine the evidence-based kernel.
- Unsupported species, events, metrics, or causal claims; they would misrepresent the simulation.
- Replacing the backend or introducing paid external asset services; neither is needed to prove this concept.
