ALTER TABLE users
  ADD role VARCHAR(10) NOT NULL CONSTRAINT CK_users_role CHECK (role IN ('user', 'admin')) DEFAULT 'user';

ALTER TABLE pois
  ADD status VARCHAR(20) NOT NULL CONSTRAINT CK_pois_status CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
      reviewed_by INT NULL,
      reviewed_at DATETIME NULL;

CREATE INDEX IX_pois_status ON pois (status);
CREATE INDEX IX_pois_reviewed_by ON pois (reviewed_by);

ALTER TABLE pois
  ADD CONSTRAINT FK_pois_reviewed_by
    FOREIGN KEY (reviewed_by) REFERENCES users(id)
    ON DELETE SET NULL;
