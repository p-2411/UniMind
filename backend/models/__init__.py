from sqlalchemy.orm import declarative_base
Base = declarative_base()

# Import models so metadata sees all tables (order doesn’t matter; FKs resolve by name)
from .user import User          
from .course import Course            
from .enrolment import Enrolment    
from .topic import Topic             
from .subtopic import Subtopic     
from .content import Content          
from .question import Question     
from .attempt import QuestionAttempt 
from .progress import TopicProgress  
from .assessment import Assessment   
from .streak import DailyStreak   
from .question_metric import QuestionMetric
