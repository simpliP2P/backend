ALTER TABLE organisation_categories ADD CONSTRAINT unique_category_org UNIQUE (organisation_id, name);
ALTER TABLE organisation_departments ADD CONSTRAINT unique_department_org UNIQUE (organisation_id, name);