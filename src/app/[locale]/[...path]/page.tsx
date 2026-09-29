import { notFound } from "next/navigation";

// All destinations without an implemented page remain genuine 404s.
export default function UnavailablePage() {
  notFound();
}
