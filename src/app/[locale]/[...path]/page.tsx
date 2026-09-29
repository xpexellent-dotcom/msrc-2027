import { notFound } from "next/navigation";

// No operational or editorial route is exposed by the M1 preview.
export default function UnavailablePage() {
  notFound();
}
