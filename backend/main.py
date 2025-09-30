from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.get('/health')
def health():
    return {"ok":True}

@app.get("/gate/request")
def gate_request(target, platform = "desktop"):

    if not target:
        raise HTTPException(status_code=400, detail="Missing 'target'")
    
    demo_question = {
        "id" : "q_demo_001",
        "type" : "mcq", 
        "topic" : "Golfers",
        "text" : "Who is a better golfer out of these 4",
        "choices" : [
            "Tiger Woods"
            "Jack Niclaus"
            "Scottie Scheffler"
            "Arnav Gupta"
        ],
        "difficulty": "easy"
    }

    attempt_id = "att_demo_abc123"

    policy = {
        "allow_ms_on_correct": 10 * 60 * 1000,
        "max_retries" : 2,
        "lockout_seconds_on_fail" : 5
    }

    return {
        "attempt_id" : attempt_id,
        "question" : demo_question,
        "policy": policy,
    }


@app.post("/gate/answer")                                                                      # 58
def gate_answer(payload: dict):  # payload is the JSON body sent by the client                # 59
    """
    Expected JSON:                                                                            # 60
      {                                                                                       # 61
        "attempt_id": "att_demo_abc123",  # id returned by /gate/request                      # 62
        "question_id": "q_demo_001",      # which question was answered                       # 63
        "answer_index": 1,                # which option (0..n-1) the user selected           # 64
        "seconds": 5                      # optional: time taken to answer                     # 65
      }                                                                                       # 66
    """                                                                                       # 67

    required = {"attempt_id", "question_id", "answer_index"}  # fields we require             # 68
    if not isinstance(payload, dict) or not required.issubset(payload.keys()):                # 69
        raise HTTPException(status_code=400,                                                  # 70
                            detail=f"Body must include {sorted(required)}")  # send 400       # 71

    correct_index = 1                 # for the demo, the correct option is index 1           # 72
    user_answer = payload.get("answer_index")  # pull the user’s chosen index from JSON       # 73
    is_correct = (user_answer == correct_index)  # compute correctness (True/False)           # 74

    allow_ms = 10 * 60 * 1000 if is_correct else 0  # grant time if correct else zero         # 75

    explanation = (  # educational feedback for the UI                                        # 76
        "Memoisation caches results of subproblems as recursive calls happen; "               # 77
        "that’s why option 2 is correct."                                                     # 78
    )                                                                                         # 79

    progress = {                         # placeholder “progress” for the UI to display       # 80
        "topic_strength": 0.55 if is_correct else 0.42,  # pretend strength moves on correct  # 81
        "streak": 1 if is_correct else 0                 # pretend streak counter              # 82
    }                                                                                         # 83

    return {                            # send the final result back to the client            # 84
        "correct": is_correct,           # whether the user’s answer was right                # 85
        "allow_ms": allow_ms,            # how long to allow the blocked site                 # 86
        "explanation": explanation,      # short rationale to reinforce learning              # 87
        "progress": progress,            # progress snapshot (will be real once DB exists)    # 88
    }       