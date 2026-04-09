package quiz

import (
	"context"
	"errors"

	"encore.dev/beta/auth"
	"encore.dev/storage/sqldb"
)

var db = sqldb.Named("quiz")

type AuthData struct {
	ID    int64  `json:"id"`
	Email string `json:"email"`
	Role  string `json:"role"`
}

type QuizListItem struct {
	ID            int64  `json:"id"`
	Title         string `json:"title"`
	QuestionCount int    `json:"question_count"`
	Attempted     bool   `json:"attempted"`
}

type QuizList struct {
	Quizzes []QuizListItem `json:"quizzes"`
}

// encore:api auth method=GET path=/quizzes
func ListQuizzes(ctx context.Context) (*QuizList, error) {
	u, ok := auth.UserData[*AuthData](ctx)
	if !ok {
		return nil, errors.New("unauthorized")
	}

	rows, err := db.Query(ctx,
		`SELECT q.id, q.title,
			(SELECT COUNT(*) FROM questions WHERE quiz_id = q.id),
			EXISTS(SELECT 1 FROM attempts WHERE quiz_id = q.id AND user_id = $1)
		FROM quizzes q
		WHERE q.is_published = true
		ORDER BY q.created_at DESC`,
		u.ID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []QuizListItem
	for rows.Next() {
		var q QuizListItem
		if err := rows.Scan(&q.ID, &q.Title, &q.QuestionCount, &q.Attempted); err != nil {
			return nil, err
		}
		list = append(list, q)
	}
	return &QuizList{Quizzes: list}, nil
}

type Answer struct {
	ID         int64  `json:"id"`
	Text       string `json:"text"`
	OrderIndex int    `json:"order_index"`
}

type Question struct {
	ID         int64    `json:"id"`
	Text       string   `json:"text"`
	OrderIndex int      `json:"order_index"`
	Answers    []Answer `json:"answers"`
}

type QuizDetail struct {
	ID            int64      `json:"id"`
	Title         string     `json:"title"`
	OneAttempt    bool       `json:"one_attempt"`
	PassThreshold int        `json:"pass_threshold"`
	Questions     []Question `json:"questions"`
}

// encore:api auth method=GET path=/quizzes/:id
func GetQuiz(ctx context.Context, id int64) (*QuizDetail, error) {
	u, ok := auth.UserData[*AuthData](ctx)
	if !ok {
		return nil, errors.New("unauthorized")
	}

	var q QuizDetail
	var showAnswers bool
	err := db.QueryRow(ctx,
		"SELECT id, title, one_attempt, pass_threshold, show_answers FROM quizzes WHERE id=$1 AND is_published=true",
		id,
	).Scan(&q.ID, &q.Title, &q.OneAttempt, &q.PassThreshold, &showAnswers)
	if err != nil {
		return nil, errors.New("quiz not found")
	}

	if q.OneAttempt {
		var count int
		db.QueryRow(ctx,
			"SELECT COUNT(*) FROM attempts WHERE quiz_id=$1 AND user_id=$2",
			id, u.ID,
		).Scan(&count)
		if count > 0 {
			return nil, errors.New("you have already attempted this quiz")
		}
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
			"SELECT id, text, order_index FROM answers WHERE question_id=$1 ORDER BY order_index",
			question.ID,
		)
		if err != nil {
			return nil, err
		}
		for aRows.Next() {
			var a Answer
			if err := aRows.Scan(&a.ID, &a.Text, &a.OrderIndex); err != nil {
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

type SubmitAnswer struct {
	QuestionID int64 `json:"question_id"`
	AnswerID   int64 `json:"answer_id"`
}

type SubmitParams struct {
	Answers []SubmitAnswer `json:"answers"`
}

type AnswerResult struct {
	QuestionID     int64  `json:"question_id"`
	QuestionText   string `json:"question_text"`
	SelectedAnswer string `json:"selected_answer"`
	CorrectAnswer  string `json:"correct_answer"`
	IsCorrect      bool   `json:"is_correct"`
}

type SubmitResult struct {
	Score       int            `json:"score"`
	Total       int            `json:"total"`
	Percentage  int            `json:"percentage"`
	Passed      *bool          `json:"passed"`
	ShowAnswers bool           `json:"show_answers"`
	Answers     []AnswerResult `json:"answers,omitempty"`
}

// encore:api auth method=POST path=/quizzes/:id/submit
func SubmitQuiz(ctx context.Context, id int64, p *SubmitParams) (*SubmitResult, error) {
	u, ok := auth.UserData[*AuthData](ctx)
	if !ok {
		return nil, errors.New("unauthorized")
	}

	var oneAttempt bool
	var passThreshold int
	var showAnswers bool
	err := db.QueryRow(ctx,
		"SELECT one_attempt, pass_threshold, show_answers FROM quizzes WHERE id=$1 AND is_published=true",
		id,
	).Scan(&oneAttempt, &passThreshold, &showAnswers)
	if err != nil {
		return nil, errors.New("quiz not found")
	}

	if oneAttempt {
		var count int
		db.QueryRow(ctx,
			"SELECT COUNT(*) FROM attempts WHERE quiz_id=$1 AND user_id=$2",
			id, u.ID,
		).Scan(&count)
		if count > 0 {
			return nil, errors.New("you have already attempted this quiz")
		}
	}

	score := 0
	total := len(p.Answers)
	var answerResults []AnswerResult

	for _, a := range p.Answers {
		var isCorrect bool
		db.QueryRow(ctx,
			"SELECT is_correct FROM answers WHERE id=$1 AND question_id=$2",
			a.AnswerID, a.QuestionID,
		).Scan(&isCorrect)

		if isCorrect {
			score++
		}

		if showAnswers {
			var questionText, selectedText, correctText string
			db.QueryRow(ctx, "SELECT text FROM questions WHERE id=$1", a.QuestionID).Scan(&questionText)
			db.QueryRow(ctx, "SELECT text FROM answers WHERE id=$1", a.AnswerID).Scan(&selectedText)
			db.QueryRow(ctx, "SELECT text FROM answers WHERE question_id=$1 AND is_correct=true", a.QuestionID).Scan(&correctText)

			answerResults = append(answerResults, AnswerResult{
				QuestionID:     a.QuestionID,
				QuestionText:   questionText,
				SelectedAnswer: selectedText,
				CorrectAnswer:  correctText,
				IsCorrect:      isCorrect,
			})
		}
	}

	var attemptID int64
	err = db.QueryRow(ctx,
		"INSERT INTO attempts (quiz_id, user_id, score, total) VALUES ($1,$2,$3,$4) RETURNING id",
		id, u.ID, score, total,
	).Scan(&attemptID)
	if err != nil {
		return nil, err
	}

	for _, a := range p.Answers {
		db.Exec(ctx,
			"INSERT INTO attempt_answers (attempt_id, question_id, answer_id) VALUES ($1,$2,$3)",
			attemptID, a.QuestionID, a.AnswerID,
		)
	}

	percentage := 0
	if total > 0 {
		percentage = (score * 100) / total
	}

	result := &SubmitResult{
		Score:       score,
		Total:       total,
		Percentage:  percentage,
		ShowAnswers: showAnswers,
	}

	if passThreshold > 0 {
		passed := percentage >= passThreshold
		result.Passed = &passed
	}

	if showAnswers {
		result.Answers = answerResults
	}

	return result, nil
}
