using BeAToolsLibrary;
using System;
using System.Collections.Generic;
using System.Text;

namespace BeARouter.DoAQuiz
{
    public class QuizOptions
    {
        public Goal Goal { get; set; } = new Goal(30, 30);

        public bool IPv4Questions = true;

        public bool IPv6Questions = false;

    }
}
