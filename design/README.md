# MARS UI Design

UI design files for MARS for Oiduna client.

## Tools

- **Pencil Project**: Open-source UI mockup tool
- Download: https://pencil.evolus.vn/

## Files

- `*.ep`: Pencil project files (UI mockups)
- `screens/`: Exported PNG screenshots for quick reference

## Pages

The MARS client consists of 5 main pages:

1. **Live** (`/live`): Monaco-based live coding editor with transport controls
2. **Studio** (`/studio`): Project composition and clip management
3. **Setlist** (`/setlist`): Clip browser and scene management for live performance
4. **Monitor** (`/monitor`): Real-time playback status dashboard with SSE updates
5. **Settings** (`/settings`): Project settings and Oiduna connection configuration

## Design Principles

- **Dark theme**: Consistent with Monaco Editor and livecoding aesthetics
- **Minimal chrome**: Focus on content, reduce UI clutter
- **Tailwind CSS compatible**: Designs align with Tailwind utility classes
- **Information density**: Optimize for professional live performance use
- **Accessibility**: Consider color contrast, keyboard navigation

## Workflow

### Creating/Updating Designs

1. Open Pencil and edit `.ep` files
2. Export updated screens to `screens/` as PNG
   - File naming: `{page-name}.png` (e.g., `live.png`)
   - Resolution: 1920x1080 or higher
3. Commit both `.ep` source files and exported images
4. Reference designs in PRs or implementation issues

### Exporting from Pencil

- **Format**: PNG (for documentation) or PDF (for print)
- **Quality**: High resolution, no compression
- **Naming**: Use descriptive names matching page routes

## Design Assets

### Color Palette (Tailwind Dark)

```
Background:  #1E1E1E (gray-900)
Surface:     #2D2D2D (gray-800)
Border:      #3F3F3F (gray-700)
Text:        #E5E5E5 (gray-100)
Muted:       #A3A3A3 (gray-400)
Accent:      #3B82F6 (blue-500)
Success:     #10B981 (green-500)
Warning:     #F59E0B (amber-500)
Error:       #EF4444 (red-500)
```

### Typography

- **Monospace**: Monaco Editor default (Consolas, Menlo, Monaco)
- **UI Text**: System fonts (Tailwind default stack)
- **Font sizes**: Tailwind scale (text-sm, text-base, text-lg, etc.)

## Integration with Code

Designs in `screens/` can be referenced in:
- Implementation documentation
- Component development issues
- Pull request descriptions
- User documentation

Example reference:
```markdown
![Live Page Design](design/screens/live.png)
```

## Contributing

When proposing design changes:
1. Create a new branch
2. Update `.ep` files
3. Export new screenshots
4. Open PR with before/after comparisons
5. Discuss design decisions in PR comments

## License

Design files follow the same license as the MARS for Oiduna project (MIT).
