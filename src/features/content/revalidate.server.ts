import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";
import type { ContentCollection } from "@/features/staff-portal/content-contract";

/** Route handlers need immediate expiry for withdrawal, not stale-while-revalidate. */
export function revalidatePublishedContent(collection: ContentCollection) {
  revalidateTag(`msrc-content:${collection}`, { expire: 0 });
  const routes: Record<ContentCollection, readonly string[]> = {
    speakers: ["", "/speakers", "/speakers/[slug]", "/program", "/program/[slug]"],
    sessions: ["", "/program", "/program/[slug]", "/speakers/[slug]", "/media"],
    partners: ["", "/sponsors"], team: ["/team"],
  };
  for (const locale of ["en", "ar"]) for (const route of routes[collection]) {
    if (route.includes("[slug]")) revalidatePath(`/${locale}${route}`, "page");
    else revalidatePath(`/${locale}${route}`);
  }
}
