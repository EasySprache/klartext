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
- **Body Font:** `'Atkinson Hyperlegible', sans-serif`
- **Heading Font:** `'Lexend', sans-serif` (h1 element)

## Icons & Branding

The extension uses custom icons from `assets/icons/`:

- **tornado.png** - Brand logo (navy-to-teal gradient tornado/swirl)
  - Used in: Primary action button, Chrome extension icons (16px, 48px, 128px)
- **Klartext.png** - Purple document with arrows (simplification action)
  - Used in: Secondary button, Upload PDF feature link
- **Klartexticon1.png** - Blue document with checkmark (completed/verified)
  - Used in: Input Text feature link
- **Klartextsound.png** - Gold speaker icon (audio/TTS)
  - Used in: Text to Speech feature link
- **Klartextlogo.png** - Full wordmark with speech bubble
  - Used in: Marketing materials, headers (not currently in extension)

### Icon Styling
- Button icons: 20px × 20px, white filter for primary buttons
- Feature icons: 32px × 32px, original colors preserved
- All icons use `object-fit: contain` and `aria-hidden="true"`

## Accessibility Features:

- **High Contrast Mode**
- **Reduced Motion Support** - Preserved  
- **Focus Indicators** - Updated to coral accent color  
- **WCAG AA Contrast** - All color combinations meet standards  
- **Touch Target Sizes** - Minimum 48px maintained

---

## Web App (web-mvp) Theme

The web-mvp application uses the same design system with additional features for accessibility.

### Color System (CSS Variables)

```css
:root {
  /* Background & Surfaces */
  --background: 45 30% 96%;          /* Warm cream */
  --foreground: 220 40% 13%;         /* Dark blue-gray */
  --card: 45 25% 98%;                /* Lighter cream for cards */
  --card-foreground: 220 40% 13%;
  
  /* Brand Colors */
  --primary: 220 45% 25%;            /* Dark navy */
  --primary-foreground: 45 30% 96%;  /* Warm cream text */
  --secondary: 174 50% 35%;          /* Teal */
  --secondary-foreground: 45 30% 96%;
  --accent: 16 80% 60%;              /* Coral */
  --accent-foreground: 220 40% 13%;
  
  /* UI Elements */
  --muted: 45 20% 90%;
  --muted-foreground: 220 20% 40%;
  --border: 220 20% 80%;
  --input: 220 20% 80%;
  --ring: 220 45% 25%;               /* Focus ring (navy) */
  
  /* Semantic Colors */
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 100%;
}
```

### Typography

- **Body Font**: 'Atkinson Hyperlegible', sans-serif
- **Heading Font**: 'Lexend', sans-serif
- **Base Font Size**: 18px
- **Alternative Font**: 'Lexend' (for dyslexia-friendly mode)

### Accessibility Modes

#### Dark Mode
```css
.dark {
  --background: 220 40% 10%;
  --foreground: 45 30% 96%;
  --primary: 174 50% 45%;      /* Lighter teal for dark mode */
  --secondary: 45 40% 70%;     /* Cream/yellow */
}
```

#### High Contrast Mode
```css
.high-contrast {
  --background: 0 0% 100%;     /* Pure white */
  --foreground: 0 0% 0%;       /* Pure black */
  --primary: 0 0% 0%;
  --border: 0 0% 0%;
}
```

#### Dyslexia-Friendly Font
- Applies 'Lexend' font family
- Increased letter-spacing: 0.05em
- Increased word-spacing: 0.1em

#### Increased Spacing
- Line height: 2 (double spacing)

### Component Patterns

- **Buttons**: Minimum 48px height, clear focus states with coral outline
- **Cards**: Subtle background (`--card`) with rounded corners (0.75rem)
- **Forms**: Consistent border color, accessible focus rings
- **Skip Link**: Positioned absolutely, visible on keyboard focus
