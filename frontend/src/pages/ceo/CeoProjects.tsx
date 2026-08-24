export default function CeoProjects() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Projects</h1>
        <p className="text-sm text-gray-500 mt-1">Manage company projects and assign teams from one place.</p>
      </div>

      <div className="card text-center py-14">
        <div className="mx-auto mb-4 w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7a2 2 0 012-2h3l2 2h7a2 2 0 012 2v8a2 2 0 01-2 2H6a2 2 0 01-2-2V7z" />
          </svg>
        </div>
        <h2 className="font-semibold text-gray-900">No projects yet</h2>
        <p className="text-sm text-gray-500 mt-1">Your projects will appear here once they are added.</p>
      </div>
    </div>
  );
}
