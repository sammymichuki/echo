-- ─────────────────────────────────────────────────────────────────────────
-- Echo – MySQL schema
-- Run once:  mysql -u root -p echo_db < schema.sql
-- ─────────────────────────────────────────────────────────────────────────

CREATE DATABASE IF NOT EXISTS echo_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE echo_db;

-- ── Anonymous users ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id           VARCHAR(36)  PRIMARY KEY,          -- "anon_<10-char random>"
  device_hash  VARCHAR(64)  DEFAULT NULL,          -- SHA-256 of UA+IP (for bans)
  country      VARCHAR(2)   DEFAULT NULL,          -- ISO 3166-1 alpha-2
  shadow_ban   TINYINT(1)   NOT NULL DEFAULT 0,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS anonymous_credentials (
  user_id             VARCHAR(36) PRIMARY KEY,
  recovery_code_hash  VARCHAR(64) NOT NULL UNIQUE,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_ac_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS anonymous_sessions (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id         VARCHAR(36) NOT NULL,
  token_hash      VARCHAR(64) NOT NULL UNIQUE,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_as_user (user_id),
  CONSTRAINT fk_as_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ── Voice posts ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS voice_posts (
  id           VARCHAR(36)  PRIMARY KEY,
  user_id      VARCHAR(36)  NOT NULL,
  audio_url    VARCHAR(512) NOT NULL,              -- cloud object storage URL
  duration     SMALLINT     NOT NULL,              -- seconds (10–60)
  mood         VARCHAR(32)  NOT NULL DEFAULT 'Lonely',
  -- moderation
  transcript   TEXT         DEFAULT NULL,          -- speech-to-text output
  flagged      TINYINT(1)   NOT NULL DEFAULT 0,
  report_count SMALLINT     NOT NULL DEFAULT 0,
  -- lifecycle
  expires_at   DATETIME     NOT NULL,              -- default: created_at + 24h
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_vp_user      (user_id),
  INDEX idx_vp_mood      (mood),
  INDEX idx_vp_created   (created_at DESC),
  INDEX idx_vp_expires   (expires_at),
  CONSTRAINT fk_vp_user  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ── Voice replies ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS voice_replies (
  id           VARCHAR(36)  PRIMARY KEY,
  post_id      VARCHAR(36)  NOT NULL,              -- parent post
  user_id      VARCHAR(36)  NOT NULL,
  audio_url    VARCHAR(512) NOT NULL,
  duration     SMALLINT     NOT NULL,              -- 10–45 seconds
  mood         VARCHAR(32)  NOT NULL DEFAULT 'Lonely',
  transcript   TEXT         DEFAULT NULL,
  flagged      TINYINT(1)   NOT NULL DEFAULT 0,
  expires_at   DATETIME     NOT NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_vr_post      (post_id),
  INDEX idx_vr_user      (user_id),
  INDEX idx_vr_created   (created_at DESC),
  CONSTRAINT fk_vr_post  FOREIGN KEY (post_id)  REFERENCES voice_posts(id) ON DELETE CASCADE,
  CONSTRAINT fk_vr_user  FOREIGN KEY (user_id)  REFERENCES users(id)
);

-- ── Reactions (one per user per post) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS reactions (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  post_id      VARCHAR(36)  NOT NULL,
  user_id      VARCHAR(36)  NOT NULL,
  emoji        VARCHAR(8)   NOT NULL,              -- 🤍 | 🫂 | 💭
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_reaction   (post_id, user_id),
  INDEX idx_r_post         (post_id),
  CONSTRAINT fk_r_post     FOREIGN KEY (post_id)  REFERENCES voice_posts(id) ON DELETE CASCADE,
  CONSTRAINT fk_r_user     FOREIGN KEY (user_id)  REFERENCES users(id)
);

-- ── Reposts (one per user per post) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS reposts (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  post_id      VARCHAR(36)  NOT NULL,
  user_id      VARCHAR(36)  NOT NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_repost     (post_id, user_id),
  INDEX idx_repost_post    (post_id),
  CONSTRAINT fk_repost_post FOREIGN KEY (post_id) REFERENCES voice_posts(id) ON DELETE CASCADE,
  CONSTRAINT fk_repost_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ── Views (one per user per post) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS post_views (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  post_id      VARCHAR(36)  NOT NULL,
  user_id      VARCHAR(36)  NOT NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_post_view  (post_id, user_id),
  INDEX idx_view_post      (post_id),
  CONSTRAINT fk_view_post  FOREIGN KEY (post_id) REFERENCES voice_posts(id) ON DELETE CASCADE,
  CONSTRAINT fk_view_user  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ── Shares (count every successful share action) ──────────────────────────
CREATE TABLE IF NOT EXISTS post_shares (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  post_id      VARCHAR(36)  NOT NULL,
  user_id      VARCHAR(36)  NOT NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_share_post     (post_id),
  CONSTRAINT fk_share_post FOREIGN KEY (post_id) REFERENCES voice_posts(id) ON DELETE CASCADE,
  CONSTRAINT fk_share_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ── Saved posts (one per user per post) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS saved_posts (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  post_id      VARCHAR(36)  NOT NULL,
  user_id      VARCHAR(36)  NOT NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_saved_post (post_id, user_id),
  INDEX idx_saved_post     (post_id),
  CONSTRAINT fk_saved_post FOREIGN KEY (post_id) REFERENCES voice_posts(id) ON DELETE CASCADE,
  CONSTRAINT fk_saved_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ── Reports ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  post_id      VARCHAR(36)  NOT NULL,
  reporter_id  VARCHAR(36)  NOT NULL,
  reason       VARCHAR(128) NOT NULL DEFAULT 'other',
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_rep_post       (post_id),
  CONSTRAINT fk_rep_post   FOREIGN KEY (post_id)  REFERENCES voice_posts(id) ON DELETE CASCADE
);

-- ── Cleanup event: auto-delete expired posts ───────────────────────────────
-- Enable event scheduler: SET GLOBAL event_scheduler = ON;
CREATE EVENT IF NOT EXISTS cleanup_expired_posts
  ON SCHEDULE EVERY 1 HOUR
  DO
    DELETE FROM voice_posts WHERE expires_at < NOW();
