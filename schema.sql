-- Skills Bowl Database Schema
-- Run this against your MariaDB instance to set up the database.

CREATE DATABASE IF NOT EXISTS skills_bowl CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE skills_bowl;

CREATE TABLE IF NOT EXISTS users (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  username   VARCHAR(50)  NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role       ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS questions (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  content      TEXT NOT NULL,
  image_path   VARCHAR(500) NULL,
  type         ENUM('MCQ') NOT NULL DEFAULT 'MCQ',
  category     VARCHAR(100) NOT NULL,
  sub_category VARCHAR(100) NOT NULL DEFAULT '',
  difficulty   ENUM('Easy', 'Medium', 'Hard') NOT NULL DEFAULT 'Medium',
  option_a     TEXT NOT NULL,
  option_b     TEXT NOT NULL,
  option_c     TEXT NOT NULL,
  option_d     TEXT NOT NULL,
  correct_answer ENUM('A','B','C','D') NOT NULL,
  explanation  TEXT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT NOT NULL,
  score           INT NOT NULL DEFAULT 0,
  total_questions INT NOT NULL,
  time_limit      INT NULL COMMENT 'Total seconds for the quiz, NULL = untimed',
  start_time      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  end_time        TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS quiz_questions (
  attempt_id     INT NOT NULL,
  question_id    INT NOT NULL,
  question_order INT NOT NULL,
  PRIMARY KEY (attempt_id, question_id),
  FOREIGN KEY (attempt_id)  REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(id)     ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS responses (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  attempt_id  INT NOT NULL,
  question_id INT NOT NULL,
  user_choice ENUM('A','B','C','D') NULL COMMENT 'NULL = unanswered',
  is_correct  BOOLEAN NOT NULL DEFAULT FALSE,
  FOREIGN KEY (attempt_id)  REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES questions(id)     ON DELETE CASCADE
);

-- Default admin account: username=admin, password=Admin1234!
-- Hash generated with bcryptjs (rounds=12). CHANGE THIS PASSWORD after first login.
INSERT INTO users (username, password_hash, role) VALUES
  ('admin', '$2a$12$K8bOGGTx1kHlJbcM5vE/3.NHTxHD0NXiNFzBvkXQv7.fk9j3CkWdC', 'admin')
ON DUPLICATE KEY UPDATE id=id;
