using System;
using System.Collections.Generic;
using System.Text;

namespace BeARouter.DoAQuiz
{
    [System.AttributeUsage(System.AttributeTargets.Class)]
    public class FrequencyAttribute : System.Attribute
    {

        public int Frequency;

        public FrequencyAttribute(int frequency)
        {
            Frequency = frequency;
        }
    }
}
