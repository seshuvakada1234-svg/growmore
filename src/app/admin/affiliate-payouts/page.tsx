import dynamic from "next/dynamic";

const AdminAffiliatePayouts = dynamic(
  () => import("./AdminAffiliatePayouts"),
  { ssr: false }
);

export default function Page() {
  return <AdminAffiliatePayouts />;
}
