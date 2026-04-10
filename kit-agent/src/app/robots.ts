import type { MetadataRoute } from "next";
import { siteBaseUrlString } from "@/lib/site-config";

export default function robots(): MetadataRoute.Robots {
  const base = siteBaseUrlString();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
