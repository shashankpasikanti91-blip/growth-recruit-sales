import { useState } from 'react';

export default function JobForm({ onSubmit, initialData = null }) {
  const [formData, setFormData] = useState(
    initialData || {
      title: '',
      department: '',
      location: '',
      description: '',
      requiredSkills: '',
      minExperience: '',
      maxExperience: '',
      salary: '',
    }
  );
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await onSubmit(formData);
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Job Title
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Department
          </label>
          <input
            type="text"
            name="department"
            value={formData.department}
            onChange={handleChange}
            required
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Location
        </label>
        <input
          type="text"
          name="location"
          value={formData.location}
          onChange={handleChange}
          required
          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          required
          rows="4"
          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Required Skills (comma-separated)
        </label>
        <input
          type="text"
          name="requiredSkills"
          value={formData.requiredSkills}
          onChange={handleChange}
          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Min Experience (years)
          </label>
          <input
            type="number"
            name="minExperience"
            value={formData.minExperience}
            onChange={handleChange}
            min="0"
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Max Experience (years)
          </label>
          <input
            type="number"
            name="maxExperience"
            value={formData.maxExperience}
            onChange={handleChange}
            min="0"
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Salary Range
          </label>
          <input
            type="text"
            name="salary"
            value={formData.salary}
            onChange={handleChange}
            placeholder="e.g., $50k-$70k"
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Saving...' : 'Save Job'}
      </button>
    </form>
  );
}
