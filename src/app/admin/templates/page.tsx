import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Link from 'next/link';

interface ProfileRecord {
  org_id: string;
}

export default async function TemplatesPage() {
  const supabase = createServerComponentClient({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not found for templates page');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('user_id', user.id)
    .single<ProfileRecord>();

  if (profileError || !profile) {
    console.error('Error loading profile for templates:', profileError);
    return (
      <div className="p-10">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-red-600">Unable to load profile</h1>
          <p className="mt-2 text-sm text-slate-600">Verify Supabase policies and try again.</p>
        </div>
      </div>
    );
  }

  const [{ data: labels }, { data: checklistTemplates }, { data: albums }, { data: documents }] = await Promise.all([
    supabase.from('labels').select('id, name, color').eq('org_id', profile.org_id).order('name', { ascending: true }),
    supabase
      .from('checklist_templates')
      .select('id, name, description, created_at')
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false }),
    supabase
      .from('albums')
      .select('id, name, description, created_at')
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false }),
    supabase
      .from('project_documents')
      .select('id, name, created_at')
      .eq('org_id', profile.org_id)
      .order('created_at', { ascending: false }),
  ]);

  const labelCount = labels?.length ?? 0;
  const checklistCount = checklistTemplates?.length ?? 0;
  const albumCount = albums?.length ?? 0;
  const documentCount = documents?.length ?? 0;

  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-4xl space-y-8">
        <header>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            <Link href="/admin/projects" className="text-indigo-600 hover:text-indigo-700">
              ← Back to projects
            </Link>
          </p>
          <div className="mt-3 flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Project Template</h1>
              <p className="mt-2 text-sm text-slate-600">
                Pre-build the labels, checklists, and documentation you reuse across projects. Your team can apply
                templates from the mobile app.
              </p>
            </div>
          </div>
        </header>

        <TemplateSection
          title="Labels"
          count={labelCount}
          description="Create reusable labels to organize photos and project updates."
          actionHref="/admin/templates/labels/new"
          actionLabel="Add Labels"
        />
        <TemplateSection
          title="Checklists"
          count={checklistCount}
          description="Build checklist templates your crews can complete on site."
          actionHref="/admin/templates/checklists/new"
          actionLabel="Add Checklists"
        />
        <TemplateSection
          title="Reports"
          count={0}
          description="Draft report templates to accelerate client deliverables."
          actionHref="/admin/reports/new"
          actionLabel="Add Reports"
        />
        <TemplateSection
          title="Project Documents"
          count={documentCount}
          description="Upload standard documents, specs, or PDFs for quick reuse."
          actionHref="/admin/projects/new"
          actionLabel="Add Documents"
        />
        <TemplateSection
          title="Pages"
          count={albumCount}
          description="Organize photo albums or pages to share curated site updates."
          actionHref="/admin/templates/pages/new"
          actionLabel="Add Pages"
        />
      </div>
    </div>
  );
}

function TemplateSection({
  title,
  description,
  count,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  count: number;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <Link href={actionHref} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
          + {actionLabel}
        </Link>
      </div>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
      <p className="mt-4 text-2xl font-semibold text-slate-900">{count}</p>
    </section>
  );
}
