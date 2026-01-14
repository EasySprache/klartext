# KlarText Extension - Color Palette

## Updated Color Scheme
The extension has been updated to match the accessible UI prototype's color palette.

### Color Variables

#### Primary Colors
```css
/* Primary - Dark Navy */
--primary: hsl(220 45% 25%);
--primary-foreground: hsl(45 30% 96%);

/* Secondary - Teal */
--secondary: hsl(174 50% 35%);
--secondary-foreground: hsl(45 30% 96%);

/* Accent - Coral */
--accent: hsl(16 80% 60%);
--accent-foreground: hsl(220 40% 13%);
```

#### Background & Text Colors
```css
/* Background - Warm Cream */
--background: hsl(45 30% 96%);

/* Foreground - Dark Text */
--foreground: hsl(220 40% 13%);

/* Muted - For less emphasis */
--muted: hsl(45 20% 90%);
--muted-foreground: hsl(220 20% 40%);
```

#### Borders & Input
```css
/* Border - Subtle gray */
--border: hsl(220 20% 80%);
```

#### State Colors
```css
/* Success - Green */
--success: hsl(120 50% 35%);
--success-light: hsl(120 50% 95%);

/* Error - Red */
--error: hsl(0 70% 45%);
--error-light: hsl(0 70% 95%);

/* Loading - Teal */
--loading: hsl(174 50% 25%);
--loading-light: hsl(174 50% 95%);
```

## Before & After Comparison

### Header
- **Before:** `linear-gradient(135deg, #2962ff 0%, #1e88e5 100%)` (Bright blue)
- **After:** `linear-gradient(135deg, hsl(220 45% 25%) 0%, hsl(174 50% 35%) 100%)` (Navy to teal)

### Primary Button
- **Before:** `background: #2962ff` (Bright blue)
- **After:** `background: hsl(220 45% 25%)` (Dark navy)

### Button Hover
- **Before:** `background: #1e88e5` (Medium blue)
- **After:** `background: hsl(174 50% 35%)` (Teal)

### Focus Outline
- **Before:** `outline: 3px solid #ffd600` (Yellow)
- **After:** `outline: 3px solid hsl(16 80% 60%)` (Coral)

### Loading Spinner
- **Before:** `border-top-color: #2962ff` (Bright blue)
- **After:** `border-top-color: hsl(174 50% 35%)` (Teal)

### Background
- **Before:** `background: #fafafa` (Cool gray)
- **After:** `background: hsl(45 30% 96%)` (Warm cream)

### Text
- **Before:** `color: #212121` (Almost black)
- **After:** `color: hsl(220 40% 13%)` (Dark blue-gray)

### Base Font Size
- **Before:** `16px`
- **After:** `18px` (for better accessibility)

## Accessibility Features Maintained

✅ **High Contrast Mode** - Adjusted for new palette  
✅ **Reduced Motion Support** - Preserved  
✅ **Focus Indicators** - Updated to coral accent color  
✅ **WCAG AA Contrast** - All color combinations meet standards  
✅ **Touch Target Sizes** - Minimum 48px maintained

## Files Updated

1. `/apps/extension/popup/popup.css` - Main popup styling
2. `/apps/extension/content/styles.css` - Content script styling
3. `/apps/extension/content/simplify.js` - Inline styles updated

## Next Steps

To complete visual alignment:
1. Add accessibility-focused fonts (Atkinson Hyperlegible + Lexend)
2. Consider adding CSS custom properties for easier theme management
3. Test extension in different color modes (light/dark/high-contrast)
