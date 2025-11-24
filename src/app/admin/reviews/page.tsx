export default function ReviewsPage() {
  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-4xl rounded-3xl border border-dashed border-slate-200 bg-white px-12 py-16 text-center shadow-sm">
        <h1 className="text-3xl font-bold text-slate-900">Reviews</h1>
        <p className="mt-3 text-sm text-slate-600">
          Grow your business with Google Reviews. Collect feedback on-site, tag project photos, and watch your online
          visibility improve.
        </p>
        <button className="mt-8 inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700">
          Connect Google Business
        </button>
      </div>
    </div>
  );
}
