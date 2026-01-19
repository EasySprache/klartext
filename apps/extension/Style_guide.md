# KlarText Extension - style guide

The extension has been designed to match the accessible UI's color palette.

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

#### Details

- **Header:** `linear-gradient(135deg, hsl(220 45% 25%) 0%, hsl(174 50% 35%) 100%)` (Navy to teal)
- **Primary Button:** `background: hsl(220 45% 25%)` (Dark navy)
- **Button Hover:** `background: hsl(174 50% 35%)` (Teal)
- **Focus Outline:** `outline: 3px solid hsl(16 80% 60%)` (Coral)
- **Loading Spinner:** `border-top-color: hsl(174 50% 35%)` (Teal)
- **Background:** `background: hsl(45 30% 96%)` (Warm cream)
- **Text:** `color: hsl(220 40% 13%)` (Dark blue-gray)
- **Base Font Size:** `18px` (for better accessibility)

## Accessibility Features:

- **High Contrast Mode**
- **Reduced Motion Support** - Preserved  
- **Focus Indicators** - Updated to coral accent color  
- **WCAG AA Contrast** - All color combinations meet standards  
- **Touch Target Sizes** - Minimum 48px maintained
