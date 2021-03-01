using System;
using System.Collections.Generic;
using System.Text;

namespace VLANSimulator
{
    public class UserScore
    {

        public long Score = 0;
        public long correctAnswers = 0;
        public long wrongAnswers = 0;

        public void CorrectAnswer()
        {
            Score += 50;
            correctAnswers++;
        }

        public void WrongAnswer()
        {
            Score -= 25;
            if (Score < 0) Score = 0;
            wrongAnswers++;
        }

        public override string ToString()
        {
            if (correctAnswers + wrongAnswers == 0) return "";
            return String.Format("{0} points ({1}/{2}, {3}% correct)", Score.ToString("#,##0"), correctAnswers, wrongAnswers, 
                ((correctAnswers/(correctAnswers+wrongAnswers))* 100).ToString("0.##")
                );
        }
    }
}
