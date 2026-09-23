import Link from "next/link";
export default function NotFound() {
  return (
    <div className="page-wrap inner-page page-heading">
      <p className="eyebrow">404</p>
      <h1>Nothing remembered here.</h1>
      <p>The entity or meeting could not be found.</p>
      <Link href="/" className="button-link">
        Return home
      </Link>
    </div>
  );
}
