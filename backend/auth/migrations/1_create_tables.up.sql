CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE quizzes (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    is_published BOOLEAN DEFAULT FALSE,
    pass_threshold INT DEFAULT 0,
    one_attempt BOOLEAN DEFAULT FALSE,
    show_answers BOOLEAN DEFAULT FALSE,
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE questions (
    id BIGSERIAL PRIMARY KEY,
    quiz_id BIGINT REFERENCES quizzes(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    order_index INT NOT NULL
);

CREATE TABLE answers (
    id BIGSERIAL PRIMARY KEY,
    question_id BIGINT REFERENCES questions(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT FALSE,
    order_index INT NOT NULL
);

CREATE TABLE attempts (
    id BIGSERIAL PRIMARY KEY,
    quiz_id BIGINT REFERENCES quizzes(id),
    user_id BIGINT REFERENCES users(id),
    score INT NOT NULL,
    total INT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE attempt_answers (
    id BIGSERIAL PRIMARY KEY,
    attempt_id BIGINT REFERENCES attempts(id) ON DELETE CASCADE,
    question_id BIGINT REFERENCES questions(id),
    answer_id BIGINT REFERENCES answers(id)
);
