interface RouteParams {
  params: Promise<{ id: string }>;
}

export default async function ReportDetailPlaceholder({ params }: RouteParams) {
  const { id } = await params;
  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-4xl rounded-xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Report Details</h1>
        <p className="mt-2 text-sm text-slate-600">
          Report builder for <code>{id}</code> is under construction. You&apos;ll soon be able to select photos, order pages, and publish PDFs.
        </p>
      </div>
    </div>
  );
}
