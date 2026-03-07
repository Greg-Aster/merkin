---
title: Temporal Flow Updates
journalTitle: Release Notes
labels:
  status: Status
  location: Channel
  section: Focus
  mileage: Version
  nextStop: Next
  updated: Updated
current:
  status: Active development
  location: Core template
  updated: 2026-03-06
  mileage: "v0.0.1"
  section: Shared layout and content systems
  nextStop: Docs cleanup and onboarding polish
  note: >
    Short release notes, implementation notes, and project news live here.
---

Temporal Flow is evolving into a stronger shared publishing base for the rest of the monorepo.
This feed is for smaller release notes, platform fixes, and current work that does not need a full article.

## 2026-03-06 | Shared right rail and banner pass
Location: Core template
Mileage: v0.0.1

Enabled the shared right-rail system so the homepage can carry lightweight project updates without changing the overall shell layout.
This same pass also stabilized banner behavior during Swup navigation so post pages keep their intended visual identity when moving between routes.

## 2026-03-05 | Updates feed foundation
Location: Content system
Mileage: v0.0.1

Added support for a markdown-driven updates feed that works both as a compact sidebar widget and as a full archive page.
That gives the site a place for release notes, shorter announcements, and in-between notes without turning every small update into a full post.
