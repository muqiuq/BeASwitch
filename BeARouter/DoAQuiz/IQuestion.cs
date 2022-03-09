using System;
using System.Collections.Generic;
using System.Text;

namespace BeARouter.DoAQuiz
{
    public interface IQuestion
    {

        public string Name { get; }

        public string Question { get; }
        public string Response { get; }

        public string ResponseHint { get; }

        public bool Evaluate(String response);

    }
}
