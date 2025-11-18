CREATE TABLE IF NOT EXISTS certificates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  certificate_id VARCHAR(64) NOT NULL UNIQUE,
  company_name VARCHAR(255) NOT NULL,
  date_of_issue DATE NOT NULL,
  surveillance_1 VARCHAR(255),
  surveillance_2 VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO certificates (certificate_id, company_name, date_of_issue, surveillance_1, surveillance_2)
VALUES
('CERT-2025-0001', 'Acme Labs', '2025-06-01', 'Surveillance A', 'Surveillance B')
ON DUPLICATE KEY UPDATE company_name = VALUES(company_name);
