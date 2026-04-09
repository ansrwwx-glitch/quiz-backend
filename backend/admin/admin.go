package admin

import (
	"context"
	"errors"

	"encore.dev/beta/auth"
	"encore.dev/storage/sqldb"
)

var db = sqldb.Named("quiz")

type Answer struct {
	ID         int64  `json:"id"`
	Text       string `json:"text"`
	IsCorrect  bool   `json:"is_correct"`
	OrderIndex int    `json:"order_index"`
}

type Question struct {
	ID         int64    `json:"id"`
	Text       string   `json:"text"`
	OrderIndex int      `json:"order_index"`
	Answers    []Answer `json:"answers"`
}

type Quiz struct {
	ID            int64      `json:"id"`
	Title         string     `json:"title"`
	IsPublished   bool       `json:"is_published"`
	PassThreshold int        `json:"pass_threshold"`
	OneAttempt    bool       `json:"one_attempt"`
	ShowAnswers   bool       `json:"show_answers"`
	Questions     []Question `json:"questions"`
}

type CreateQuizParams struct {
	Title         string     `json:"title"`
	IsPublished   bool       `json:"is_published"`
	PassThreshold int        `json:"pass_threshold"`
	OneAttempt    bool       `json:"one_attempt"`
	ShowAnswers   bool       `json:"show_answers"`
	Questions     []Question `json:"questions"`
	Token         string     `json:"token"`
}

type QuizResponse struct {
	ID    int64  `json:"id"`
	Title string `json:"title"`
}

type QuizListItem struct {
	ID            int64  `json:"id"`
	Title         string `json:"title"`
	IsPublished   bool   `json:"is_published"`
	QuestionCount int    `json:"question_count"`
}

type QuizList struct {
	Quizzes []QuizListItem `json:"quizzes"`
}

type TokenParam struct {
	Token string `json:"token"`
}

func getUID(ctx context.Context) string {
	uid, _ := auth.UserID()
	return string(uid)
}

func getRoleFromDB(ctx context.Context, email string) (int64, string, error) {
	var id int64
	var role string
	err := db.QueryRow(ctx, "SELECT id, role FROM users WHERE email=$1", email).Scan(&id, &role)
	return id, role, err
}

func requireAdmin(ctx context.Context) (int64, error) {
	email := getUID(ctx)
	if email == "" {
		return 0, errors.New("unauthorized")
	}
	id, role, err := getRoleFromDB(ctx, email)
	if err != nil || role != "admin" {
		return 0, errors.New("admin access required")
	}
	return id, nil
}

func trimBearer(token string) string {
	return strings.TrimPrefix(token, "Bearer ")
}

// encore:api auth method=GET path=/admin/quizzes
func ListQuizzes(ctx context.Context) (*QuizList, error) {
	if _, err := requireAdmin(ctx); err != nil {
		return nil, err
	}

	rows, err := db.Query(ctx,
		"SELECT id, title, is_published, (SELECT COUNT(*) FROM questions WHERE quiz_id = quizzes.id) FROM quizzes ORDER BY created_at DESC",
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []QuizListItem
	for rows.Next() {
		var q QuizListItem
		if err := rows.Scan(&q.ID, &q.Title, &q.IsPublished, &q.QuestionCount); err != nil {
			return nil, err
		}
		list = append(list, q)
	}
	return &QuizList{Quizzes: list}, nil
}

// encore:api auth method=POST path=/admin/quizzes
func CreateQuiz(ctx context.Context, p *CreateQuizParams) (*QuizResponse, error) {
	userID, err := requireAdmin(ctx)
	if err != nil {
		return nil, err
	}
	if p.Title == "" {
		return nil, errors.New("title is required")
	}
	if len(p.Questions) == 0 {
		return nil, errors.New("at least one question required")
	}

	var quizID int64
	err = db.QueryRow(ctx,
		"INSERT INTO quizzes (title, is_published, pass_threshold, one_attempt, show_answers, created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id",
		p.Title, p.IsPublished, p.PassThreshold, p.OneAttempt, p.ShowAnswers, userID,
	).Scan(&quizID)
	if err != nil {
		return nil, err
	}

	for _, q := range p.Questions {
		if len(q.Answers) < 2 {
			return nil, errors.New("each question must have at least 2 answers")
		}
		var qID int64
		err := db.QueryRow(ctx,
			"INSERT INTO questions (quiz_id, text, order_index) VALUES ($1,$2,$3) RETURNING id",
			quizID, q.Text, q.OrderIndex,
		).Scan(&qID)
		if err != nil {
			return nil, err
		}
		for _, a := range q.Answers {
			_, err := db.Exec(ctx,
				"INSERT INTO answers (question_id, text, is_correct, order_index) VALUES ($1,$2,$3,$4)",
				qID, a.Text, a.IsCorrect, a.OrderIndex,
			)
			if err != nil {
				return nil, err
			}
		}
	}

	return &QuizResponse{ID: quizID, Title: p.Title}, nil
}

// encore:api auth method=GET path=/admin/quizzes/:id
func GetQuiz(ctx context.Context, id int64) (*Quiz, error) {
	if _, err := requireAdmin(ctx); err != nil {
		return nil, err
	}

	var q Quiz
	err := db.QueryRow(ctx,
		"SELECT id, title, is_published, pass_threshold, one_attempt, show_answers FROM quizzes WHERE id=$1",
		id,
	).Scan(&q.ID, &q.Title, &q.IsPublished, &q.PassThreshold, &q.OneAttempt, &q.ShowAnswers)
	if err != nil {
		return nil, errors.New("quiz not found")
	}

	rows, err := db.Query(ctx,
		"SELECT id, text, order_index FROM questions WHERE quiz_id=$1 ORDER BY order_index",
		id,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var question Question
		if err := rows.Scan(&question.ID, &question.Text, &question.OrderIndex); err != nil {
			return nil, err
		}
		aRows, err := db.Query(ctx,
			"SELECT id, text, is_correct, order_index FROM answers WHERE question_id=$1 ORDER BY order_index",
			question.ID,
		)
		if err != nil {
			return nil, err
		}
		for aRows.Next() {
			var a Answer
			if err := aRows.Scan(&a.ID, &a.Text, &a.IsCorrect, &a.OrderIndex); err != nil {
				aRows.Close()
				return nil, err
			}
			question.Answers = append(question.Answers, a)
		}
		aRows.Close()
		q.Questions = append(q.Questions, question)
	}

	return &q, nil
}

// encore:api auth method=PUT path=/admin/quizzes/:id
func UpdateQuiz(ctx context.Context, id int64, p *CreateQuizParams) (*QuizResponse, error) {
	if _, err := requireAdmin(ctx); err != nil {
		return nil, err
	}

	_, err := db.Exec(ctx,
		"UPDATE quizzes SET title=$1, is_published=$2, pass_threshold=$3, one_attempt=$4, show_answers=$5 WHERE id=$6",
		p.Title, p.IsPublished, p.PassThreshold, p.OneAttempt, p.ShowAnswers, id,
	)
	if err != nil {
		return nil, err
	}

	_, err = db.Exec(ctx, "DELETE FROM questions WHERE quiz_id=$1", id)
	if err != nil {
		return nil, err
	}

	for _, q := range p.Questions {
		var qID int64
		err := db.QueryRow(ctx,
			"INSERT INTO questions (quiz_id, text, order_index) VALUES ($1,$2,$3) RETURNING id",
			id, q.Text, q.OrderIndex,
		).Scan(&qID)
		if err != nil {
			return nil, err
		}
		for _, a := range q.Answers {
			_, err := db.Exec(ctx,
				"INSERT INTO answers (question_id, text, is_correct, order_index) VALUES ($1,$2,$3,$4)",
				qID, a.Text, a.IsCorrect, a.OrderIndex,
			)
			if err != nil {
				return nil, err
			}
		}
	}

	return &QuizResponse{ID: id, Title: p.Title}, nil
}

type PublishResponse struct {
	IsPublished bool `json:"is_published"`
}

// encore:api auth method=PATCH path=/admin/quizzes/:id/publish
func TogglePublish(ctx context.Context, id int64) (*PublishResponse, error) {
	if _, err := requireAdmin(ctx); err != nil {
		return nil, err
	}

	var current bool
	err := db.QueryRow(ctx, "SELECT is_published FROM quizzes WHERE id=$1", id).Scan(&current)
	if err != nil {
		return nil, errors.New("quiz not found")
	}

	_, err = db.Exec(ctx, "UPDATE quizzes SET is_published=$1 WHERE id=$2", !current, id)
	if err != nil {
		return nil, err
	}

	return &PublishResponse{IsPublished: !current}, nil
}

// encore:api auth method=DELETE path=/admin/quizzes/:id
func DeleteQuiz(ctx context.Context, id int64) error {
	if _, err := requireAdmin(ctx); err != nil {
		return err
	}

	_, err := db.Exec(ctx, "DELETE FROM quizzes WHERE id=$1", id)
	return err
}
