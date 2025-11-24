interface RouteParams {
  params: Promise<{ id: string }>;
}

export default async function ProjectAlbumCreatePlaceholder({ params }: RouteParams) {
  const { id } = await params;
  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-4xl rounded-xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Add Pages</h1>
        <p className="mt-2 text-sm text-slate-600">
          Photo album pages for project <code>{id}</code> will be available soon. You&apos;ll be able to create curated photo sets for clients.
        </p>
      </div>
    </div>
  );
}
