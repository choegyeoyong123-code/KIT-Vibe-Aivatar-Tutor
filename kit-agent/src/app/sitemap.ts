import type { MetadataRoute } from "next";
import { siteBaseUrlString } from "@/lib/site-config";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteBaseUrlString();
  const paths = ["", "/dashboard", "/avatar-lecture", "/media-studio", "/visual-lab"] as const;

  return paths.map((path) => ({
    url: path ? `${base}${path}` : base,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: path === "" || path === "/dashboard" ? 1 : 0.85,
  }));
}
