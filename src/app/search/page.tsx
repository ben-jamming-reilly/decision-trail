import { QueryBox } from "@/components/query-box";

export default function SearchPage() {
  return (
    <div className="page-wrap inner-page">
      <div className="page-heading">
        <p className="eyebrow">Cross-meeting query</p>
        <h1>Ask across meetings</h1>
        <p>
          Results are claims, not generated answers. Every result links back to
          its evidence.
        </p>
      </div>
      <QueryBox full />
    </div>
  );
}
