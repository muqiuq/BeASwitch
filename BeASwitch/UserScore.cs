using System;
using System.Collections.Generic;
using System.Text;

namespace BeASwitch
{
    public class UserScore
    {

        public int Score = 0;
        public int CorrectAnswers = 0;
        public int WrongAnswers = 0;

        public int TotalAnswers { get
            {
                return CorrectAnswers + WrongAnswers;
            } 
        }

        public void AddCorrectAnswer()
        {
            Score += 50;
            CorrectAnswers++;
        }

        public void AddWrongAnswer()
        {
            Score -= 25;
            if (Score < 0) Score = 0;
            WrongAnswers++;
        }

        public override string ToString()
        {
            if (CorrectAnswers + WrongAnswers == 0) return "";
            return String.Format("{0} points ({1}/{2}, {3}% correct)", Score.ToString("#,##0"), CorrectAnswers, CorrectAnswers + WrongAnswers, 
                (((decimal)CorrectAnswers/(CorrectAnswers+WrongAnswers))* 100).ToString("0.##")
                );
        }

        internal void Reset()
        {
            Score = 0;
            CorrectAnswers = 0;
            WrongAnswers = 0;
        }
    }
}
