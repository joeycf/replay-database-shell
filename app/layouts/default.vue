<script setup lang="ts">
/**
 * The shell's minimal chrome — OVERRIDES the engine's default layout at the
 * same path (Nuxt layer precedence). The engine layout carries the per-GAME nav
 * (Browse / Stats / Characters / Players) + the global SearchBox, none of which
 * belong on the umbrella shell: those routes render hollow here (no replay data)
 * and the selector must not advertise them (PLAN §5 prompt A.3 / A.5).
 *
 * The selector page itself uses `layout: false` and supplies its own hero; this
 * layout is what /health and the designed 404 (error.vue → NotFoundContent)
 * wear — just the umbrella wordmark (a link home) and the shared footer.
 */
</script>

<template>
  <div class="flex min-h-screen flex-col bg-bg font-ui text-text">
    <a href="#main" class="skip-link">Skip to content</a>

    <header
      class="sticky top-0 z-50 border-b border-border-subtle bg-surface-sunken/90 backdrop-blur"
    >
      <div class="flex items-center px-4 py-3 md:px-7 md:py-4">
        <BrandWordmark />
      </div>
    </header>

    <main id="main" class="flex-1">
      <slot />
    </main>

    <SiteFooter />
  </div>
</template>
