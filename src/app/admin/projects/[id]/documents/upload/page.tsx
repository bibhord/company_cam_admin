interface RouteParams {
  params: Promise<{ id: string }>;
}

export default async function ProjectDocumentsUploadPlaceholder({ params }: RouteParams) {
  const { id } = await params;
  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-4xl rounded-xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Upload Project Documents</h1>
        <p className="mt-2 text-sm text-slate-600">
          Document uploads for project <code>{id}</code> are coming soon. You&apos;ll be able to store specs and PDFs alongside project photos.
        </p>
      </div>
    </div>
  );
}
