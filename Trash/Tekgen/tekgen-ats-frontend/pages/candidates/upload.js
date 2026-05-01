import DashboardLayout from '../../components/layout/DashboardLayout';
import ResumeUpload from '../../components/candidates/ResumeUpload';

export default function CandidateUploadPage() {
  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Upload Candidate Resume</h1>
          <p className="text-gray-600 mt-2">Upload a candidate resume file or paste resume text to create a candidate profile quickly.</p>
        </div>
        <ResumeUpload />
      </div>
    </DashboardLayout>
  );
}
