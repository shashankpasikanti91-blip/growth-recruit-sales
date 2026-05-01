import Link from 'next/link';

export default function JobList({ jobs = [] }) {
  if (!jobs || jobs.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No jobs found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {jobs.map((job) => (
        <div key={job.id} className="border rounded-lg p-4 hover:shadow-md transition">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
              <p className="text-sm text-gray-600">{job.department}</p>
            </div>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
              {job.status || 'Open'}
            </span>
          </div>
          
          <p className="text-gray-700 mb-3">{job.description}</p>
          
          <div className="flex flex-wrap gap-2 mb-3">
            {job.requiredSkills && job.requiredSkills.split(',').map((skill, idx) => (
              <span key={idx} className="px-2 py-1 bg-gray-200 text-gray-800 text-xs rounded">
                {skill.trim()}
              </span>
            ))}
          </div>
          
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">{job.location}</span>
            <Link href={`/jobs/view/${job.id}`}>
              <a className="text-blue-600 hover:text-blue-800 font-medium">View Details</a>
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
