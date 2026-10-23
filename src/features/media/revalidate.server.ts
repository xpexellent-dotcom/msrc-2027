import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";
import { mediaArchiveTag } from "./published.server";

/** Publish, withdrawal and archive ordering must expire the public projection immediately. */
export function revalidatePublishedMedia() {
  revalidateTag(mediaArchiveTag, { expire: 0 });
  for (const locale of ["en", "ar"]) revalidatePath(`/${locale}/media`);
}
