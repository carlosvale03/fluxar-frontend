import type { MetadataRoute } from "next"

// AZ-06: manifesto do Azimute, com as cores do tema escuro
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Azimute",
    short_name: "Azimute",
    description: "Rumo exato para o seu dinheiro.",
    start_url: "/",
    display: "standalone",
    background_color: "#07090F",
    theme_color: "#07090F",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  }
}
