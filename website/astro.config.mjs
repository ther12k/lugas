import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  site: "https://ther12k.github.io",
  base: "/lugas",
  integrations: [
    starlight({
      title: "Lugas",
      description: "Explicit, Bun-native typed HTTP APIs — without runtime proxies, code generation, or production dependencies.",
      logo: { src: "./public/lugas-logo.svg" },
      social: [
        { icon: "github", label: "GitHub", href: "https://github.com/ther12k/lugas" },
      ],
      components: {
        // Header-right navigation: Docs / Examples / API links + the
        // default social icons (GitHub). See src/components/SocialIcons.astro.
        SocialIcons: "./src/components/SocialIcons.astro",
      },
      sidebar: [
        { label: "Start", items: ["getting-started", "examples"] },
        { label: "Guides", items: ["routing", "validation", "guards", "responses", "services", "client", "testing", "ai-agents"] },
        { label: "Features", items: ["cors", "sse", "websockets", "cookies", "logging", "openapi", "drizzle", "production", "uploads"] },
        { label: "Concepts", items: ["wire-honest-types", "design-principles", "choosing-lugas"] },
        { label: "Reference", items: ["api-reference", "diagnostics", "manifest-v1", "client-error-semantics", "compatibility"] },
        { label: "Project", items: ["roadmap"] },
      ],
    }),
  ],
});
