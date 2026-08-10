# Logo Installation Instructions

## ShellByTheShore.com Logo

The website is configured to use the ShellByTheShore.com logo.

### Installation Steps:

1. Save the logo image file as: `public/logo.png`
   - The logo should be in PNG format with transparent background
   - Recommended dimensions: 800x200px or similar wide format
   - The logo will be displayed at approximately 192x48px in the header

2. Alternative formats supported:
   - If you prefer SVG: save as `public/logo.svg` and update the image src in:
     - `app/(marketing)/page.tsx` (line 35 and line 332)

### Current Logo Locations:

The logo appears in two places:
- **Header**: Top navigation bar (fixed position)
- **Footer**: Bottom of the page

### Logo Specifications:

- **Header size**: 192px wide × 48px tall
- **Footer size**: 160px wide × 40px tall
- **Format**: PNG with transparent background (or SVG)
- **Color**: The logo design includes coral/orange shell with navy blue text

### After Installing the Logo:

1. Restart the development server if running
2. Clear browser cache if the logo doesn't appear immediately
3. The logo will automatically scale responsively on mobile devices

---

**Note**: The code is already configured to use `/public/logo.png`. Simply place your logo file in the public folder and it will appear automatically.
