# Design Checklist

Use this checklist when creating or updating UI designs.

## Pre-Design

- [ ] Review existing implementation in `src/frontend/pages/`
- [ ] Check Oiduna API capabilities (what data is available)
- [ ] Review Monaco Editor integration requirements
- [ ] Consider responsive breakpoints (if applicable)

## Design Phase

### Common Elements

- [ ] Navigation bar (consistent across all pages)
- [ ] Page header with title
- [ ] Dark theme colors (gray-900 background)
- [ ] Proper spacing (Tailwind spacing scale)
- [ ] Focus states for keyboard navigation

### Live Page

- [ ] Monaco Editor container (full-screen or split)
- [ ] Transport controls (Play, Stop, Pause buttons)
- [ ] BPM display
- [ ] Step/Bar position indicator
- [ ] Compile button
- [ ] Status indicators (playing/stopped/error)

### Studio Page

- [ ] Song list/tree view
- [ ] Clip editor panel
- [ ] Metadata fields (name, description, tags)
- [ ] Create/Delete/Duplicate actions
- [ ] Color picker for clips

### Setlist Page

- [ ] Clip grid/list view
- [ ] Clip preview panel
- [ ] Filter/search bar
- [ ] Apply to Live button
- [ ] Tag filtering

### Monitor Page

- [ ] Playback status card
- [ ] Step grid visualization (16 steps)
- [ ] Active tracks display
- [ ] BPM/timing information
- [ ] SSE connection status

### Settings Page

- [ ] Project settings form
- [ ] Oiduna connection configuration
- [ ] API URL input
- [ ] Connection test button
- [ ] Status indicators (connected/disconnected)

## Export Phase

- [ ] Export all pages at 1920x1080 minimum
- [ ] Save as PNG to `screens/`
- [ ] Use descriptive filenames (e.g., `live.png`, `studio.png`)
- [ ] Verify exported images are legible

## Documentation

- [ ] Update `design/README.md` if design principles change
- [ ] Add notes about design decisions in PR description
- [ ] Reference designs in related implementation issues

## Review

- [ ] Design is consistent with Tailwind CSS utilities
- [ ] All interactive elements have hover/focus states
- [ ] Text is readable (sufficient contrast)
- [ ] Layout works at common screen sizes
- [ ] Design supports future features (extensibility)

## Commit

- [ ] Commit both `.ep` source files and exported images
- [ ] Write clear commit message describing changes
- [ ] Link to relevant issues or PRs
