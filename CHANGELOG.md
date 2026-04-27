# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2026-04-27

### Fixed
- Security: Moved APPS_SCRIPT_SECRET from URL query params to HTTP headers (X-Secret)
- Cart: Added localStorage persistence for cart items
- SSR: Fixed hydration mismatch in cart and checkout pages
- Forms: Removed HTML5 required attributes to allow JavaScript validation
- API: Return 502 error when Sheets integration fails instead of silent failure

### Documentation
- Updated ARCHITECTURE.md with APPS_SCRIPT_SECRET environment variable

## [0.1.0] - 2026-04-27

### Added
- Initial Fastget MVP with Next.js 14
- Landing page with hero, categories, and how-it-works
- Product catalog with 20+ items across 5 categories
- Shopping cart with quantity controls
- Checkout form with urgent/scheduled delivery options
- Order status tracking page
- Agent portal for PIN-protected status updates
- Google Sheets integration scaffolding
