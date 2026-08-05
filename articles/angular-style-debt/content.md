---
title: Seamlessly addressing style debt in a large Angular application
subtitle: Themes and feature flags, mid-migration
date: 2020-09-10
external: https://medium.com/@prajno/seamlessly-addressing-style-debt-in-a-large-angular-application-using-themes-and-feature-flags-ef138bca1194
source: Medium
readtime: 5 min
image: images/style-debt-hero.jpeg
description: Rolling out a new grid, font, and scale across a feature-heavy Angular app mid-migration — using themes and feature flags to do it without a big-bang release.
archive: true
---

*From 2020, mid-migration at One Medical:*

The patient chart in One Medical's Electronic Health Record system is our most feature-heavy in-house single page application. It is currently undergoing an upgrade from AngularJS to Angular, with a migration strategy that involves rewriting product features in angular and downgrading them to AngularJS at runtime. Throughout this transition, we aggressively tackled various flavors of tech debt including state management complexities, nested forms, routing and UX issues, etc. We also setup an internal component library and documented these reusable components in storybook. Somewhere in the mix of all these things, the related style debt *did not* receive much attention.

About half way through the migration, the design team requested a move to a standard grid system and a different font and scale which would support a greater design system endeavor. Naturally, such a challenge midway through an epic migration project seemed like just the right amount of fun to tackle. So began our journey into addressing style debt.
