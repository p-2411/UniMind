# Current Functionality + Their Relations

Currently the code contains the following files and functions:
ai.py
- _extract_json
Does:
Recieves a string and attempts to turn it into a Json object

Quirks:
Uses json.load function  --> The json.loads() function in Python is used to deserialize a JSON formatted string, bytes, or byte array into a Python object. This means it takes a string that represents JSON data and converts it into a corresponding Python data structure, most commonly a dictionary or a list.

Params: text model output.
Returns: parsed JSON dict or {} if parsing fails.


- _fallback_analysis
Does:
Builds a safe demo structure when the ai fails OR if no key is set.

Params: course_name, slides_content
Returns: (analysis_dict, questions_list)

- analyze_course_content
Does:
This function gets an api key for OpenAI and a model to use, then importing OpenAI incase the user does not have it installed on their local device it then uses the api key to run ChatGPT on the users device sending a system message in ChatGPTs prompt system producing a JSON schema which is able to be extracted with extract_JSON, then using data.get to get a list of questions and analysis.

Quirks:
os.getenv --> os.getenv() is a function that retrieves the value of an environment variable from the operating system's environment. It's a safer way to get these variables because if the variable doesn't exist, it returns None. In this case being if the user does not have OpenAI installed.

from openai import OpenAI --> Defer import so project runs even if openai isn't installed yet

client.chat.completions.create is a method used in various AI SDKs and APIs, particularly those related to large language models (LLMs) and conversational AI, to generate a chat completion or response from a model. --> The primary purpose of client.chat.completions.create is to facilitate the generation of human-like text in a conversational format.

Params: course_name, slides_content
Returns: (analysis_dict, questions_list)

auth.py
- hash_password
Does:
hashes a password with bcrypt.

Quirks:
Password.encode() --> converts a user's password into an unreadable format (using hashing)

bcrypt.gensalt()  --> a function used in the bcrypt password hashing library to generate a unique salt. A salt is a random string of data that is added to a password before it is hashed. 

Params: password plain string.
Returns: bcrypt hash as string.

- verify_password
Does:
checks a plain password against a stored hash.

Quirks:
bcrypt.checkpw --> a function within the bcrypt library used to verify if a given plaintext password matches a previously hashed password.

Params: plain_password, hashed_password.
Returns: True if match, else False.

- create_access_token

Does:
Makes a short “access pass” string called a JWT. It puts an expiry time inside the pass so it stops working after a while, then seals it with a secret so no one can change it.

Quirks:
datetime.utcnow() --> method returns the current date and time in Coordinated Universal Time (UTC) as a naive datetime object. 
**FLAW: A naive datetime object lacks timezone information.**

jwt.encode --> a function, commonly found in libraries that implement JSON Web Token (JWT) functionality, that creates a signed and serialized JWT string from a given payload (This is typically a JSON object containing the information you want to transmit securely) and a secret key.

Params: data payload claims, expires_delta optional custom lifetime.
Returns: JWT string.

- decode_access_token

Does:
Verifies and decodes a JWT.

Params: token JWT string.
Returns: payload dict if valid, else None.

- generate_verification_token
Does:
Generates a secure random token for email verification

Quirks:
secrets.token_urlsafe() --> generates a secure, random, URL-safe text string. This string is suitable for use in URLs, such as for password reset tokens, activation links, or session tokens, because it consists of characters that are safe to include in URLs without requiring additional encoding.

Params: none.
Returns: token string.

email.py
- send_verification_email
Does: creates a random URL safe token for email verification.

Quirks:
conf.MAIL_USERNAME --> sets the username (email address) of the mail account used by an application to send emails, allowing the mail server to authenticate the sender.

await fm.send_message(message) --> connects to that SMTP (Simple Mail Transfer Protocol to send and receive emails) server, logs in, turns your MessageSchema into a real email (From, To, Subject, HTML or plain text body, plus any attachments), sends it, then closes the connection. If the server accepts it, the mail is on its way to the recipient. The function itself usually returns None.

Params: email, token, user_name.
Returns: None but sends the email as a side effect.

database.py
- get_db
Does:
A FastAPI helper that hands your route a temporary database connection for the request, then closes it when the request is done.

Quirks:
SessionLocal() --> is typically a callable object that, when invoked, returns a new, independent SQLAlchemy database session.

yield db --> When a function containing yield db is called, it first sets up a database connection or session

Params: none.
Returns: a yielded Session during request handling.

main.py
- health

Does: Assume states the programs health, however is currently just a stub

Params: none.
Returns: {"ok": True}.

- gate_request
Does: Gives the app a sample quiz question and the rules for a lock screen that controls access.

Params: target required, platform optional.
Returns: dict with attempt_id, question, policy

- gate_answer
Does: validates payload, compares answer_index against a hardcoded correct index, and returns result.

Quirks:
issubset --> returns True if all items in the set exists in the specified set

payload.get -->  It allows users to access and retrieve specific pieces of content or data

Params: payload expects keys attempt_id, question_id, answer_index, seconds optional.
Returns: dict with correct bool, allow_ms int, explanation str, progress dict.

migrations.py
- run_startup_migrations
Does: on startup, checks for users.degree column and drops it if present, logs warnings if it cannot.

Quirks:
inspector.get_table_names --> get a list of all the table names in the database

engine.begin --> is a method used to manage database transactions in a "begin once" style. It's designed to simplify transaction handling by providing a context manager that automatically commits or rolls back changes.

conn.execute() --> is a fundamental function in database programming that allows you to send and execute SQL statements or commands directly against a connected database.

Params: engine SQLAlchemy Engine.
Returns: None.


# How all these functions relate to eachother:

Project
│
├─ ai.py
│  ├─ _extract_json → used by analyze_course_content
│  ├─ _fallback_analysis → used by analyze_course_content and on no API key
│  └─ analyze_course_content → calls OpenAI, then _extract_json, falls back to _fallback_analysis
│
├─ auth.py
│  ├─ hash_password
│  ├─ verify_password
│  ├─ create_access_token
│  ├─ decode_access_token
│  └─ generate_verification_token → feeds token to email.send_verification_email
│
├─ email.py
│  └─ send_verification_email → sends link with token to user
│
├─ database.py
│  ├─ engine
│  ├─ SessionLocal
│  ├─ Base
│  └─ get_db
│
├─ migrations.py
│  └─ run_startup_migrations(engine) → drops users.degree if present
│
└─ main.py
   ├─ health
   ├─ gate_request
   ├─ gate_answer
   └─ App setup → Base.metadata.create_all(engine), run_startup_migrations(engine), include routers, add CORS
      ↳ depends on database.Base and database.engine

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
