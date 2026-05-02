---
name: Enterprise Core
colors:
  surface: '#f5faff'
  surface-dim: '#d4dbe1'
  surface-bright: '#f5faff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eef4fb'
  surface-container: '#e8eff5'
  surface-container-high: '#e2e9f0'
  surface-container-highest: '#dde3ea'
  on-surface: '#161c21'
  on-surface-variant: '#4e444a'
  inverse-surface: '#2a3136'
  inverse-on-surface: '#ebf1f8'
  outline: '#80747a'
  outline-variant: '#d1c3ca'
  surface-tint: '#79526f'
  primary: '#57344f'
  on-primary: '#ffffff'
  primary-container: '#714b67'
  on-primary-container: '#f0bfe0'
  inverse-primary: '#e9b8d9'
  secondary: '#006a68'
  on-secondary: '#ffffff'
  secondary-container: '#7cf2ee'
  on-secondary-container: '#006e6c'
  tertiary: '#593a00'
  on-tertiary: '#ffffff'
  tertiary-container: '#784f00'
  on-tertiary-container: '#ffc36b'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffd7f1'
  primary-fixed-dim: '#e9b8d9'
  on-primary-fixed: '#2f1029'
  on-primary-fixed-variant: '#5f3b56'
  secondary-fixed: '#7ff5f1'
  secondary-fixed-dim: '#60d9d5'
  on-secondary-fixed: '#00201f'
  on-secondary-fixed-variant: '#00504e'
  tertiary-fixed: '#ffddb2'
  tertiary-fixed-dim: '#ffb94c'
  on-tertiary-fixed: '#291800'
  on-tertiary-fixed-variant: '#624000'
  background: '#f5faff'
  on-background: '#161c21'
  surface-variant: '#dde3ea'
typography:
  h1:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  h2:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  h3:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  margin: 24px
---

## Brand & Style
The brand personality of this design system is rooted in reliability, modularity, and operational efficiency. It is designed for enterprise environments where data density must coexist with visual clarity. The target audience includes business owners, administrators, and power users who require a tool that feels "invisible" yet powerful.

The chosen style is **Corporate / Modern**. It leverages a balanced layout and professional aesthetics inspired by the Odoo ERP ecosystem. It prioritizes functional aesthetics over decorative flourishes, ensuring that the interface evokes a sense of trust and structured logic. The focus is on a clean, light-filled environment that reduces cognitive load during complex task management.

## Colors
The color palette is anchored by the signature Odoo purple (#714B67), used primarily for brand touchpoints, primary actions, and active navigation states. To balance the depth of the purple, the system utilizes a secondary teal (#00A09D) for positive reinforcements and specific action highlights, and a tertiary amber (#E9A01C) for warnings and attention-seeking elements.

The neutral palette is composed of soft greys and high-contrast whites. Backgrounds utilize very light grey tints to define functional zones without the harshness of pure white. Success and error states are rendered with subtle, desaturated versions of green and red to maintain a professional, calm atmosphere even during system alerts.

## Typography
This design system utilizes **Inter** for all typographic levels to ensure maximum readability and a systematic, utilitarian feel. Inter’s tall x-height and neutral character make it ideal for the high-density data tables and complex forms found in ERP systems.

Headlines use tighter letter spacing and heavier weights to provide clear hierarchy. Body text is optimized for long-form reading with generous line heights. Labels are intentionally kept crisp and sometimes capitalized to distinguish them from user-generated content and input data.

## Layout & Spacing
The layout follows a **fluid grid** philosophy, allowing the interface to adapt seamlessly across various screen sizes—crucial for a browser-based ERP experience. A 12-column grid system is used for dashboard layouts, while form views typically adopt a 2-column or 4-column stack depending on the container width.

The spacing rhythm is based on an **8px base unit**. This ensures consistent alignment and modularity across all components. For dense data views, a 4px "compact" increment is permitted. Gutters are fixed at 16px to maintain clear separation between cards and columns, while global page margins are set to 24px to provide the content with room to breathe.

## Elevation & Depth
Depth is conveyed through a combination of **tonal layers** and **ambient shadows**. The design system avoids high-contrast shadows in favor of soft, diffused blurs that suggest a subtle lift from the background. 

Primary canvas backgrounds are slightly off-white (#F8F9FA), while interactive "Cards" are pure white. Shadows are reserved for floating elements like dropdowns, modals, and active card states. The shadow character is extremely light (5-10% opacity) with a large blur radius to prevent the UI from feeling "heavy." Low-contrast outlines (1px solid #DEE2E6) are used to define boundaries for form inputs and table rows where elevation is not required.

## Shapes
The shape language is characterized by **Soft** roundedness. A standard corner radius of 4px (0.25rem) is applied to buttons, input fields, and small UI elements to provide a professional and modern look without appearing overly playful or "bubbly."

Larger containers, such as cards and modals, utilize an 8px (0.5rem) radius to soften the overall interface. This subtle rounding helps to differentiate distinct modules within the ERP ecosystem while maintaining the rigorous alignment expected in enterprise software.

## Components
- **Buttons:** Primary buttons use the brand purple (#714B67) with white text. Secondary buttons are outlined or use a soft grey ghost style. Transitions should be subtle, with a slight darkening of the background on hover.
- **Form Fields:** Characteristic of the Odoo aesthetic, fields should have a clean, bottom-aligned or fully boxed border. When active, the border transitions to the brand purple with a 1px thickness. Labels are placed above the field in a smaller, semi-bold font.
- **Cards:** Cards are the primary container for data modules. They feature a pure white background, a 1px light grey border, and a very soft ambient shadow. 
- **Navigation:** A vertical sidebar for main app switching uses a dark, desaturated version of the brand palette for high contrast. A horizontal top bar manages breadcrumbs and user actions, using a clean white surface with a bottom border.
- **Chips & Tags:** Small, rounded badges used for status (e.g., "Draft," "Confirmed"). They should use desaturated background tints of the status color (success/error/warning) with high-contrast text.
- **Data Tables:** High-density rows with subtle zebra striping. Hover states on rows are essential for navigation clarity in large datasets.