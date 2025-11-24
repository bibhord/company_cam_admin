interface RouteParams {
  params: Promise<{ id: string }>;
}

export default async function ChecklistEditPlaceholder({ params }: RouteParams) {
  const { id } = await params;
  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-4xl rounded-xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Edit Checklist</h1>
        <p className="mt-2 text-sm text-slate-600">
          Editing controls for checklist <code>{id}</code> are on the roadmap.
        </p>
      </div>
    </div>
  );
}
