SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    email VARCHAR(254) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(120) NOT NULL,
    company VARCHAR(160) NOT NULL,
    job_title VARCHAR(160) NOT NULL,
    sector VARCHAR(120) DEFAULT NULL,
    location VARCHAR(160) NOT NULL,
    bio TEXT DEFAULT NULL,
    website VARCHAR(500) DEFAULT NULL,
    membership_status ENUM('pending', 'active', 'suspended', 'cancelled') NOT NULL DEFAULT 'active',
    membership_level ENUM('standard', 'premium') NOT NULL DEFAULT 'standard',
    role ENUM('member', 'admin') NOT NULL DEFAULT 'member',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_email (email),
    KEY idx_users_active_members (is_active, membership_status),
    KEY idx_users_company (company),
    KEY idx_users_sector (sector),
    KEY idx_users_location (location),
    KEY idx_users_role (role)
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS events (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    event_date DATETIME NOT NULL,
    venue VARCHAR(200) NOT NULL,
    address VARCHAR(255) DEFAULT NULL,
    location VARCHAR(160) DEFAULT NULL,
    capacity INT UNSIGNED NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_by BIGINT UNSIGNED DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_events_date_active (event_date, is_active),
    KEY idx_events_created_by (created_by),
    CONSTRAINT fk_events_created_by
        FOREIGN KEY (created_by) REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,
    CONSTRAINT chk_events_capacity CHECK (capacity > 0)
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS event_registrations (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    event_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    registered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_event_registrations_event_user (event_id, user_id),
    KEY idx_event_registrations_user_event (user_id, event_id),
    KEY idx_event_registrations_registered_at (registered_at),
    CONSTRAINT fk_event_registrations_event
        FOREIGN KEY (event_id) REFERENCES events (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT fk_event_registrations_user
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessions (
    session_id VARCHAR(128) NOT NULL,
    session_data LONGTEXT NOT NULL,
    expires_at DATETIME(3) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (session_id),
    KEY idx_sessions_expires_at (expires_at)
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

INSERT INTO events (
    title,
    description,
    event_date,
    venue,
    address,
    location,
    capacity,
    is_active
)
SELECT
    'London Business Leaders Breakfast',
    'Start the day with structured introductions, peer-to-peer discussion and practical networking for business owners and senior professionals from across London and the South East.',
    '2027-02-18 08:00:00',
    'The Brewery',
    '52 Chiswell Street, London EC1Y 4SA',
    'London',
    120,
    1
WHERE NOT EXISTS (
    SELECT 1
    FROM events
    WHERE title = 'London Business Leaders Breakfast'
      AND event_date = '2027-02-18 08:00:00'
);

INSERT INTO events (
    title,
    description,
    event_date,
    venue,
    address,
    location,
    capacity,
    is_active
)
SELECT
    'Manchester Growth and Innovation Forum',
    'An afternoon forum bringing together founders, advisers and established companies to exchange ideas on sustainable growth, innovation and regional investment.',
    '2027-04-22 13:30:00',
    'Manchester Hall',
    '36 Bridge Street, Manchester M3 3BT',
    'Manchester',
    180,
    1
WHERE NOT EXISTS (
    SELECT 1
    FROM events
    WHERE title = 'Manchester Growth and Innovation Forum'
      AND event_date = '2027-04-22 13:30:00'
);

INSERT INTO events (
    title,
    description,
    event_date,
    venue,
    address,
    location,
    capacity,
    is_active
)
SELECT
    'Birmingham Summer Networking Reception',
    'A relaxed evening reception for members to build new commercial relationships, reconnect with contacts and meet professionals from across the Midlands.',
    '2027-06-17 18:00:00',
    'The Grand Hotel Birmingham',
    '1 Church Street, Birmingham B3 2FE',
    'Birmingham',
    150,
    1
WHERE NOT EXISTS (
    SELECT 1
    FROM events
    WHERE title = 'Birmingham Summer Networking Reception'
      AND event_date = '2027-06-17 18:00:00'
);

INSERT INTO events (
    title,
    description,
    event_date,
    venue,
    address,
    location,
    capacity,
    is_active
)
SELECT
    'Edinburgh UK Business Connections Summit',
    'A full-day programme of expert talks, facilitated roundtables and member networking focused on strengthening business connections across Scotland and the wider UK.',
    '2027-09-23 09:30:00',
    'The Assembly Rooms',
    '54 George Street, Edinburgh EH2 2LR',
    'Edinburgh',
    220,
    1
WHERE NOT EXISTS (
    SELECT 1
    FROM events
    WHERE title = 'Edinburgh UK Business Connections Summit'
      AND event_date = '2027-09-23 09:30:00'
);