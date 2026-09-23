CREATE TABLE IF NOT EXISTS pois (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name_vi VARCHAR(150) NOT NULL,
  name_en VARCHAR(150) NOT NULL,
  name_zh VARCHAR(150) NOT NULL,
  description_vi TEXT NOT NULL,
  description_en TEXT NOT NULL,
  description_zh TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  category ENUM('tourism', 'food') NOT NULL,
  latitude DECIMAL(10, 7) NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL,
  radius SMALLINT UNSIGNED NOT NULL,
  image VARCHAR(500) NULL,
  audio_vi VARCHAR(500) NULL,
  audio_en VARCHAR(500) NULL,
  audio_zh VARCHAR(500) NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY pois_created_by_index (created_by),
  KEY pois_coordinates_index (latitude, longitude),
  CONSTRAINT pois_created_by_foreign
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=100000 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
