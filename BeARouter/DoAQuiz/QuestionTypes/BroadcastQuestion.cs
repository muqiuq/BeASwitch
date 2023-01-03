using System;
using System.Collections.Generic;
using System.Text;

namespace BeARouter.DoAQuiz.QuestionTypes
{
    internal class BroadcastQuestion : IQuestion
    {
        private Subnet ip;
        private IPv4Address broadcast;

        public BroadcastQuestion()
        {
            ip = Helper.GetRandomIPv4Subnet();
            broadcast = ip.GetBroadcastSubnet().GetAddress();
        }

        public string Name => $"Broadcast of {ip.ToString()}";

        public string Question => $"Broadcast address of {ip.ToString()}?";

        public string Response => broadcast.ToString();

        public string ResponseHint => "X.X.X.X";

        public QuestionCategory QuestionCategory => QuestionCategory.IPv4;

        public bool Evaluate(string response)
        {
            return response == broadcast.ToString();
        }
    }
}
