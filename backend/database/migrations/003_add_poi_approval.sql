ALTER TABLE users
  ADD COLUMN role ENUM('user', 'admin') NOT NULL DEFAULT 'user' AFTER password;

ALTER TABLE pois
  ADD COLUMN status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending' AFTER created_by,
  ADD COLUMN reviewed_by INT NULL AFTER status,
  ADD COLUMN reviewed_at TIMESTAMP NULL AFTER reviewed_by,
  ADD KEY pois_status_index (status),
  ADD KEY pois_reviewed_by_index (reviewed_by),
  ADD CONSTRAINT pois_reviewed_by_foreign
    FOREIGN KEY (reviewed_by) REFERENCES users(id)
    ON DELETE SET NULL;
