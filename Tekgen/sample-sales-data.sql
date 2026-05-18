INSERT INTO clients (id, "clientName", industry, status, "clientOwner", "createdAt", "updatedAt") VALUES
('cl_001', 'Acme Corporation', 'Technology', 'ACTIVE', 'cmojetsgu0000qaqhcfn9ehyp', NOW(), NOW()),
('cl_002', 'Global Solutions Ltd', 'Consulting', 'ACTIVE', 'cmojetsgu0000qaqhcfn9ehyp', NOW(), NOW()),
('cl_003', 'StartUp Inc', 'Software', 'PROSPECT', 'cmojetsgu0000qaqhcfn9ehyp', NOW(), NOW());

INSERT INTO submissions (id, "candidateId", "jobId", "clientId", stage, "submittedDate", "createdAt", "lastUpdated", "aiMatchScore") VALUES
('sub_001', (SELECT id FROM candidates LIMIT 1), (SELECT id FROM jobs LIMIT 1), 'cl_001', 'SUBMITTED_TO_CLIENT', NOW(), NOW(), NOW(), 85),
('sub_002', (SELECT id FROM candidates LIMIT 1 OFFSET 1), (SELECT id FROM jobs LIMIT 1 OFFSET 1), 'cl_001', 'INTERVIEW', NOW(), NOW(), NOW(), 90),
('sub_003', (SELECT id FROM candidates LIMIT 1 OFFSET 2), (SELECT id FROM jobs LIMIT 1 OFFSET 2), 'cl_002', 'OFFER', NOW(), NOW(), NOW(), 88);

SELECT COUNT(*) as total_clients FROM clients;
SELECT COUNT(*) as total_submissions FROM submissions;
