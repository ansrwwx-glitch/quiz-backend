package auth

import (
	"context"
	"errors"
	"time"

	"encore.dev/beta/auth"
	"encore.dev/storage/sqldb"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

var db = sqldb.NewDatabase("quiz", sqldb.DatabaseConfig{
	Migrations: "./migrations",
})

var jwtSecret = []byte("super-secret-key-change-in-prod")

type RegisterParams struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Role     string `json:"role"`
}

type TokenResponse struct {
	Token string `json:"token"`
}

type UserData struct {
	ID    int64  `json:"id"`
	Email string `json:"email"`
	Role  string `json:"role"`
}

// encore:api public method=POST path=/auth/register
func Register(ctx context.Context, p *RegisterParams) (*TokenResponse, error) {
	if p.Email == "" || p.Password == "" {
		return nil, errors.New("email and password required")
	}
	if p.Role != "admin" && p.Role != "user" {
		return nil, errors.New("role must be admin or user")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(p.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	var id int64
	err = db.QueryRow(ctx,
		"INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id",
		p.Email, string(hash), p.Role,
	).Scan(&id)
	if err != nil {
		return nil, errors.New("email already exists")
	}

	token, err := generateToken(id, p.Email, p.Role)
	if err != nil {
		return nil, err
	}

	return &TokenResponse{Token: token}, nil
}

type LoginParams struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// encore:api public method=POST path=/auth/login
func Login(ctx context.Context, p *LoginParams) (*TokenResponse, error) {
	var id int64
	var hash, role string

	err := db.QueryRow(ctx,
		"SELECT id, password_hash, role FROM users WHERE email = $1",
		p.Email,
	).Scan(&id, &hash, &role)
	if err != nil {
		return nil, errors.New("invalid credentials")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(p.Password)); err != nil {
		return nil, errors.New("invalid credentials")
	}

	token, err := generateToken(id, p.Email, role)
	if err != nil {
		return nil, err
	}

	return &TokenResponse{Token: token}, nil
}

func generateToken(id int64, email, role string) (string, error) {
	claims := jwt.MapClaims{
		"sub":   id,
		"email": email,
		"role":  role,
		"exp":   time.Now().Add(24 * time.Hour).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

// encore:authhandler
func AuthHandler(ctx context.Context, token string) (auth.UID, *UserData, error) {
	t, err := jwt.Parse(token, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return jwtSecret, nil
	})
	if err != nil || !t.Valid {
		return "", nil, errors.New("invalid token")
	}

	claims, ok := t.Claims.(jwt.MapClaims)
	if !ok {
		return "", nil, errors.New("invalid claims")
	}

	id := int64(claims["sub"].(float64))
	email := claims["email"].(string)
	role := claims["role"].(string)

	uid := auth.UID(email)
	return uid, &UserData{ID: id, Email: email, Role: role}, nil
}
