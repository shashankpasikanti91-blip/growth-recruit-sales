/** Client submission pipeline (matches Prisma SubmissionStage). */
export const PIPELINE_STAGES = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SUBMITTED_TO_SALES', label: 'Submitted to sales' },
  { value: 'SUBMITTED_TO_CLIENT', label: 'Submitted to client' },
  { value: 'CLIENT_REVIEW', label: 'Client review' },
  { value: 'INTERVIEW', label: 'Interview' },
  { value: 'OFFER', label: 'Offer' },
  { value: 'JOINED', label: 'Joined' },
  { value: 'REJECTED', label: 'Rejected' },
];
